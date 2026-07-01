"""
Notification service: create DB notifications and broadcast via WebSocket.
"""
import json
import asyncio
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.department import Notification, NotificationType
from app.core.database import AsyncSessionLocal

# In-memory WebSocket connections: {user_id: [websocket, ...]}
_connections: dict = {}


def register_ws(user_id: str, websocket):
    if user_id not in _connections:
        _connections[user_id] = []
    _connections[user_id].append(websocket)


def unregister_ws(user_id: str, websocket):
    if user_id in _connections:
        try:
            _connections[user_id].remove(websocket)
        except ValueError:
            pass


async def send_ws_message(user_id: str, message: dict):
    """Send WebSocket message to a specific user."""
    sockets = _connections.get(user_id, [])
    dead = []
    for ws in sockets:
        try:
            await ws.send_text(json.dumps(message))
        except Exception:
            dead.append(ws)
    for d in dead:
        try:
            _connections[user_id].remove(d)
        except ValueError:
            pass


async def create_notification(
    db: AsyncSession,
    user_id: str,
    notif_type: NotificationType,
    title: str,
    message: str,
    issue_id: Optional[str] = None,
    data: Optional[dict] = None,
    broadcast_ws: bool = True,
) -> Notification:
    """Create a notification record and optionally push via WebSocket."""
    notification = Notification(
        user_id=user_id,
        issue_id=issue_id,
        type=notif_type,
        title=title,
        message=message,
        data=data or {},
    )
    db.add(notification)
    await db.flush()

    if broadcast_ws:
        payload = {
            "type": "notification",
            "id": notification.id,
            "notif_type": notif_type.value,
            "title": title,
            "message": message,
            "issue_id": issue_id,
            "data": data or {},
        }
        asyncio.create_task(send_ws_message(user_id, payload))

    return notification


async def notify_issue_status_change(
    db: AsyncSession,
    issue,
    new_status: str,
    reporter_id: Optional[str] = None,
):
    """Send status change notification to reporter."""
    if not reporter_id:
        return

    status_messages = {
        "ai_verified": ("✅ Issue AI Verified", "Your report has been verified by our AI system and is being reviewed."),
        "community_verified": ("👥 Community Verified", "Your report has been verified by the community."),
        "assigned": ("📋 Issue Assigned", f"Your issue has been assigned to the responsible department."),
        "in_progress": ("🔧 Work In Progress", "The department has started working on your reported issue."),
        "resolved": ("✅ Issue Resolved", "Great news! Your reported issue has been resolved."),
        "closed": ("🔒 Issue Closed", "Your reported issue has been closed."),
        "flagged": ("⚠️ Flagged for Review", "The resolution of your issue has been flagged for further review."),
    }

    if new_status in status_messages:
        title, message = status_messages[new_status]
        await create_notification(
            db=db,
            user_id=reporter_id,
            notif_type=NotificationType.status_changed,
            title=title,
            message=message,
            issue_id=issue.id,
            data={"new_status": new_status, "issue_number": issue.issue_number},
        )


async def award_points(
    db: AsyncSession,
    user,
    points: int,
    reason: str,
):
    """Award gamification points to user."""
    user.points += points
    user.update_badge()

    await create_notification(
        db=db,
        user_id=user.id,
        notif_type=NotificationType.reward_earned,
        title=f"🏆 +{points} Points Earned!",
        message=reason,
        data={"points_awarded": points, "total_points": user.points, "badge": user.badge_tier.value},
    )
