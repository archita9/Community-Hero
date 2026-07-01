"""
Storage service for Google Cloud Storage uploads with local fallback.
"""
import os
import uuid
import aiofiles
from pathlib import Path
from typing import Optional
from app.core.config import settings

# Local storage fallback directory
LOCAL_STORAGE_DIR = Path("./uploads")
LOCAL_STORAGE_DIR.mkdir(exist_ok=True)


async def upload_file(
    file_bytes: bytes,
    filename: str,
    content_type: str = "image/jpeg",
    folder: str = "issues",
) -> str:
    """
    Upload file to GCS or local storage.
    Returns public URL.
    """
    # Try GCS first
    if settings.GCS_BUCKET_NAME and settings.GCS_PROJECT_ID:
        try:
            return await _upload_to_gcs(file_bytes, filename, content_type, folder)
        except Exception as e:
            print(f"GCS upload failed, using local: {e}")

    # Fallback: local storage
    return await _upload_locally(file_bytes, filename, folder)


async def _upload_to_gcs(
    file_bytes: bytes,
    filename: str,
    content_type: str,
    folder: str,
) -> str:
    from google.cloud import storage as gcs

    client = gcs.Client(project=settings.GCS_PROJECT_ID)
    bucket = client.bucket(settings.GCS_BUCKET_NAME)

    unique_name = f"{folder}/{uuid.uuid4().hex}_{filename}"
    blob = bucket.blob(unique_name)
    blob.upload_from_string(file_bytes, content_type=content_type)
    blob.make_public()

    return blob.public_url


async def _upload_locally(file_bytes: bytes, filename: str, folder: str) -> str:
    """Store file locally and return a relative URL path."""
    folder_path = LOCAL_STORAGE_DIR / folder
    folder_path.mkdir(parents=True, exist_ok=True)

    unique_name = f"{uuid.uuid4().hex}_{filename}"
    file_path = folder_path / unique_name

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(file_bytes)

    # Return relative URL served by FastAPI static files
    return f"/uploads/{folder}/{unique_name}"


async def compress_image(image_bytes: bytes, max_size: int = 800, quality: int = 85) -> bytes:
    """Compress image to reduce storage size."""
    try:
        import PIL.Image
        import io

        image = PIL.Image.open(io.BytesIO(image_bytes))

        # Convert RGBA to RGB if necessary
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")

        # Resize if too large
        if max(image.size) > max_size:
            image.thumbnail((max_size, max_size), PIL.Image.Resampling.LANCZOS)

        output = io.BytesIO()
        image.save(output, format="JPEG", quality=quality, optimize=True)
        return output.getvalue()
    except Exception:
        return image_bytes


async def generate_qr_code(issue_id: str, base_url: str) -> bytes:
    """Generate QR code for an issue."""
    import qrcode
    import io

    url = f"{base_url}/issues/{issue_id}"
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()
