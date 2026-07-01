"""
AI Recommendation Engine: generates actionable advice per issue category.
"""
import json
from typing import Optional

# Static recommendations per category (used as fallback + context)
CATEGORY_RECOMMENDATIONS = {
    "pothole": {
        "immediate": "Mark the area with safety cones/barriers to prevent vehicle damage",
        "short_term": "Schedule pothole patching within 48 hours",
        "long_term": "Conduct full road surface assessment for adjacent 200m stretch",
        "risks": ["Vehicle damage", "Motorcycle accidents", "Water accumulation leading to road degradation"],
        "department_note": "Assign to road maintenance crew with cold mix asphalt",
    },
    "garbage": {
        "immediate": "Deploy emergency garbage collection vehicle within 24 hours",
        "short_term": "Install additional garbage bins in the area",
        "long_term": "Review waste collection schedule for this zone",
        "risks": ["Disease spread", "Pest infestation", "Air and water pollution"],
        "department_note": "Check if area is on regular collection route",
    },
    "water_leakage": {
        "immediate": "Shut off water supply to affected section immediately",
        "short_term": "Repair or replace damaged pipe section within 24 hours",
        "long_term": "Full pipeline integrity assessment for the ward",
        "risks": ["Road damage", "Foundation erosion", "Water contamination", "Sinkhole risk"],
        "department_note": "Critical — water loss + infrastructure risk. Escalate immediately.",
    },
    "streetlight": {
        "immediate": "Install temporary lighting if on main road",
        "short_term": "Repair or replace faulty streetlight within 48 hours",
        "long_term": "Audit entire street lighting system in the ward",
        "risks": ["Road accidents", "Increased crime", "Pedestrian safety risk"],
        "department_note": "Check electrical connection and bulb/LED status",
    },
    "road_damage": {
        "immediate": "Place warning signs and reflectors",
        "short_term": "Road repair and resurfacing within 1 week",
        "long_term": "Road condition survey for the entire stretch",
        "risks": ["Vehicle damage", "Accidents", "Progressive road deterioration"],
        "department_note": "Assess depth and extent before repair method selection",
    },
    "tree_fall": {
        "immediate": "Remove fallen tree from road/path immediately — traffic hazard",
        "short_term": "Clear all debris and restore safe passage within 4 hours",
        "long_term": "Survey adjacent trees for structural stability",
        "risks": ["Road blockage", "Power line damage", "Property damage", "Injury risk"],
        "department_note": "Coordinate with electricity department if power lines are affected",
    },
    "drainage": {
        "immediate": "Clear visible blockage and pump out standing water",
        "short_term": "Full drain cleaning and inspection within 3 days",
        "long_term": "Drainage capacity upgrade for the zone",
        "risks": ["Waterlogging", "Disease (dengue, malaria)", "Road damage", "Property flooding"],
        "department_note": "Check if blockage is localized or systemic",
    },
    "illegal_dumping": {
        "immediate": "Remove dumped waste and sanitize area",
        "short_term": "Install CCTV or no-dumping signage",
        "long_term": "Identify and prosecute repeat offenders",
        "risks": ["Environmental pollution", "Health hazard", "Pest infestation"],
        "department_note": "Document evidence for enforcement action",
    },
    "construction_hazard": {
        "immediate": "Ensure safety barriers and warning signs are in place",
        "short_term": "Inspect construction site compliance within 24 hours",
        "long_term": "Regular site safety audits",
        "risks": ["Worker injury", "Pedestrian accidents", "Legal liability"],
        "department_note": "Check construction permit and safety compliance",
    },
    "wall_damage": {
        "immediate": "Cordon off area if structural collapse risk exists",
        "short_term": "Structural assessment within 48 hours",
        "long_term": "Repair or demolish as per structural engineer's recommendation",
        "risks": ["Structural collapse", "Injury to pedestrians"],
        "department_note": "Engage certified structural engineer for assessment",
    },
}


async def generate_recommendations(
    category: str,
    severity: str,
    description: str,
    ai_analysis: Optional[dict] = None,
) -> dict:
    """Generate structured recommendations for an issue."""
    base = CATEGORY_RECOMMENDATIONS.get(category, {
        "immediate": "Inspect and assess the reported issue",
        "short_term": "Schedule repair based on assessment",
        "long_term": "Include in ward maintenance plan",
        "risks": ["Inconvenience to citizens"],
        "department_note": "Review and assign to appropriate team",
    })

    # Enhance with Gemini if available
    try:
        import google.generativeai as genai
        from app.core.config import settings

        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-1.5-flash")

            prompt = f"""You are a civic infrastructure expert. Generate specific recommendations for this issue.

Category: {category}
Severity: {severity}
Description: {description}
AI Analysis: {json.dumps(ai_analysis or {})}

Respond ONLY with JSON:
{{
  "immediate_action": "<specific action within hours>",
  "estimated_resolution_time": "<e.g., 4 hours, 2 days, 1 week>",
  "resources_needed": ["<resource 1>", "<resource 2>"],
  "citizen_advisory": "<what citizens should do or avoid>",
  "escalation_needed": <true|false>,
  "escalation_reason": "<if escalation needed, why>",
  "ai_insight": "<one key insight about this specific case>"
}}"""

            response = model.generate_content(prompt)
            text = response.text.strip()
            if text.startswith("```"):
                text = text[text.find("{"):text.rfind("}") + 1]
            enhanced = json.loads(text)

            return {
                **base,
                "immediate": enhanced.get("immediate_action", base.get("immediate")),
                "estimated_resolution_time": enhanced.get("estimated_resolution_time", "1-3 days"),
                "resources_needed": enhanced.get("resources_needed", []),
                "citizen_advisory": enhanced.get("citizen_advisory", ""),
                "escalation_needed": enhanced.get("escalation_needed", severity in ["high", "critical"]),
                "escalation_reason": enhanced.get("escalation_reason", ""),
                "ai_insight": enhanced.get("ai_insight", ""),
            }
    except Exception:
        pass

    return {
        **base,
        "estimated_resolution_time": _estimate_time(severity, category),
        "resources_needed": [],
        "citizen_advisory": "Please maintain safe distance from the reported issue.",
        "escalation_needed": severity in ["high", "critical"],
        "escalation_reason": "",
        "ai_insight": "",
    }


def _estimate_time(severity: str, category: str) -> str:
    times = {
        "critical": {"water_leakage": "2-4 hours", "tree_fall": "4-8 hours", "pothole": "24 hours",
                     "streetlight": "24 hours", "default": "24 hours"},
        "high": {"default": "2-3 days"},
        "medium": {"default": "5-7 days"},
        "low": {"default": "2-4 weeks"},
    }
    severity_times = times.get(severity, times["medium"])
    return severity_times.get(category, severity_times.get("default", "3-5 days"))
