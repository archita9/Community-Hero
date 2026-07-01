"""
Fake report detection: EXIF analysis + Gemini Vision AI check.
Detects AI-generated images, screenshots, memes, edited photos.
"""
import io
import json
import base64
from typing import Optional


def analyze_exif(image_bytes: bytes) -> dict:
    """Analyze image EXIF metadata for authenticity signals."""
    try:
        import PIL.Image
        import PIL.ExifTags

        image = PIL.Image.open(io.BytesIO(image_bytes))
        exif_data = image._getexif()

        signals = {
            "has_exif": exif_data is not None,
            "has_gps": False,
            "has_timestamp": False,
            "camera_make": None,
            "camera_model": None,
            "software": None,
            "image_format": image.format,
            "image_mode": image.mode,
        }

        if exif_data:
            tags = {PIL.ExifTags.TAGS.get(k, k): v for k, v in exif_data.items()}
            signals["has_gps"] = "GPSInfo" in tags
            signals["has_timestamp"] = "DateTimeOriginal" in tags or "DateTime" in tags
            signals["camera_make"] = str(tags.get("Make", ""))[:50]
            signals["camera_model"] = str(tags.get("Model", ""))[:50]
            signals["software"] = str(tags.get("Software", ""))[:100]

        return signals
    except Exception:
        return {"has_exif": False, "has_gps": False, "has_timestamp": False,
                "camera_make": None, "camera_model": None, "software": None,
                "image_format": None, "image_mode": None}


async def detect_fake_report(image_bytes: bytes, description: str = "") -> dict:
    """
    Comprehensive fake report detection.
    Returns: {is_fake, confidence, reason, flags}
    """
    flags = []
    fake_score = 0.0

    # 1. EXIF Analysis
    exif = analyze_exif(image_bytes)

    # Suspicious signals
    software = (exif.get("software") or "").lower()
    if any(kw in software for kw in ["photoshop", "gimp", "canva", "paint", "stable diffusion", "midjourney"]):
        flags.append(f"Edited with {software}")
        fake_score += 0.4

    if not exif.get("has_exif"):
        flags.append("No EXIF metadata (possible screenshot or AI-generated)")
        fake_score += 0.15

    # 2. Gemini Vision AI check
    try:
        import google.generativeai as genai
        from app.core.config import settings

        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-1.5-flash")

            image = PIL.Image.open(io.BytesIO(image_bytes))
            image.thumbnail((512, 512))
            buf = io.BytesIO()
            image.save(buf, format="JPEG", quality=80)
            buf.seek(0)

            import PIL.Image
            prompt = """Analyze this image for authenticity as a civic issue report.

Respond ONLY with JSON:
{
  "is_real_photo": <true|false>,
  "is_screenshot": <true|false>,
  "is_ai_generated": <true|false>,
  "is_meme_or_graphic": <true|false>,
  "has_civic_issue": <true|false>,
  "authenticity_score": <0.0 to 1.0>,
  "flags": ["<flag1>", "<flag2>"],
  "reason": "<brief explanation>"
}"""

            response = model.generate_content([
                {"mime_type": "image/jpeg", "data": base64.b64encode(buf.read()).decode()},
                prompt
            ])
            text = response.text.strip()
            if text.startswith("```"):
                text = text[text.find("{"):text.rfind("}") + 1]

            ai_result = json.loads(text)

            if ai_result.get("is_ai_generated"):
                flags.append("AI-generated image detected")
                fake_score += 0.5
            if ai_result.get("is_screenshot"):
                flags.append("Screenshot detected (not a real photo)")
                fake_score += 0.4
            if ai_result.get("is_meme_or_graphic"):
                flags.append("Meme or graphic detected")
                fake_score += 0.5
            if not ai_result.get("has_civic_issue"):
                flags.append("Image does not appear to show a civic issue")
                fake_score += 0.3

            flags.extend(ai_result.get("flags", []))

    except Exception as e:
        flags.append(f"AI verification skipped: {str(e)[:50]}")

    # Normalize score
    fake_score = min(1.0, fake_score)
    is_fake = fake_score >= 0.6

    return {
        "is_fake": is_fake,
        "fake_confidence": round(fake_score, 2),
        "flags": flags,
        "exif": exif,
        "recommendation": "Flag for manual review" if is_fake else "Appears authentic",
    }
