"""
Priority scoring algorithm: 0-100 based on multiple weighted factors.
"""
from datetime import datetime, timedelta
from typing import Optional


SEVERITY_WEIGHTS = {
    "critical": 40,
    "high": 30,
    "medium": 20,
    "low": 10,
}

CATEGORY_BASE_SCORES = {
    "pothole": 25,
    "water_leakage": 30,
    "streetlight": 20,
    "garbage": 15,
    "road_damage": 22,
    "wall_damage": 12,
    "illegal_dumping": 18,
    "tree_fall": 28,
    "construction_hazard": 32,
    "drainage": 25,
    "other": 10,
}

# Department → sensitive area bonuses
SENSITIVE_AREA_BONUS = {
    "hospital": 15,
    "school": 12,
    "main_road": 10,
    "market": 8,
}


def calculate_priority_score(
    severity: str,
    category: str,
    community_support_count: int = 0,
    confirmation_count: int = 0,
    rejection_count: int = 0,
    created_at: Optional[datetime] = None,
    nearby_sensitive_areas: Optional[list] = None,
    nearby_issue_count: int = 0,
    confidence_score: float = 0.5,
) -> int:
    """
    Calculate priority score 0-100.

    Factors:
    - Severity (0-40 pts)
    - Category base score (0-32 pts)
    - Community support (0-15 pts)
    - Time since reported (0-10 pts time decay bonus)
    - Nearby sensitive areas (0-15 pts)
    - Nearby duplicate reports (0-8 pts)
    - AI confidence (0-5 pts)
    """
    score = 0.0

    # 1. Severity weight (40 pts max)
    score += SEVERITY_WEIGHTS.get(severity, 20)

    # 2. Category base score (32 pts max)
    score += CATEGORY_BASE_SCORES.get(category, 10)

    # 3. Community support (15 pts max): confirmations boost, rejections reduce
    net_support = max(0, confirmation_count - (rejection_count * 0.5))
    support_score = min(15, net_support * 2)
    score += support_score

    # 4. Time-based urgency (10 pts max): older unresolved issues get higher priority
    if created_at:
        hours_old = (datetime.utcnow() - created_at).total_seconds() / 3600
        if hours_old > 168:  # > 1 week
            score += 10
        elif hours_old > 72:  # > 3 days
            score += 7
        elif hours_old > 24:  # > 1 day
            score += 4
        else:
            score += 1

    # 5. Nearby sensitive areas bonus (15 pts max)
    if nearby_sensitive_areas:
        area_bonus = 0
        for area in nearby_sensitive_areas:
            area_bonus += SENSITIVE_AREA_BONUS.get(area, 3)
        score += min(15, area_bonus)

    # 6. Nearby reports (cluster = higher priority) (8 pts max)
    cluster_bonus = min(8, nearby_issue_count * 1.5)
    score += cluster_bonus

    # 7. AI confidence bonus (5 pts max)
    score += confidence_score * 5

    # Normalize to 0-100
    final_score = int(min(100, max(0, score)))
    return final_score


def get_priority_label(score: int) -> str:
    if score >= 80:
        return "critical"
    elif score >= 60:
        return "high"
    elif score >= 40:
        return "medium"
    else:
        return "low"


def get_priority_color(score: int) -> str:
    if score >= 80:
        return "#ef4444"
    elif score >= 60:
        return "#f97316"
    elif score >= 40:
        return "#eab308"
    else:
        return "#22c55e"
