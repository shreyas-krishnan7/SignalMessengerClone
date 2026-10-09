from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..events import broadcast_message, notify_status_updates
from ..models import Message, Reaction, User
from ..schemas import MessageOut, ReactionRequest, SendMessageRequest
from ..security import get_current_user
from ..serializers import message_out
from ..services import advance_receipts, create_message, get_membership, not_expired

router = APIRouter(prefix="/api", tags=["messages"])


def get_message_for_member(db: Session, message_id: int, user_id: int) -> Message:
    message = db.get(Message, message_id)
    if message is None:
        raise HTTPException(404, "Message not found")
    # Sirf us conversation ke members hi message pe kuch kar sakte hain
    get_membership(db, message.conversation_id, user_id)
    return message


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
def list_messages(
    conversation_id: int,
    before_id: int | None = None,
    limit: int = Query(default=50, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_membership(db, conversation_id, user.id)
    # Latest messages pehle nikaalte hain, upar scroll karne pe before_id se purane wale (pagination)
    query = (
        select(Message)
        .options(
            selectinload(Message.receipts),
            selectinload(Message.reactions),
            selectinload(Message.reply_to).selectinload(Message.sender),
        )
        .where(Message.conversation_id == conversation_id, not_expired())
        .order_by(Message.id.desc())
        .limit(limit)
    )
    if before_id is not None:
        query = query.where(Message.id < before_id)

    messages = db.scalars(query).all()
    # Screen pe purana upar aur naya neeche chahiye, isliye reverse
    return [message_out(m) for m in reversed(messages)]


@router.post("/conversations/{conversation_id}/messages", response_model=MessageOut)
async def send_message(
    conversation_id: int,
    payload: SendMessageRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = get_membership(db, conversation_id, user.id)
    body = payload.body.strip()
    if not body and not payload.attachment_url:
        raise HTTPException(400, "Message can't be empty")

    if payload.reply_to_id is not None:
        original = db.get(Message, payload.reply_to_id)
        if original is None or original.conversation_id != conversation_id:
            raise HTTPException(400, "Can't reply to this message")

    message = create_message(
        db,
        membership.conversation,
        user.id,
        body=body,
        type="attachment" if payload.attachment_url else "text",
        reply_to_id=payload.reply_to_id,
        attachment_url=payload.attachment_url,
        attachment_name=payload.attachment_name,
        attachment_type=payload.attachment_type,
    )
    await broadcast_message(db, message, client_id=payload.client_id)
    return message_out(message, payload.client_id)


@router.post("/conversations/{conversation_id}/read")
async def mark_conversation_read(
    conversation_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    get_membership(db, conversation_id, user.id)
    # Chat khuli hai to iske saare messages read, aur senders ko blue ticks bhej do
    updates = advance_receipts(db, user.id, "read", conversation_id)
    await notify_status_updates(updates)
    return {"ok": True}


@router.post("/messages/{message_id}/reactions", response_model=MessageOut)
async def toggle_reaction(
    message_id: int, payload: ReactionRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    message = get_message_for_member(db, message_id, user.id)
    if message.is_deleted or message.type == "system":
        raise HTTPException(400, "Can't react to this message")

    existing = db.scalar(select(Reaction).where(Reaction.message_id == message_id, Reaction.user_id == user.id))
    if existing and existing.emoji == payload.emoji:
        db.delete(existing)  # Same emoji dobara dabaya = reaction hata do
    elif existing:
        existing.emoji = payload.emoji  # Alag emoji = reaction badal do
    else:
        db.add(Reaction(message_id=message_id, user_id=user.id, emoji=payload.emoji))
    db.commit()

    await broadcast_message(db, message, "message.updated")
    return message_out(message)


@router.delete("/messages/{message_id}", response_model=MessageOut)
async def delete_message_for_everyone(
    message_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    message = get_message_for_member(db, message_id, user.id)
    if message.sender_id != user.id:
        raise HTTPException(403, "You can only delete your own messages")

    # Row delete nahi karte, bas content hata dete hain -> "This message was deleted" dikhega
    message.is_deleted = True
    message.body = ""
    message.attachment_url = None
    message.attachment_name = None
    message.attachment_type = None
    message.reactions.clear()
    db.commit()

    await broadcast_message(db, message, "message.updated")
    return message_out(message)
