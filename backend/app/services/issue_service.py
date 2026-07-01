"""
Issue service: full business logic for report creation, AI pipeline, lifecycle management.
"""
import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from fastapi import HTTPException

from app.models.issue import Issue, IssueStatus, IssueCategory, IssueSeverity, IssueStatusHistory
from app.models.department import Department
from app.models.user import User
from app.ai.classifier import classify_issue, compare_before_after
from app.ai.priority import calculate_priority_score
from app.ai.duplicate import find_duplicate_issues
from app.ai.router import get_department_code
from app.services.storage import upload_file, compress_image, generate_qr_code
from app.services.notifications import notify_issue_status_change, award_points, create_notification
from app.models.department import NotificationType


def generate_issue_number() -> str:
    """Generate unique issue number like CH-2024-001234."""
    year = datetime.utcnow().year
    unique = str(uuid.uuid4().int)[:6]
    return f"CH-{year}-{unique}"


async def get_department_by_code(db: AsyncSession, code: str) -> Optional[Department]:
    result = await db.execute(select(Department).where(Department.code == code))
    return result.scalar_one_or_none()


async def create_issue(
    db: AsyncSession,
    description: str,
    latitude: float,
    longitude: float,
    address: Optional[str],
    reporter_id: Optional[str],
    is_anonymous: bool,
    image_bytes_list: Optional[List[bytes]] = None,
    video_bytes: Optional[bytes] = None,
    voice_bytes: Optional[bytes] = None,
    base_url: str = "http://localhost:3000",
) -> dict:
    """Full issue creation pipeline with AI analysis."""

    # 1. Compress and upload images
    image_urls = []
    first_image_bytes = None

    if image_bytes_list:
        for i, img_bytes in enumerate(image_bytes_list):
            compressed = await compress_image(img_bytes)
            if i == 0:
                first_image_bytes = compressed
            url = await upload_file(compressed, f"issue_{uuid.uuid4().hex}.jpg", "image/jpeg", "issues")
            image_urls.append(url)

    video_url = None
    if video_bytes:
        video_url = await upload_file(video_bytes, f"video_{uuid.uuid4().hex}.mp4", "video/mp4", "videos")

    voice_url = None
    if voice_bytes:
        voice_url = await upload_file(voice_bytes, f"voice_{uuid.uuid4().hex}.webm", "audio/webm", "voice")

    # 2. AI Classification
    ai_result = await classify_issue(
        description=description,
        image_bytes=first_image_bytes,
        latitude=latitude,
        longitude=longitude,
    )

    category_str = ai_result.get("category", "other")
    try:
        category = IssueCategory(category_str)
    except ValueError:
        category = IssueCategory.other

    severity_str = ai_result.get("severity", "medium")
    try:
        severity = IssueSeverity(severity_str)
    except ValueError:
        severity = IssueSeverity.medium

    title = ai_result.get("title", description[:80])
    enhanced_description = ai_result.get("enhanced_description", description)
    confidence_score = float(ai_result.get("confidence_score", 0.6))

    # 2b. Fake image check — reject if AI is confident image is fake/downloaded
    if first_image_bytes and ai_result.get("ai_processed"):
        is_real = ai_result.get("is_real_photo")
        fake_prob = float(ai_result.get("fake_probability", 0.0))
        if is_real is False and fake_prob >= 0.75:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "fake_image_detected",
                    "message": "AI detected this image appears to be downloaded from the internet or is not a real photo. Please upload a genuine photo of the issue.",
                    "authenticity_note": ai_result.get("authenticity_note", ""),
                    "fake_probability": fake_prob,
                }
            )

    # 2c. Compute image hash for duplicate detection
    image_hash = None
    if first_image_bytes:
        import hashlib
        image_hash = hashlib.md5(first_image_bytes).hexdigest()
        ai_result["image_hash"] = image_hash  # Store in AI analysis for future matching

    # 3. Duplicate detection (with image hash)
    duplicate, similarity = await find_duplicate_issues(
        db=db,
        latitude=latitude,
        longitude=longitude,
        category=category_str,
        description=description,
        image_hash=image_hash,
    )

    if duplicate:
        # Merge: increase community support, link this reporter as supporter
        duplicate.community_support_count += 1

        # Track all images from duplicate reporters — add to the main issue's image list
        if image_bytes_list and first_image_bytes:
            try:
                compressed = await compress_image(first_image_bytes)
                url = await upload_file(compressed, f"issue_{uuid.uuid4().hex}.jpg", "image/jpeg", "issues")
                existing_urls = duplicate.image_urls or []
                duplicate.image_urls = existing_urls + [url]
            except Exception:
                pass

        await db.flush()

        if reporter_id:
            reporter = await db.get(User, reporter_id)
            if reporter:
                await award_points(db, reporter, 5, "Reported an issue that matched an existing report — community support added!")

            # Save a "ghost" issue record to track this supporter for notifications
            supporter_issue = Issue(
                issue_number=generate_issue_number(),
                reporter_id=reporter_id if not is_anonymous else None,
                is_anonymous=is_anonymous,
                title=duplicate.title,
                description=description,
                category=duplicate.category,
                severity=duplicate.severity,
                status=duplicate.status,
                priority_score=duplicate.priority_score,
                confidence_score=duplicate.confidence_score,
                latitude=latitude,
                longitude=longitude,
                address=address,
                image_urls=[],
                department_id=duplicate.department_id,
                ai_analysis={"merged": True},
                is_duplicate=True,
                duplicate_of_id=duplicate.id,
            )
            db.add(supporter_issue)
            await db.flush()

        return {
            "is_duplicate": True,
            "merged_into": {
                "id": duplicate.id,
                "issue_number": duplicate.issue_number,
                "title": duplicate.title,
                "status": duplicate.status.value,
                "similarity_score": round(similarity, 2),
            },
            "issue": None,
        }

    # 4. Department routing
    dept_code = get_department_code(category_str)
    department = await get_department_by_code(db, dept_code)

    # 5. Priority score
    priority_score = calculate_priority_score(
        severity=severity_str,
        category=category_str,
        created_at=datetime.utcnow(),
        confidence_score=confidence_score,
    )

    # 6. Create issue record
    issue = Issue(
        issue_number=generate_issue_number(),
        reporter_id=reporter_id if not is_anonymous else None,
        is_anonymous=is_anonymous,
        title=title,
        description=description,
        enhanced_description=enhanced_description,
        category=category,
        severity=severity,
        status=IssueStatus.ai_verified if ai_result.get("ai_processed") else IssueStatus.reported,
        priority_score=priority_score,
        confidence_score=confidence_score,
        latitude=latitude,
        longitude=longitude,
        address=address,
        image_urls=image_urls,
        video_url=video_url,
        voice_note_url=voice_url,
        department_id=department.id if department else None,
        ai_analysis=ai_result,
        is_duplicate=False,
    )

    db.add(issue)
    await db.flush()

    # 7. Status history
    history = IssueStatusHistory(
        issue_id=issue.id,
        old_status=None,
        new_status=issue.status.value,
        changed_by_id=reporter_id,
        notes="Issue created via AI pipeline",
    )
    db.add(history)

    # 8. Generate QR code
    try:
        qr_bytes = await generate_qr_code(issue.id, base_url)
        qr_url = await upload_file(qr_bytes, f"qr_{issue.id}.png", "image/png", "qrcodes")
        issue.qr_code_url = qr_url
    except Exception:
        pass

    # 9. Award points to reporter
    if reporter_id and not is_anonymous:
        reporter = await db.get(User, reporter_id)
        if reporter:
            reporter.reports_submitted += 1
            points = 25 if ai_result.get("ai_processed") else 10
            await award_points(db, reporter, points, "Thank you for reporting a civic issue!")

    await db.flush()

    return {
        "is_duplicate": False,
        "merged_into": None,
        "issue": issue,
    }


