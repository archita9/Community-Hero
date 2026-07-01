"""
Emergency detection: identifies life-threatening issues requiring immediate escalation.
"""
import json
import base64
from typing import Optional

EMERGENCY_KEYWORDS = [
    "collapse", "collapsed", "fire", "explosion", "gas leak", "flooding",
    "major flood", "sinkhole", "bridge", "electrocution", "electrocuted",
    "building collapse", "landslide", "chemical", "toxic",
]


async def detect_emergency(
    description: str,
    image_bytes: Optional[bytes] = None,
    ai_classification: Optional[dict] = None,
) -> dict:
    """
    Detect if an issue is an emergency requiring immediate escalation.
    Returns: {is_emergency, emergency_type, escalation_contacts, message}
    """
    description_lower = description.lower()

    # Quick keyword check
    keyword_match = any(kw in description_lower for kw in EMERGENCY_KEYWORDS)

    # Severity from AI classification
    ai_severity = (ai_classification or {}).get("severity", "medium")
    ai_category = (ai_classification or {}).get("category", "other")

    # Gemini emergency assessment
    is_emergency = False
    emergency_type = None
    emergency_details = {}

    try:
        import google.generativeai as genai
        from app.core.config import settings

        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-1.5-flash")

            parts = []
            if image_bytes:
                import PIL.Image, io
                img = PIL.Image.open(io.BytesIO(image_bytes))
                img.thumbnail((512, 512))
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=80)
                buf.seek(0)
                parts.append({"mime_type": "image/jpeg", "data": base64.b64encode(buf.read()).decode()})

            prompt = f"""Analyze this civic report for emergency/life-threatening conditions.

Description: {description}
AI Category: {ai_category}
AI Severity: {ai_severity}

Respond ONLY with JSON:
{{
  "is_emergency": <true|false>,
  "emergency_type": "<collapsed_structure|major_fire|gas_leak|major_flooding|electrocution_risk|landslide|null>",
  "immediate_danger": <true|false>,
  "lives_at_risk": <true|false>,
  "escalation_contacts": ["Police (100)", "Fire (101)", "Ambulance (108)", "Municipality Emergency"],
  "public_message": "<immediate safety message for citizens nearby>",
  "reason": "<why this is/isn't an emergency>"
}}"""
            parts.append(prompt)

            response = model.generate_content(parts)
            text = response.text.strip()
            if text.startswith("```"):
                text = text[text.find("{"):text.rfind("}") + 1]
            emergency_details = json.loads(text)
            is_emergency = emergency_details.get("is_emergency", False)
            emergency_type = emergency_details.get("emergency_type")

    except Exception:
        # Fallback to keyword match + severity
        is_emergency = keyword_match and ai_severity in ["high", "critical"]
        emergency_type = "general_emergency" if is_emergency else None

    if not emergency_details:
        emergency_details = {
            "is_emergency": is_emergency,
            "emergency_type": emergency_type,
            "immediate_danger": is_emergency,
            "lives_at_risk": is_emergency,
            "escalation_contacts": ["Police (100)", "Fire (101)", "Ambulance (108)"] if is_emergency else [],
            "public_message": "Please maintain safe distance and call emergency services." if is_emergency else "",
            "reason": "Detected via keyword analysis" if is_emergency else "No emergency detected",
        }

    return emergency_details
