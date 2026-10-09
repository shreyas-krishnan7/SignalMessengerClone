import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..database import SessionLocal
from ..events import broadcast_presence, notify_status_updates
from ..models import User, utcnow
from ..security import get_user_by_token
from ..services import advance_receipts, get_member_ids
from ..ws_manager import manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = ""):
    with SessionLocal() as db:
        user = get_user_by_token(db, token)
        user_id = user.id if user else None

    if user_id is None:
        # 4401 code se frontend samajh jayega ki token galat hai aur logout kar dega
        await websocket.accept()
        await websocket.close(code=4401)
        return

    came_online = await manager.connect(user_id, websocket)
    with SessionLocal() as db:
        # User offline tha tab jo messages aaye, wo ab "delivered" ho gaye
        await notify_status_updates(advance_receipts(db, user_id, "delivered"))
        if came_online:
            await broadcast_presence(db, db.get(User, user_id))

    try:
        while True:
            text = await websocket.receive_text()
            await handle_client_event(user_id, text)
    except WebSocketDisconnect:
        pass
    finally:
        went_offline = manager.disconnect(user_id, websocket)
        if went_offline:
            with SessionLocal() as db:
                user = db.get(User, user_id)
                user.last_seen_at = utcnow()  # "last seen" time yahi se aata hai
                db.commit()
                await broadcast_presence(db, user)


async def handle_client_event(user_id: int, text: str):
    try:
        event = json.loads(text)
    except json.JSONDecodeError:
        return

    # Client se abhi sirf typing event aata hai, baaki sab REST API se hota hai
    if event.get("type") == "typing":
        conversation_id = event.get("conversation_id")
        with SessionLocal() as db:
            member_ids = get_member_ids(db, conversation_id)
        if user_id not in member_ids:
            return
        others = [m for m in member_ids if m != user_id]
        data = {"conversation_id": conversation_id, "user_id": user_id, "is_typing": bool(event.get("is_typing"))}
        await manager.send_to_users(others, "typing", data)
