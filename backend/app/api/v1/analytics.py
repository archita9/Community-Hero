from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.issue import Issue, IssueStatus
from app.ai.predictor import generate_predictive_insights
from app.ai.classifier import generate_ai_insights
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview")
async def analytics_overview(db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    total = (await db.execute(select(func.count(Issue.id)))).scalar() or 0
    resolved = (await db.execute(select(func.count(Issue.id)).where(Issue.status.in_(["resolved", "closed"])))).scalar() or 0
    pending = (await db.execute(select(func.count(Issue.id)).where(Issue.status.notin_(["resolved", "closed", "rejected"])))).scalar() or 0
    critical = (await db.execute(select(func.count(Issue.id)).where(Issue.severity == "critical"))).scalar() or 0

    # Category breakdown
    cat_result = await db.execute(
        select(Issue.category, func.count(Issue.id)).group_by(Issue.category)
    )
    by_category = [{"category": r[0], "count": r[1]} for r in cat_result.all()]

    # Severity breakdown
    sev_result = await db.execute(
        select(Issue.severity, func.count(Issue.id)).group_by(Issue.severity)
    )
    by_severity = [{"severity": r[0], "count": r[1]} for r in sev_result.all()]

    # Status breakdown
    status_result = await db.execute(
        select(Issue.status, func.count(Issue.id)).group_by(Issue.status)
    )
    by_status = [{"status": r[0], "count": r[1]} for r in status_result.all()]

    # Avg resolution time
    resolved_issues = await db.execute(
        select(Issue.created_at, Issue.resolved_at).where(Issue.resolved_at.isnot(None))
    )
    res_times = []
    for r in resolved_issues.all():
        if r[1] and r[0]:
            diff = (r[1] - r[0]).total_seconds() / 3600
            res_times.append(diff)
    avg_resolution_hours = round(sum(res_times) / len(res_times), 1) if res_times else 0

    return {
        "total": total, "resolved": resolved, "pending": pending, "critical": critical,
        "resolution_rate": round(resolved / total * 100, 1) if total else 0,
        "avg_resolution_hours": avg_resolution_hours,
        "by_category": by_category,
        "by_severity": by_severity,
        "by_status": by_status,
    }


@router.get("/trends")
async def trends(
    days: int = Query(30, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(
            func.date(Issue.created_at).label("date"),
            func.count(Issue.id).label("count")
        )
        .where(Issue.created_at >= since)
        .group_by(func.date(Issue.created_at))
        .order_by(func.date(Issue.created_at))
    )
    return [{"date": str(r[0]), "count": r[1]} for r in result.all()]


@router.get("/heatmap")
async def heatmap_data(db: AsyncSession = Depends(get_db)):
    """Return lat/lon points for Google Maps heatmap (no auth required)."""
    result = await db.execute(
        select(Issue.latitude, Issue.longitude, Issue.priority_score, Issue.severity)
        .where(Issue.status.notin_(["closed", "rejected"]))
        .limit(1000)
    )
    points = []
    for r in result.all():
        weight = {"critical": 4, "high": 3, "medium": 2, "low": 1}.get(r[3], 1)
        points.append({"lat": r[0], "lng": r[1], "weight": weight})
    return {"points": points}


@router.get("/ward-stats")
async def ward_stats(db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    result = await db.execute(
        select(Issue.ward, func.count(Issue.id).label("total"),
               func.sum(func.cast(Issue.status.in_(["resolved", "closed"]), func.Integer)).label("resolved"))
        .where(Issue.ward.isnot(None))
        .group_by(Issue.ward)
        .order_by(desc(func.count(Issue.id)))
        .limit(20)
    )
    return [{"ward": r[0], "total": r[1], "resolved": r[2] or 0} for r in result.all()]


@router.get("/ai-insights")
async def ai_insights(db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    result = await db.execute(
        select(Issue.category, Issue.severity, Issue.ward, Issue.created_at, Issue.status)
        .order_by(desc(Issue.created_at)).limit(100)
    )
    issues_data = [
        {"category": r[0], "severity": r[1], "ward": r[2],
         "created_at": str(r[3]), "status": r[4]}
        for r in result.all()
    ]
    insights = await generate_ai_insights(issues_data)
    predictions = await generate_predictive_insights(issues_data)
    return {"insights": insights, "predictions": predictions}
