"""
Predictive analytics: resolution time prediction + maintenance forecasting.
"""
import json
from typing import Optional, List
from datetime import datetime, timedelta

# Historical average resolution times (days) by category + severity
HISTORICAL_RESOLUTION = {
    "pothole": {"low": 14, "medium": 7, "high": 3, "critical": 1},
    "garbage": {"low": 3, "medium": 2, "high": 1, "critical": 0.5},
    "water_leakage": {"low": 5, "medium": 2, "high": 1, "critical": 0.25},
    "streetlight": {"low": 10, "medium": 5, "high": 2, "critical": 1},
    "road_damage": {"low": 30, "medium": 14, "high": 7, "critical": 2},
    "tree_fall": {"low": 3, "medium": 1, "high": 0.5, "critical": 0.25},
    "drainage": {"low": 7, "medium": 3, "high": 1, "critical": 0.5},
    "illegal_dumping": {"low": 5, "medium": 3, "high": 1, "critical": 0.5},
    "construction_hazard": {"low": 7, "medium": 3, "high": 1, "critical": 0.5},
    "wall_damage": {"low": 30, "medium": 14, "high": 7, "critical": 3},
    "other": {"low": 14, "medium": 7, "high": 3, "critical": 1},
}


def predict_resolution_time(
    category: str,
    severity: str,
    department_workload: int = 10,  # current open issues in dept
    priority_score: int = 50,
) -> dict:
    """
    Predict estimated resolution time.
    Returns: {days, label, confidence, expected_date}
    """
    base_days = HISTORICAL_RESOLUTION.get(category, HISTORICAL_RESOLUTION["other"]).get(severity, 7)

    # Workload factor: more issues = slower resolution
    workload_factor = 1.0 + (department_workload / 50)  # 50 = baseline workload
    workload_factor = min(workload_factor, 3.0)  # Cap at 3x

    # Priority factor: higher priority = faster resolution
    priority_factor = 1.0 - (priority_score / 200)  # High priority reduces time
    priority_factor = max(priority_factor, 0.3)

    estimated_days = base_days * workload_factor * priority_factor
    estimated_days = round(estimated_days, 1)

    expected_date = (datetime.utcnow() + timedelta(days=estimated_days)).strftime("%Y-%m-%d")

    if estimated_days <= 1:
        label = "Within 24 hours"
    elif estimated_days <= 3:
        label = f"{int(estimated_days)} days"
    elif estimated_days <= 14:
        label = f"{int(estimated_days)} days"
    elif estimated_days <= 30:
        label = f"{int(estimated_days / 7)} weeks"
    else:
        label = f"{int(estimated_days / 30)} months"

    confidence = max(0.5, 0.9 - (department_workload / 100))

    return {
        "estimated_days": estimated_days,
        "label": label,
        "expected_date": expected_date,
        "confidence": round(confidence, 2),
        "workload_factor": round(workload_factor, 2),
    }


async def generate_predictive_insights(issues_summary: List[dict]) -> List[dict]:
    """
    Generate predictive maintenance insights using AI.
    """
    if not issues_summary:
        return []

    try:
        import google.generativeai as genai
        from app.core.config import settings

        if not settings.GEMINI_API_KEY:
            return _fallback_insights(issues_summary)

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = f"""You are a predictive maintenance AI for a city infrastructure system.

Analyze this historical issue data and generate predictive insights.

DATA: {json.dumps(issues_summary[:30], default=str)}

Generate 4-6 predictions in JSON array:
[
  {{
    "location": "<area or ward name>",
    "prediction": "<specific prediction>",
    "category": "<issue category likely to occur>",
    "probability": <0.0 to 1.0>,
    "timeframe": "<e.g., next 2 months>",
    "basis": "<what data pattern this is based on>",
    "recommended_action": "<proactive action for government>",
    "potential_savings": "<estimated citizen complaints prevented>"
  }}
]"""

        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = text[text.find("["):text.rfind("]") + 1]
        return json.loads(text)

    except Exception:
        return _fallback_insights(issues_summary)


def _fallback_insights(issues_summary: List[dict]) -> List[dict]:
    return [
        {
            "location": "High-frequency zones",
            "prediction": "Increased pothole reports expected after monsoon season",
            "category": "pothole",
            "probability": 0.78,
            "timeframe": "Next 2 months",
            "basis": "Historical seasonal pattern",
            "recommended_action": "Pre-emptive road inspection and repair",
            "potential_savings": "50+ complaints",
        }
    ]
