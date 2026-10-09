import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..events import broadcast_message, notify_conversation_removed, notify_conversation_updated
from ..models import Conversation, ConversationMember, User
from ..schemas import (
    AddMembersRequest,
    ConversationOut,
    CreateDirectRequest,
    CreateGroupRequest,
    UpdateConversationRequest,
    UpdateMemberRequest,
)
from ..security import get_current_user
from ..serializers import conversation_out
from ..services import (
    AVATAR_COLORS,
    create_system_message,
    find_direct_conversation,
    format_duration,
    get_member_ids,
    get_membership,
    require_admin,
    require_group,
)

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


def load_conversation(db: Session, conversation_id: int) -> Conversation:
    # Members aur unke users ek saath load kar lete hain taaki baar baar query na chale
    return db.scalar(
        select(Conversation)
        .options(selectinload(Conversation.members).selectinload(ConversationMember.user))
        .where(Conversation.id == conversation_id)
    )


@router.get("", response_model=list[ConversationOut])
def list_conversations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conversations = db.scalars(
        select(Conversation)
        .join(ConversationMember)
        .where(ConversationMember.user_id == user.id)
        .options(selectinload(Conversation.members).selectinload(ConversationMember.user))
        .order_by(Conversation.last_message_at.desc())
    )
    result = [conversation_out(db, c, user.id) for c in conversations]
    # Khaali 1:1 chats list mein nahi dikhate (Signal bhi pehla message aane pe hi dikhata hai)
    return [c for c in result if c.type == "group" or c.last_message is not None]


