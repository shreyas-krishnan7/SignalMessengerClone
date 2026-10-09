from collections import defaultdict
from datetime import timedelta

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from .models import Conversation, ConversationMember, Message, MessageReceipt, utcnow
from .ws_manager import manager

# Signal ke avatar color codes (frontend inko actual colors mein map karta hai)
AVATAR_COLORS = ["A100", "A110", "A120", "A130", "A140", "A150", "A160", "A170", "A180", "A190", "A200", "A210"]

STATUS_ORDER = {"sent": 0, "delivered": 1, "read": 2}


def not_expired():
    # Disappearing messages jinka time nikal gaya, unko query se bahar rakhne ke liye filter
    return or_(Message.expires_at.is_(None), Message.expires_at > utcnow())


def get_membership(db: Session, conversation_id: int, user_id: int) -> ConversationMember:
    membership = db.scalar(
        select(ConversationMember).where(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user_id,
        )
    )
    # Member nahi ho to 404, taaki dusron ki chats ka pata bhi na chale
    if membership is None:
        raise HTTPException(404, "Conversation not found")
    return membership


def require_admin(membership: ConversationMember):
    if membership.role != "admin":
        raise HTTPException(403, "Only group admins can do this")


def require_group(conversation: Conversation):
    if conversation.type != "group":
        raise HTTPException(400, "This action is only for groups")


def format_duration(seconds: int) -> str:
    # 3600 -> "1 hour", 604800 -> "1 week" (disappearing timer ke system message ke liye)
    units = [(604800, "week"), (86400, "day"), (3600, "hour"), (60, "minute"), (1, "second")]
    for unit_seconds, unit_name in units:
        if seconds % unit_seconds == 0:
            count = seconds // unit_seconds
            return f"{count} {unit_name}" + ("s" if count > 1 else "")
    return f"{seconds} seconds"


def get_member_ids(db: Session, conversation_id: int) -> list[int]:
    return list(
        db.scalars(select(ConversationMember.user_id).where(ConversationMember.conversation_id == conversation_id))
    )


def get_related_user_ids(db: Session, user_id: int) -> set[int]:
    # Wo sab log jo mere saath kisi bhi conversation mein hain (online status unhi ko bhejna hai)
    my_conversations = select(ConversationMember.conversation_id).where(ConversationMember.user_id == user_id)
    user_ids = db.scalars(
        select(ConversationMember.user_id).where(ConversationMember.conversation_id.in_(my_conversations))
    )
    return set(user_ids) - {user_id}


def find_direct_conversation(db: Session, user_a: int, user_b: int) -> Conversation | None:
    a_conversations = select(ConversationMember.conversation_id).where(ConversationMember.user_id == user_a)
    return db.scalar(
        select(Conversation)
        .join(ConversationMember)
        .where(
            Conversation.type == "direct",
            Conversation.id.in_(a_conversations),
            ConversationMember.user_id == user_b,
        )
    )


def get_last_message(db: Session, conversation_id: int) -> Message | None:
    return db.scalar(
        select(Message)
        .where(Message.conversation_id == conversation_id, not_expired())
        .order_by(Message.id.desc())
        .limit(1)
    )


def get_unread_count(db: Session, conversation_id: int, user_id: int) -> int:
    # Mere receipts jo abhi "read" nahi hue = unread messages
    return db.scalar(
        select(func.count(MessageReceipt.id))
        .join(Message)
        .where(
            Message.conversation_id == conversation_id,
            MessageReceipt.user_id == user_id,
            MessageReceipt.status != "read",
            not_expired(),
        )
    )


def get_message_status(message: Message) -> str:
    # Sab receivers mein jo sabse peeche hai wahi status (group mein sab padh lein tabhi "read")
    if not message.receipts:
        return "sent"
    return min((receipt.status for receipt in message.receipts), key=lambda s: STATUS_ORDER[s])


def create_message(
    db: Session,
    conversation: Conversation,
    sender_id: int,
    body: str = "",
    type: str = "text",
    reply_to_id: int | None = None,
    attachment_url: str | None = None,
    attachment_name: str | None = None,
    attachment_type: str | None = None,
) -> Message:
    now = utcnow()
    message = Message(
        conversation_id=conversation.id,
        sender_id=sender_id,
        type=type,
        body=body,
        reply_to_id=reply_to_id,
        attachment_url=attachment_url,
        attachment_name=attachment_name,
        attachment_type=attachment_type,
        created_at=now,
    )
    if conversation.disappearing_seconds and type != "system":
        message.expires_at = now + timedelta(seconds=conversation.disappearing_seconds)

    # System messages ("X added Y") ke receipts nahi bante, isliye wo unread mein count nahi hote
    if type != "system":
        for member_id in get_member_ids(db, conversation.id):
            if member_id == sender_id:
                continue
            # Receiver abhi online hai to message turant delivered maan lete hain
            status = "delivered" if manager.is_online(member_id) else "sent"
            message.receipts.append(MessageReceipt(user_id=member_id, status=status))

    conversation.last_message_at = now
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def create_system_message(db: Session, conversation: Conversation, actor_id: int, text: str) -> Message:
    return create_message(db, conversation, actor_id, body=text, type="system")


def advance_receipts(
    db: Session, user_id: int, new_status: str, conversation_id: int | None = None
) -> dict[int, list[dict]]:
    # Is user ke pending receipts aage badhao: sent -> delivered, ya sent/delivered -> read
    lower_statuses = [s for s, order in STATUS_ORDER.items() if order < STATUS_ORDER[new_status]]
    query = (
        select(MessageReceipt)
        .join(Message)
        .where(MessageReceipt.user_id == user_id, MessageReceipt.status.in_(lower_statuses))
    )
    if conversation_id is not None:
        query = query.where(Message.conversation_id == conversation_id)

    receipts = db.scalars(query).all()
    for receipt in receipts:
        receipt.status = new_status
        receipt.updated_at = utcnow()
    db.commit()

    # Har sender ko batana hai ki uske kaunse messages ka status badla: {sender_id: [updates]}
    updates = defaultdict(list)
    for message in {receipt.message for receipt in receipts}:
        updates[message.sender_id].append(
            {
                "message_id": message.id,
                "conversation_id": message.conversation_id,
                "status": get_message_status(message),
            }
        )
    return updates
