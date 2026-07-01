"""
AI Classifier using Gemini Vision API (google-genai SDK).
Classifies issue category, detects fake images, generates confidence score.
"""
import json
import io
from typing import Optional
from app.core.config import settings

CATEGORY_DESCRIPTIONS = {
    "pothole": "Road surface has holes, craters or severe depressions",
    "garbage": "Uncollected garbage, trash piles, litter accumulation",
    "water_leakage": "Water pipe burst, water main leak, flooding from pipes",
    "streetlight": "Broken, non-functioning, damaged street lamp or light pole",
    "road_damage": "Road surface cracks, broken asphalt, damaged road markings",
    "wall_damage": "Damaged boundary wall, cracked structure, graffiti, collapsed wall",
    "illegal_dumping": "Unauthorized waste disposal, dumping in non-designated areas",
    "tree_fall": "Fallen tree, large broken branch blocking road or property",
    "construction_hazard": "Unsafe construction site, open excavation, no safety barriers",
    "drainage": "Blocked drain, overflowing manhole, waterlogging, flooding",
    "other": "Other civic issue not covered above",
}

SEVERITY_CRITERIA = {
    "critical": "Immediate danger to life, complete road blockage, major infrastructure failure",
    "high": "Significant hazard, major inconvenience to many people, requires urgent attention",
    "medium": "Moderate issue, causes inconvenience, should be fixed within a week",
    "low": "Minor issue, minimal impact, can be scheduled for routine maintenance",
}

# Models tried in order — falls back if quota exceeded on one
GEMINI_MODELS = [
    "models/gemini-2.0-flash-lite",   # cheapest, most available
    "models/gemini-2.0-flash",         # standard
    "models/gemini-2.5-flash",         # latest, highest quality
]


def _get_client():
    """Get google-genai client."""
    if not settings.GEMINI_API_KEY:
        return None
    try:
        from google import genai
        return genai.Client(api_key=settings.GEMINI_API_KEY)
    except Exception as e:
        print(f"Gemini client init error: {e}")
        return None


def _call_gemini(client, contents):
    """Try models in order until one works (handles quota limits)."""
    last_err = None
    for model_name in GEMINI_MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
            )
            print(f"[OK] Used model: {model_name}")
            return response
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                print(f"[QUOTA] Model {model_name} quota exceeded, trying next...")
                last_err = e
                continue
            raise
    raise last_err


