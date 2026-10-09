import asyncio

from sqlalchemy import select

from .database import SessionLocal
from .models import Message, utcnow
from .services import get_member_ids
from .ws_manager import manager


async def delete_expired_messages():
    with SessionLocal() as db:
        expired = db.scalars(select(Message).where(Message.expires_at <= utcnow())).all()
        # Delete karne se pehle note kar lo kisko batana hai
        deleted = [(m.id, m.conversation_id, get_member_ids(db, m.conversation_id)) for m in expired]
        for message in expired:
            db.delete(message)
        db.commit()

    for message_id, conversation_id, member_ids in deleted:
        data = {"message_id": message_id, "conversation_id": conversation_id}
        await manager.send_to_users(member_ids, "message.deleted", data)


async def run_cleanup_loop():
    # Har 5 second mein expire ho chuke disappearing messages DB se hata do
    while True:
        await asyncio.sleep(5)
        try:
            await delete_expired_messages()
        except Exception as error:
            print("Disappearing message cleanup failed:", error)
