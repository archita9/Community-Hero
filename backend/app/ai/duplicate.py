"""
Duplicate detection: finds nearby similar issues using geospatial distance + text similarity.
"""
import math
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.issue import Issue, IssueStatus
from app.core.config import settings


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two GPS coordinates in meters."""
    R = 6371000  # Earth's radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def text_similarity(text1: str, text2: str) -> float:
    """Simple word-overlap similarity score 0-1."""
    if not text1 or not text2:
        return 0.0
    words1 = set(text1.lower().split())
    words2 = set(text2.lower().split())
    # Remove stopwords
    stopwords = {"the", "a", "an", "is", "in", "on", "at", "to", "and", "or", "of", "there", "has", "have"}
    words1 -= stopwords
    words2 -= stopwords
    if not words1 or not words2:
        return 0.0
    intersection = words1 & words2
    union = words1 | words2
    return len(intersection) / len(union)


async def find_duplicate_issues(
    db: AsyncSession,
    latitude: float,
    longitude: float,
    category: str,
    description: str,
    image_hash: Optional[str] = None,
    exclude_id: Optional[str] = None,
) -> Tuple[Optional[Issue], float]:
    """
    Search for potential duplicate issues.
    Checks:
    1. Exact same image hash (strongest signal)
    2. Same location (within radius) + same category + similar description
    Returns (matching_issue, similarity_score) or (None, 0.0).
    """
    radius = settings.DUPLICATE_RADIUS_METERS

    # Rough bounding box for SQL query
    lat_delta = radius / 111000
    lon_delta = radius / (111000 * math.cos(math.radians(latitude)))

    stmt = select(Issue).where(
        and_(
            Issue.latitude.between(latitude - lat_delta, latitude + lat_delta),
            Issue.longitude.between(longitude - lon_delta, longitude + lon_delta),
            Issue.status.notin_([IssueStatus.closed, IssueStatus.rejected]),
            Issue.category == category,
        )
    )

    if exclude_id:
        stmt = stmt.where(Issue.id != exclude_id)

    result = await db.execute(stmt)
    candidates = result.scalars().all()

    best_match = None
    best_score = 0.0

    for candidate in candidates:
        # Precise distance check
        dist = haversine_distance(latitude, longitude, candidate.latitude, candidate.longitude)
        if dist > radius:
            continue

        # --- Check 1: Exact same image hash = definite duplicate ---
        if image_hash and candidate.ai_analysis:
            stored_hash = candidate.ai_analysis.get("image_hash")
            if stored_hash and stored_hash == image_hash:
                print(f"[DUPLICATE] Exact same image hash matched! Issue: {candidate.issue_number}")
                return candidate, 1.0

        # --- Check 2: Text similarity ---
        txt_sim = text_similarity(description, candidate.description)
        distance_score = 1.0 - (dist / radius)
        combined = (distance_score * 0.4) + (txt_sim * 0.6)

        if combined > best_score:
            best_score = combined
            best_match = candidate

    # Lowered threshold: 0.5 means same location + 50% word overlap = duplicate
    threshold = 0.5
    if best_score >= threshold:
        print(f"[DUPLICATE] Similarity score {best_score:.2f} >= threshold {threshold}")
        return best_match, best_score

    return None, 0.0


def get_nearby_issues(
    all_issues: List[Issue],
    latitude: float,
    longitude: float,
    radius_meters: float = 500,
) -> List[Issue]:
    """Get issues within a radius (no DB required)."""
    nearby = []
    for issue in all_issues:
        dist = haversine_distance(latitude, longitude, issue.latitude, issue.longitude)
        if dist <= radius_meters:
            nearby.append(issue)
    return nearby
