from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.issue import Issue
from app.models.department import CommunityVerification, VerificationVote, Notification
from app.schemas.user import UserResponse, LeaderboardEntry
from typing import Optional, List

router = APIRouter(prefix="/users", tags=["Users"])


def calculate_trust_score(user: User) -> float:
    """Calculate citizen trust score 0-100 based on report quality."""
    total = user.reports_submitted
    if total == 0:
        return 75.0  # Default for new users

    verified = user.reports_verified
    # Penalty for rejected reports (would need a field; use verifications as proxy)
    base_score = (verified / total) * 100 if total > 0 else 75.0
    # Bonus for community verifications done
    verification_bonus = min(10, user.verifications_done * 0.5)
    # Points bonus
    points_bonus = min(10, user.points / 100)

    trust = base_score + verification_bonus + points_bonus
    return round(min(100.0, max(0.0, trust)), 1)


@router.get("/me", response_model=UserResponse)
async def get_me(db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    user = await db.get(User, current_user["uid"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    trust = calculate_trust_score(user)
    result = UserResponse.model_validate(user)
    result.trust_score = trust
    return result


@router.get("/me/issues")
async def my_issues(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    from app.schemas.issue import IssueResponse
    import math
    offset = (page - 1) * per_page
    result = await db.execute(
        select(Issue)
        .where(Issue.reporter_id == current_user["uid"])
        .order_by(desc(Issue.created_at))
        .offset(offset)
        .limit(per_page)
    )
    issues = result.scalars().all()
    total = (await db.execute(
        select(func.count(Issue.id)).where(Issue.reporter_id == current_user["uid"])
    )).scalar() or 0
    return {"items": [IssueResponse.model_validate(i) for i in issues], "total": total}


@router.get("/me/notifications")
async def my_notifications(
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    stmt = select(Notification).where(Notification.user_id == current_user["uid"]).order_by(desc(Notification.created_at)).limit(50)
    if unread_only:
        stmt = stmt.where(Notification.is_read == False)
    result = await db.execute(stmt)
    notifs = result.scalars().all()
    return [{"id": n.id, "type": n.type.value, "title": n.title, "message": n.message,
             "is_read": n.is_read, "issue_id": n.issue_id, "created_at": n.created_at} for n in notifs]


@router.post("/me/notifications/read")
async def mark_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Notification).where(Notification.user_id == current_user["uid"], Notification.is_read == False)
    )
    for n in result.scalars().all():
        n.is_read = True
    await db.flush()
    return {"status": "ok"}


@router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def leaderboard(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User)
        .where(User.is_anonymous == False, User.role == "citizen")
        .order_by(desc(User.points))
        .limit(limit)
    )
    users = result.scalars().all()
    return [
        LeaderboardEntry(
            rank=i + 1,
            user_id=u.id,
            full_name=u.full_name,
            avatar_url=u.avatar_url,
            points=u.points,
            badge_tier=u.badge_tier.value,
            reports_submitted=u.reports_submitted,
            trust_score=calculate_trust_score(u),
        )
        for i, u in enumerate(users)
    ]
