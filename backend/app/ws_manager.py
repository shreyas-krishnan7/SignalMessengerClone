from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # Ek user ke multiple tabs/devices ho sakte hain, isliye har user ke liye set of sockets
        self.connections: dict[int, set[WebSocket]] = defaultdict(set)

    async def connect(self, user_id: int, websocket: WebSocket) -> bool:
        await websocket.accept()
        was_offline = not self.is_online(user_id)
        self.connections[user_id].add(websocket)
        return was_offline  # true matlab user abhi online aaya hai

    def disconnect(self, user_id: int, websocket: WebSocket) -> bool:
        self.connections[user_id].discard(websocket)
        if not self.connections[user_id]:
            del self.connections[user_id]
            return True  # true matlab user ka last socket bhi band ho gaya -> offline
        return False

    def is_online(self, user_id: int) -> bool:
        return bool(self.connections.get(user_id))

    async def send_to_user(self, user_id: int, event_type: str, data: dict):
        # list() isliye taaki loop ke beech set change ho to error na aaye
        for websocket in list(self.connections.get(user_id, [])):
            try:
                await websocket.send_json({"type": event_type, "data": data})
            except Exception:
                self.disconnect(user_id, websocket)

    async def send_to_users(self, user_ids, event_type: str, data: dict):
        for user_id in set(user_ids):
            await self.send_to_user(user_id, event_type, data)


manager = ConnectionManager()
