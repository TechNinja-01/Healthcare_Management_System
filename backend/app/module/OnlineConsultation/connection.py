"""
In-memory room manager for the 1-on-1 signaling WebSocket.

The server only brokers small JSON messages (SDP offer/answer, ICE
candidates, chat, presence). Media flows peer-to-peer via WebRTC and
never touches this process.

NOTE: state lives in this process only. It is correct for a single
worker. To scale to multiple workers, back this with Redis pub/sub.
"""

import asyncio

from fastapi import WebSocket


# A single 1-on-1 consultation has at most two participants.
MAX_PARTICIPANTS = 2


class RoomManager:
    def __init__(self) -> None:
        # room_code -> { user_id: WebSocket }
        self._rooms: dict[str, dict[int, WebSocket]] = {}
        self._lock = asyncio.Lock()

    def peer_ids(self, room_code: str) -> list[int]:
        return list(self._rooms.get(room_code, {}).keys())

    def is_empty(self, room_code: str) -> bool:
        return not self._rooms.get(room_code)

    async def can_join(self, room_code: str, user_id: int) -> bool:
        """A user may join if already present or the room has a free seat."""
        async with self._lock:
            room = self._rooms.get(room_code, {})
            if user_id in room:
                return True
            return len(room) < MAX_PARTICIPANTS

    async def connect(
        self,
        room_code: str,
        user_id: int,
        websocket: WebSocket,
    ) -> WebSocket | None:
        """
        Register a socket. Returns any previous socket for the same user
        (e.g. a stale tab) so the caller can close it.
        """
        async with self._lock:
            room = self._rooms.setdefault(room_code, {})
            previous = room.get(user_id)
            room[user_id] = websocket
            return previous

    async def disconnect(self, room_code: str, user_id: int) -> None:
        async with self._lock:
            room = self._rooms.get(room_code)
            if not room:
                return
            room.pop(user_id, None)
            if not room:
                self._rooms.pop(room_code, None)

    async def send_to_peers(
        self,
        room_code: str,
        sender_id: int,
        message: dict,
    ) -> None:
        """Relay a message to every participant except the sender."""
        room = dict(self._rooms.get(room_code, {}))
        for uid, ws in room.items():
            if uid == sender_id:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                # Peer socket is gone; it will be cleaned up on its own
                # disconnect handler.
                pass


# Module-level singleton shared across all WebSocket connections.
room_manager = RoomManager()
