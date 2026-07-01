import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_, or_
from app.core.database import get_db
from app.core.security import get_current_user, get_current_user_optional
from app.models.issue import Issue, IssueStatus, IssueStatusHistory
from app.models.department import CommunityVerification, VerificationVote, NotificationType
from app.models.user import User
from app.schemas.issue import (
    IssueResponse, IssueListResponse, IssueStatusUpdateRequest,
    VerificationRequest, CommentRequest
)
from app.services.issue_service import create_issue, update_issue_status, process_resolution
from app.services.notifications import create_notification, award_points
from app.ai.fake_detector import detect_fake_report
from app.ai.recommendations import generate_recommendations
from app.ai.emergency import detect_emergency
from app.ai.predictor import predict_resolution_time
from app.ai.priority import calculate_priority_score
import math

router = APIRouter(prefix="/issues", tags=["Issues"])


@router.post("/")
async def submit_issue(
    request: Request,
    description: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    address: Optional[str] = Form(None),
    is_anonymous: bool = Form(False),
    images: List[UploadFile] = File(default=[]),
    video: Optional[UploadFile] = File(None),
    voice: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    reporter_id = current_user["uid"] if current_user else None

    # Read file bytes
    image_bytes_list = []
    for img in images[:5]:  # Max 5 images
        content = await img.read()
        image_bytes_list.append(content)

    video_bytes = await video.read() if video else None
    voice_bytes = await voice.read() if voice else None

    # Fake detection on first image
    fake_result = None
    if image_bytes_list:
        fake_result = await detect_fake_report(image_bytes_list[0], description)

    base_url = str(request.base_url).rstrip("/").replace(request.url.path, "")
    base_url = base_url or "http://localhost:3000"

    # Create issue via service (AI pipeline)
    result = await create_issue(
        db=db,
        description=description,
        latitude=latitude,
        longitude=longitude,
        address=address,
        reporter_id=reporter_id,
        is_anonymous=is_anonymous,
        image_bytes_list=image_bytes_list,
        video_bytes=video_bytes,
        voice_bytes=voice_bytes,
        base_url=base_url,
    )

    if result["is_duplicate"]:
        return {"status": "duplicate", **result}

    issue = result["issue"]

    # Emergency detection
    emergency = await detect_emergency(
        description=description,
        image_bytes=image_bytes_list[0] if image_bytes_list else None,
        ai_classification=issue.ai_analysis,
    )

    if emergency.get("is_emergency"):
        issue.status = IssueStatus.reported  # Will be escalated
        issue.priority_score = 100
        if issue.ai_analysis:
            issue.ai_analysis["emergency"] = emergency
        await db.flush()

    # Generate recommendations
    recommendations = await generate_recommendations(
        category=issue.category.value,
        severity=issue.severity.value,
        description=description,
        ai_analysis=issue.ai_analysis,
    )

    # Resolution time prediction
    resolution_prediction = predict_resolution_time(
        category=issue.category.value,
        severity=issue.severity.value,
        priority_score=issue.priority_score,
    )

    return {
        "status": "created",
        "issue": IssueResponse.model_validate(issue),
        "fake_detection": fake_result,
        "emergency": emergency if emergency.get("is_emergency") else None,
        "recommendations": recommendations,
        "resolution_prediction": resolution_prediction,
    }


@router.get("/", response_model=IssueListResponse)
async def list_issues(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    category: Optional[str] = None,
    severity: Optional[str] = None,
    department_id: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    radius_km: Optional[float] = Query(None, le=50),
    search: Optional[str] = None,
    sort_by: str = Query("created_at", pattern="^(created_at|priority_score|community_support_count)$"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Issue).where(Issue.is_duplicate == False)

    if status:
        stmt = stmt.where(Issue.status == status)
    if category:
        stmt = stmt.where(Issue.category == category)
    if severity:
        stmt = stmt.where(Issue.severity == severity)
    if department_id:
        stmt = stmt.where(Issue.department_id == department_id)
    if search:
        stmt = stmt.where(
            or_(Issue.title.ilike(f"%{search}%"), Issue.description.ilike(f"%{search}%"))
        )

    if sort_by == "priority_score":
        stmt = stmt.order_by(desc(Issue.priority_score))
    elif sort_by == "community_support_count":
        stmt = stmt.order_by(desc(Issue.community_support_count))
    else:
        stmt = stmt.order_by(desc(Issue.created_at))

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    # Paginate
    offset = (page - 1) * per_page
    stmt = stmt.offset(offset).limit(per_page)
    result = await db.execute(stmt)
    issues = result.scalars().all()

    # Filter by radius if provided
    if lat is not None and lon is not None and radius_km:
        def dist(i):
            dlat = math.radians(i.latitude - lat)
            dlon = math.radians(i.longitude - lon)
            a = math.sin(dlat/2)**2 + math.cos(math.radians(lat)) * math.cos(math.radians(i.latitude)) * math.sin(dlon/2)**2
            return 6371 * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        issues = [i for i in issues if dist(i) <= radius_km]

    return IssueListResponse(
        items=[IssueResponse.model_validate(i) for i in issues],
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total > 0 else 0,
    )


@router.get("/{issue_id}")
async def get_issue(
    issue_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    issue = await db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    issue.view_count += 1
    await db.flush()

    # Get verification stats
    confirms = sum(1 for v in issue.verifications if v.vote == VerificationVote.confirm)
    rejects = sum(1 for v in issue.verifications if v.vote == VerificationVote.reject)

    # Resolution prediction
    resolution = predict_resolution_time(issue.category.value, issue.severity.value, issue.priority_score)

    return {
        "issue": IssueResponse.model_validate(issue),
        "confirmations": confirms,
        "rejections": rejects,
        "resolution_prediction": resolution,
        "status_history": [
            {"status": h.new_status, "notes": h.notes, "created_at": h.created_at}
            for h in sorted(issue.status_history, key=lambda x: x.created_at)
        ],
        "comments": [
            {"content": c.content, "image_url": c.image_url, "created_at": c.created_at,
             "is_anonymous": c.is_anonymous}
            for c in sorted(issue.comments, key=lambda x: x.created_at)
        ],
    }


@router.post("/{issue_id}/verify")
async def verify_issue(
    issue_id: str,
    data: VerificationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    issue = await db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    # Check already verified by this user
    result = await db.execute(
        select(CommunityVerification).where(
            and_(
                CommunityVerification.issue_id == issue_id,
                CommunityVerification.user_id == current_user["uid"],
            )
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already verified this issue")

    vote = VerificationVote.confirm if data.vote == "confirm" else VerificationVote.reject
    verification = CommunityVerification(
        issue_id=issue_id,
        user_id=current_user["uid"],
        vote=vote,
        comment=data.comment,
    )
    db.add(verification)

    # Update issue community support
    if vote == VerificationVote.confirm:
        issue.community_support_count += 1

    # Recalculate dynamic priority
    confirms = sum(1 for v in issue.verifications if v.vote == VerificationVote.confirm) + (1 if vote == VerificationVote.confirm else 0)
    rejects = sum(1 for v in issue.verifications if v.vote == VerificationVote.reject) + (1 if vote == VerificationVote.reject else 0)
    issue.priority_score = calculate_priority_score(
        severity=issue.severity.value,
        category=issue.category.value,
        confirmation_count=confirms,
        rejection_count=rejects,
        created_at=issue.created_at,
        confidence_score=issue.confidence_score,
    )

    # Update status if enough confirmations
    if confirms >= 3 and issue.status == IssueStatus.ai_verified:
        await update_issue_status(db, issue, IssueStatus.community_verified, current_user["uid"])

    # Award points to verifier
    user = await db.get(User, current_user["uid"])
    if user:
        user.verifications_done += 1
        await award_points(db, user, 5, "Thanks for verifying a community issue!")

    await db.flush()
    return {"status": "ok", "vote": vote.value, "new_priority": issue.priority_score}


@router.post("/{issue_id}/comment")
async def add_comment(
    issue_id: str,
    data: CommentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    from app.models.issue import IssueComment
    issue = await db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    comment = IssueComment(
        issue_id=issue_id,
        user_id=current_user["uid"] if current_user and not data.is_anonymous else None,
        content=data.content,
        is_anonymous=data.is_anonymous,
    )
    db.add(comment)
    await db.flush()
    return {"status": "ok", "comment_id": comment.id}


@router.patch("/{issue_id}/status")
async def update_status(
    issue_id: str,
    data: IssueStatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") not in ["government", "admin", "moderator"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    issue = await db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    from app.models.issue import IssueStatus as IS
    new_status = IS(data.status.value)
    await update_issue_status(db, issue, new_status, current_user["uid"], data.notes)
    return {"status": "ok", "new_status": new_status.value}


@router.post("/{issue_id}/resolve")
async def resolve_issue(
    issue_id: str,
    notes: str = Form(""),
    images: List[UploadFile] = File(default=[]),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") not in ["government", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    issue = await db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    image_bytes_list = []
    for img in images[:3]:
        image_bytes_list.append(await img.read())

    result = await process_resolution(
        db=db,
        issue=issue,
        resolution_image_bytes=image_bytes_list,
        resolution_notes=notes,
        resolved_by_id=current_user["uid"],
    )
    return result


@router.get("/stats/live")
async def live_stats(db: AsyncSession = Depends(get_db)):
    from datetime import datetime
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time())

    total = (await db.execute(select(func.count(Issue.id)))).scalar() or 0
    today_total = (await db.execute(
        select(func.count(Issue.id)).where(Issue.created_at >= today_start)
    )).scalar() or 0
    resolved = (await db.execute(
        select(func.count(Issue.id)).where(Issue.status.in_([IssueStatus.resolved, IssueStatus.closed]))
    )).scalar() or 0
    pending = (await db.execute(
        select(func.count(Issue.id)).where(
            Issue.status.notin_([IssueStatus.resolved, IssueStatus.closed, IssueStatus.rejected])
        )
    )).scalar() or 0
    critical = (await db.execute(
        select(func.count(Issue.id)).where(Issue.severity == "critical", Issue.status.notin_([IssueStatus.resolved, IssueStatus.closed]))
    )).scalar() or 0

    return {
        "total": total,
        "today": today_total,
        "resolved": resolved,
        "pending": pending,
        "critical": critical,
        "resolution_rate": round((resolved / total * 100) if total > 0 else 0, 1),
    }