async def update_issue_status(
    db: AsyncSession,
    issue: Issue,
    new_status: IssueStatus,
    changed_by_id: Optional[str],
    notes: Optional[str] = None,
) -> Issue:
    """Update issue status and create history record."""
    old_status = issue.status.value
    issue.status = new_status

    if new_status == IssueStatus.resolved:
        issue.resolved_at = datetime.utcnow()

    history = IssueStatusHistory(
        issue_id=issue.id,
        old_status=old_status,
        new_status=new_status.value,
        changed_by_id=changed_by_id,
        notes=notes,
    )
    db.add(history)

    # Notify original reporter
    if issue.reporter_id:
        await notify_issue_status_change(db, issue, new_status.value, issue.reporter_id)

    # If resolved/closed — also notify ALL duplicate reporters
    if new_status in (IssueStatus.resolved, IssueStatus.closed):
        from sqlalchemy import select as sa_select
        dup_result = await db.execute(
            sa_select(Issue).where(
                and_(Issue.duplicate_of_id == issue.id, Issue.reporter_id.isnot(None))
            )
        )
        duplicate_reports = dup_result.scalars().all()
        for dup in duplicate_reports:
            if dup.reporter_id and dup.reporter_id != issue.reporter_id:
                await create_notification(
                    db=db,
                    user_id=dup.reporter_id,
                    notif_type=NotificationType.issue_resolved,
                    title="Issue You Reported Has Been Resolved!",
                    message=f"The civic issue '{issue.title}' that you reported has been fixed. Thank you for being a Community Hero!",
                    issue_id=issue.id,
                )

    await db.flush()
    return issue