def _resize_image(image_bytes: bytes) -> bytes:
    """Resize image for API efficiency."""
    try:
        import PIL.Image
        image = PIL.Image.open(io.BytesIO(image_bytes))
        image.thumbnail((1024, 1024), PIL.Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        fmt = image.format or "JPEG"
        if fmt not in ("JPEG", "PNG", "WEBP"):
            fmt = "JPEG"
        image.save(buf, format=fmt, quality=85)
        return buf.getvalue()
    except Exception:
        return image_bytes


def _parse_json(text: str) -> dict:
    """Parse JSON from Gemini response, stripping markdown if needed."""
    text = text.strip()
    if "```" in text:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start != -1 and end > start:
            text = text[start:end]
    return json.loads(text)


async def classify_issue(
    description: str,
    image_bytes: Optional[bytes] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
) -> dict:
    """
    Classify an issue using Gemini Vision API.
    Returns structured analysis with category, severity, confidence, title.
    Also detects if image is real or fake/downloaded.
    """
    client = _get_client()
    if not client:
        return _fallback_classification(description)

    categories_text = "\n".join([f"- {k}: {v}" for k, v in CATEGORY_DESCRIPTIONS.items()])
    severity_text = "\n".join([f"- {k}: {v}" for k, v in SEVERITY_CRITERIA.items()])

    prompt = f"""You are an AI assistant for a civic issue reporting platform in India.
Analyze the reported issue (description + image if provided) and respond with structured JSON.

ISSUE DESCRIPTION: {description}
LOCATION: {"Lat " + str(latitude) + ", Lon " + str(longitude) if latitude else "Not provided"}

AVAILABLE CATEGORIES:
{categories_text}

SEVERITY LEVELS:
{severity_text}

IMPORTANT: Also detect image authenticity:
- Is this a real photo taken by a citizen, or downloaded from Google/internet/social media?
- Is it AI-generated, a meme, screenshot, or edited image?

Respond ONLY with valid JSON (no markdown, no code blocks):
{{
  "category": "<one of the category keys above>",
  "confidence_score": <0.0 to 1.0>,
  "severity": "<low|medium|high|critical>",
  "title": "<concise 5-10 word title for the issue>",
  "enhanced_description": "<improved, professional 2-3 sentence description>",
  "key_observations": ["<observation 1>", "<observation 2>"],
  "recommended_action": "<specific recommended action for the department>",
  "estimated_fix_time": "<e.g. 2-4 hours, 1-2 days, 1 week>",
  "tags": ["<tag1>", "<tag2>", "<tag3>"],
  "is_real_photo": <true|false>,
  "authenticity_note": "<brief note: Real citizen photo / Downloaded from internet / AI generated / Screenshot>",
  "fake_probability": <0.0 to 1.0>
}}"""

    try:
        from google.genai import types

        parts = []
        if image_bytes:
            resized = _resize_image(image_bytes)
            parts.append(types.Part.from_bytes(data=resized, mime_type="image/jpeg"))
        parts.append(prompt)

        response = _call_gemini(client, parts)
        result = _parse_json(response.text)
        result["ai_processed"] = True
        print(f"[AI] Classified: category={result.get('category')} | severity={result.get('severity')} | real_photo={result.get('is_real_photo')}")
        return result

    except json.JSONDecodeError as e:
        print(f"Gemini JSON parse error: {e}")
        return _fallback_classification(description)
    except Exception as e:
        print(f"Gemini classification error: {type(e).__name__}: {e}")
        return _fallback_classification(description)


def _fallback_classification(description: str) -> dict:
    """Rule-based fallback when AI is unavailable."""
    d = description.lower()
    category = "other"
    if any(w in d for w in ["pothole", "hole", "crater", "road surface", "गड्ढा"]):
        category = "pothole"
    elif any(w in d for w in ["garbage", "trash", "waste", "litter", "dump", "कचरा"]):
        category = "garbage"
    elif any(w in d for w in ["water", "leak", "pipe", "flood", "पानी", "लीक"]):
        category = "water_leakage"
    elif any(w in d for w in ["light", "lamp", "streetlight", "dark", "बत्ती"]):
        category = "streetlight"
    elif any(w in d for w in ["road", "crack", "asphalt", "pavement", "सड़क"]):
        category = "road_damage"
    elif any(w in d for w in ["tree", "branch", "fallen", "uprooted", "पेड़"]):
        category = "tree_fall"
    elif any(w in d for w in ["drain", "manhole", "waterlog", "overflow", "नाला"]):
        category = "drainage"

    return {
        "category": category,
        "confidence_score": 0.6,
        "severity": "medium",
        "title": description[:60] + "..." if len(description) > 60 else description,
        "enhanced_description": description,
        "key_observations": ["Issue reported by citizen"],
        "recommended_action": "Inspect and address the reported issue",
        "estimated_fix_time": "1-3 days",
        "tags": [category],
        "ai_processed": False,
        "is_real_photo": None,
        "authenticity_note": "AI verification unavailable - rule-based classification used",
        "fake_probability": 0.0,
    }


async def compare_before_after(
    before_image_bytes: bytes,
    after_image_bytes: bytes,
    issue_category: str,
    issue_description: str,
) -> dict:
    """Compare before and after images to verify issue resolution."""
    client = _get_client()
    if not client:
        return {
            "result": "needs_review",
            "confidence": 0.5,
            "analysis": "AI verification unavailable. Manual review required.",
            "is_resolved": None,
        }

    prompt = f"""You are a civic issue resolution verification AI.
Compare the BEFORE (original issue) and AFTER (claimed resolution) images.

ISSUE CATEGORY: {issue_category}
ISSUE DESCRIPTION: {issue_description}

Respond ONLY with valid JSON (no markdown):
{{
  "result": "<verified_resolved|needs_review|insufficient_evidence>",
  "confidence": <0.0 to 1.0>,
  "is_resolved": <true|false|null>,
  "analysis": "<2-3 sentence explanation>",
  "before_observations": ["<what was wrong>"],
  "after_observations": ["<what you see now>"],
  "resolution_quality": "<poor|fair|good|excellent>",
  "flags": ["<any concerns>"]
}}"""

    try:
        from google.genai import types

        before_resized = _resize_image(before_image_bytes)
        after_resized = _resize_image(after_image_bytes)

        parts = [
            "BEFORE IMAGE (Original Issue):",
            types.Part.from_bytes(data=before_resized, mime_type="image/jpeg"),
            "AFTER IMAGE (Claimed Resolution):",
            types.Part.from_bytes(data=after_resized, mime_type="image/jpeg"),
            prompt,
        ]

        response = _call_gemini(client, parts)
        return _parse_json(response.text)

    except Exception as e:
        print(f"Before/after comparison error: {e}")
        return {
            "result": "needs_review",
            "confidence": 0.0,
            "is_resolved": None,
            "analysis": "AI verification error. Manual review required.",
            "before_observations": [],
            "after_observations": [],
            "resolution_quality": "unknown",
            "flags": ["AI verification failed"],
        }


async def generate_ai_insights(issues_data: list) -> list:
    """Generate AI insights for analytics dashboard."""
    client = _get_client()
    if not client or not issues_data:
        return []

    try:
        summary = json.dumps(issues_data[:50], default=str)
        prompt = f"""Analyze this civic issue data and provide 3-5 actionable insights.

DATA: {summary}

Respond with JSON array (no markdown):
[
  {{
    "insight": "<specific insight>",
    "category": "<pattern|trend|hotspot|recommendation>",
    "priority": "<low|medium|high>",
    "action": "<recommended action>"
  }}
]"""

        response = _call_gemini(client, [prompt])
        text = response.text.strip()
        if "```" in text:
            start = text.find("[")
            end = text.rfind("]") + 1
            text = text[start:end]
        return json.loads(text)
    except Exception:
        return []
