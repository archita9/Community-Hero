from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.core.security import get_current_user
from app.services.notifications import register_ws, unregister_ws
import json

router = APIRouter(prefix="/ws", tags=["WebSocket"])


@router.websocket("/notifications/{user_id}")
async def websocket_notifications(websocket: WebSocket, user_id: str):
    await websocket.accept()
    register_ws(user_id, websocket)
    try:
        while True:
            # Keep connection alive, handle ping/pong
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        unregister_ws(user_id, websocket)
