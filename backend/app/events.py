from sqlalchemy.orm import Session

from .models import Message, User
from .serializers import message_out, user_out
from .services import get_member_ids, get_related_user_ids
from .ws_manager import manager


async def broadcast_message(db: Session, message: Message, event_type: str = "message.new", client_id: str | None = None):
    # Conversation ke sab members (sender ke dusre tabs bhi) ko message bhejo
    data = message_out(message, client_id).model_dump(mode="json")
    await manager.send_to_users(get_member_ids(db, message.conversation_id), event_type, data)


async def notify_status_updates(updates: dict[int, list[dict]]):
    # Sender ko batao ki uske messages delivered/read ho gaye (ticks update karne ke liye)
    for sender_id, items in updates.items():
        await manager.send_to_user(sender_id, "message.status", {"updates": items})


async def notify_conversation_updated(db: Session, conversation_id: int):
    # Sab members ko batao; frontend ye event milne pe conversation dobara fetch kar leta hai
    member_ids = get_member_ids(db, conversation_id)
    await manager.send_to_users(member_ids, "conversation.updated", {"conversation_id": conversation_id})


async def notify_conversation_removed(user_id: int, conversation_id: int):
    await manager.send_to_user(user_id, "conversation.removed", {"conversation_id": conversation_id})


async def notify_user_updated(db: Session, user: User):
    # Naam/photo badla to jin logon ke saath chat hai unki screen pe bhi update ho jaye
    data = user_out(user).model_dump(mode="json")
    await manager.send_to_users(get_related_user_ids(db, user.id), "user.updated", data)


async def broadcast_presence(db: Session, user: User):
    data = {
        "user_id": user.id,
        "is_online": manager.is_online(user.id),
        "last_seen_at": user.last_seen_at.isoformat() + "+00:00",
    }
    await manager.send_to_users(get_related_user_ids(db, user.id), "presence", data)