@router.get("/{conversation_id}", response_model=ConversationOut)
def get_conversation(conversation_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    get_membership(db, conversation_id, user.id)
    return conversation_out(db, load_conversation(db, conversation_id), user.id)


@router.post("/direct", response_model=ConversationOut)
def open_direct_conversation(
    payload: CreateDirectRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    other = db.get(User, payload.user_id)
    if other is None or other.id == user.id:
        raise HTTPException(400, "Invalid user")

    # Pehle se chat hai to wahi kholo, warna nayi banao
    conversation = find_direct_conversation(db, user.id, other.id)
    if conversation is None:
        conversation = Conversation(type="direct")
        conversation.members = [ConversationMember(user_id=user.id), ConversationMember(user_id=other.id)]
        db.add(conversation)
        db.commit()

    return conversation_out(db, load_conversation(db, conversation.id), user.id)


@router.post("/group", response_model=ConversationOut)
async def create_group(payload: CreateGroupRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    member_ids = set(payload.member_ids) - {user.id}
    members = db.scalars(select(User).where(User.id.in_(member_ids))).all()
    if not members or len(members) != len(member_ids):
        raise HTTPException(400, "Some selected members don't exist")

    conversation = Conversation(
        type="group",
        name=payload.name.strip(),
        description=payload.description.strip(),
        avatar_color=random.choice(AVATAR_COLORS),
        avatar_url=payload.avatar_url,
        created_by_id=user.id,
    )
    # Group banane wala automatically admin hota hai
    conversation.members.append(ConversationMember(user_id=user.id, role="admin"))
    for member in members:
        conversation.members.append(ConversationMember(user_id=member.id, role="member"))
    db.add(conversation)
    db.commit()

    create_system_message(db, conversation, user.id, f"{user.display_name} created the group.")
    await notify_conversation_updated(get_member_ids(db, conversation.id), conversation.id)
    return conversation_out(db, load_conversation(db, conversation.id), user.id)


@router.patch("/{conversation_id}", response_model=ConversationOut)
async def update_conversation(
    conversation_id: int,
    payload: UpdateConversationRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = get_membership(db, conversation_id, user.id)
    conversation = membership.conversation
    changes = payload.model_dump(exclude_unset=True)
    system_texts = []

    # Group ka naam/description/photo sirf admin badal sakta hai
    group_fields = {"name", "description", "avatar_url"} & changes.keys()
    if group_fields:
        require_group(conversation)
        require_admin(membership)
        if "name" in changes and changes["name"].strip() != conversation.name:
            conversation.name = changes["name"].strip()
            system_texts.append(f'{user.display_name} changed the group name to "{conversation.name}".')
        if "description" in changes:
            conversation.description = changes["description"].strip()
        if "avatar_url" in changes:
            conversation.avatar_url = changes["avatar_url"]

    seconds = changes.get("disappearing_seconds")
    if seconds is not None and seconds != conversation.disappearing_seconds:
        conversation.disappearing_seconds = seconds
        if seconds:
            system_texts.append(f"{user.display_name} set the disappearing message timer to {format_duration(seconds)}.")
        else:
            system_texts.append(f"{user.display_name} disabled disappearing messages.")

    db.commit()
    for text in system_texts:
        await broadcast_message(db, create_system_message(db, conversation, user.id, text))
    await notify_conversation_updated(get_member_ids(db, conversation_id), conversation_id)
    return conversation_out(db, load_conversation(db, conversation_id), user.id)


@router.post("/{conversation_id}/members", response_model=ConversationOut)
async def add_members(
    conversation_id: int,
    payload: AddMembersRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = get_membership(db, conversation_id, user.id)
    conversation = membership.conversation
    require_group(conversation)
    require_admin(membership)

    # Jo pehle se member hain unko dobara add nahi karte
    new_ids = set(payload.user_ids) - set(get_member_ids(db, conversation_id))
    new_users = db.scalars(select(User).where(User.id.in_(new_ids))).all()
    if not new_users:
        raise HTTPException(400, "No new members to add")

    for new_user in new_users:
        conversation.members.append(ConversationMember(user_id=new_user.id, role="member"))
    db.commit()

    names = ", ".join(u.display_name for u in new_users)
    await broadcast_message(db, create_system_message(db, conversation, user.id, f"{user.display_name} added {names}."))
    await notify_conversation_updated(get_member_ids(db, conversation_id), conversation_id)
    return conversation_out(db, load_conversation(db, conversation_id), user.id)


@router.delete("/{conversation_id}/members/{user_id}")
async def remove_member(
    conversation_id: int, user_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    membership = get_membership(db, conversation_id, user.id)
    conversation = membership.conversation
    require_group(conversation)

    target = get_membership(db, conversation_id, user_id)
    leaving = user_id == user.id
    # Khud group chhodna sabko allowed hai, kisi aur ko nikalna sirf admin ka kaam
    if not leaving:
        require_admin(membership)
    text = f"{user.display_name} left the group." if leaving else f"{user.display_name} removed {target.user.display_name}."

    db.delete(target)
    db.commit()

    # Agar koi admin nahi bacha to sabse purane member ko admin bana do
    remaining = db.scalars(
        select(ConversationMember)
        .where(ConversationMember.conversation_id == conversation_id)
        .order_by(ConversationMember.joined_at)
    ).all()
    if remaining and not any(m.role == "admin" for m in remaining):
        remaining[0].role = "admin"
        db.commit()

    await broadcast_message(db, create_system_message(db, conversation, user.id, text))
    await notify_conversation_updated(get_member_ids(db, conversation_id), conversation_id)
    await notify_conversation_removed(user_id, conversation_id)
    return {"ok": True}


@router.patch("/{conversation_id}/members/{user_id}", response_model=ConversationOut)
async def update_member_role(
    conversation_id: int,
    user_id: int,
    payload: UpdateMemberRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = get_membership(db, conversation_id, user.id)
    require_group(membership.conversation)
    require_admin(membership)

    target = get_membership(db, conversation_id, user_id)
    target.role = payload.role
    db.commit()

    await notify_conversation_updated(get_member_ids(db, conversation_id), conversation_id)
    return conversation_out(db, load_conversation(db, conversation_id), user.id)