async def process_resolution(
    db: AsyncSession,
    issue: Issue,
    resolution_image_bytes: List[bytes],
    resolution_notes: str,
    resolved_by_id: str,
) -> dict:
    """Process resolution submission with Before/After AI verification."""

    # Upload resolution images
    resolution_urls = []
    for img_bytes in resolution_image_bytes:
        compressed = await compress_image(img_bytes)
        url = await upload_file(compressed, f"resolution_{uuid.uuid4().hex}.jpg", "image/jpeg", "resolutions")
        resolution_urls.append(url)

    issue.resolution_image_urls = resolution_urls
    issue.resolution_notes = resolution_notes

    # Before/After AI verification
    verification_result = {"result": "needs_review", "analysis": "No before image available"}

    if issue.image_urls and resolution_urls:
        try:
            # Download before image
            import httpx
            before_url = issue.image_urls[0]
            after_url = resolution_urls[0]

            # For local files, read directly
            if before_url.startswith("/uploads"):
                with open(f".{before_url}", "rb") as f:
                    before_bytes = f.read()
            else:
                async with httpx.AsyncClient() as client:
                    r = await client.get(before_url, timeout=10)
                    before_bytes = r.content

            if after_url.startswith("/uploads"):
                with open(f".{after_url}", "rb") as f:
                    after_bytes = f.read()
            else:
                async with httpx.AsyncClient() as client:
                    r = await client.get(after_url, timeout=10)
                    after_bytes = r.content

            verification_result = await compare_before_after(
                before_image_bytes=before_bytes,
                after_image_bytes=after_bytes,
                issue_category=issue.category.value,
                issue_description=issue.description,
            )
        except Exception as e:
            verification_result = {
                "result": "needs_review",
                "analysis": f"Verification error: {str(e)}",
                "confidence": 0.0,
            }

    ai_result = verification_result.get("result", "needs_review")
    issue.before_after_result = ai_result
    issue.before_after_analysis = verification_result.get("analysis", "")

    # Determine new status based on AI verdict
    if ai_result == "verified_resolved":
        issue.before_after_verified = True
        new_status = IssueStatus.resolved
        status_notes = "AI verified: Issue confirmed resolved"
    else:
        issue.before_after_verified = False
        new_status = IssueStatus.flagged
        status_notes = f"AI flagged: {verification_result.get('analysis', 'Resolution appears incomplete')}"

    await update_issue_status(db, issue, new_status, resolved_by_id, status_notes)

    # Notify reporter about before/after result
    if issue.reporter_id:
        if ai_result == "verified_resolved":
            await create_notification(
                db=db,
                user_id=issue.reporter_id,
                notif_type=NotificationType.issue_resolved,
                title="✅ Issue Verified & Resolved!",
                message="AI has confirmed your reported issue has been successfully fixed.",
                issue_id=issue.id,
            )
            # Award resolution confirmation points
            reporter = await db.get(User, issue.reporter_id)
            if reporter:
                await award_points(db, reporter, 15, "Your reported issue was successfully resolved!")
        else:
            await create_notification(
                db=db,
                user_id=issue.reporter_id,
                notif_type=NotificationType.before_after_flagged,
                title="⚠️ Resolution Under Review",
                message="The resolution has been flagged for further review as AI could not verify complete fix.",
                issue_id=issue.id,
            )

    return {
        "verification_result": verification_result,
        "new_status": new_status.value,
        "resolution_urls": resolution_urls,
    }
