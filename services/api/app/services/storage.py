"""
Image storage adapter.

In production (S3_BUCKET is set): uploads go to S3, returns public HTTPS URL.
In development (S3_BUCKET is empty): saves to LOCAL_UPLOADS_DIR, returns a
localhost URL served by FastAPI's StaticFiles mount.

Single responsibility: take raw bytes + metadata, persist them, return a URL.
Everything storage-specific is contained here so the rest of the app never
imports boto3 or filesystem ops directly.

Usage:
    from app.services.storage import upload_image, delete_image

    url = upload_image(
        file_bytes=await file.read(),
        content_type=file.content_type,
        user_id=current_user.id,
    )

    delete_image(url)  # best-effort; logs on failure, never raises
"""

import logging
import uuid
from pathlib import Path
from urllib.parse import urlparse

from app.config import settings

logger = logging.getLogger(__name__)

# Allowed MIME types → file extension mapping.
# Reject anything not in this list at the service layer.
_ALLOWED: dict[str, str] = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
}

# 10 MB hard limit — large enough for a decent phone photo, small enough
# to keep S3 costs and upload times sane.
MAX_BYTES = 10 * 1024 * 1024

# Local uploads directory — used when S3 is not configured (dev mode).
# FastAPI mounts this as /uploads so the URL is predictable.
LOCAL_UPLOADS_DIR = Path("/tmp/checkd-uploads")


class StorageError(Exception):
    """Raised when an upload fails so routers can return a clean 500."""


class InvalidImageError(ValueError):
    """Raised for bad content-type, oversized files, or corrupt image data — routers return 422."""


def upload_image(
    file_bytes: bytes,
    content_type: str,
    user_id: uuid.UUID,
    key_prefix: str = "outfits",
) -> str:
    """
    Upload an image and return its public URL.

    Uses S3 when S3_BUCKET is configured; falls back to local filesystem
    (dev-only) when it is not.

    Args:
        file_bytes:   Raw file content read from the multipart upload.
        content_type: MIME type declared by the client (e.g. "image/jpeg").
        user_id:      ID of the uploading user — used to namespace the key.
        key_prefix:   Key prefix / folder (default "outfits").

    Returns:
        The public URL of the uploaded object.

    Raises:
        InvalidImageError: File type not allowed, file too large, or corrupt image.
        StorageError:      Upload call failed.
    """
    _validate(file_bytes, content_type)

    ext = _ALLOWED[content_type]
    key = f"{key_prefix}/{user_id}/{uuid.uuid4()}.{ext}"

    if _use_s3():
        return _upload_s3(file_bytes, content_type, key)
    else:
        return _upload_local(file_bytes, key)


def delete_image(image_url: str) -> None:
    """
    Delete a stored image by its public URL.

    Best-effort: logs a warning on failure but never raises, so callers
    (outfit delete) always succeed even if CDN cleanup fails.

    Works for both S3 and local-dev URLs.
    """
    if not image_url:
        return

    try:
        if _use_s3():
            _delete_s3(image_url)
        else:
            _delete_local(image_url)
    except Exception:
        logger.warning("Failed to delete image %s — orphan may remain in storage", image_url, exc_info=True)


# ------------------------------------------------------------------ internals


def _use_s3() -> bool:
    return bool(settings.s3_bucket)


def _validate(file_bytes: bytes, content_type: str) -> None:
    if content_type not in _ALLOWED:
        raise InvalidImageError(
            f"Unsupported file type '{content_type}'. "
            f"Allowed: {', '.join(_ALLOWED)}."
        )
    if len(file_bytes) > MAX_BYTES:
        mb = len(file_bytes) / 1024 / 1024
        raise InvalidImageError(f"File too large ({mb:.1f} MB). Maximum is 10 MB.")

    # Validate image is decodable (catches renamed non-images and corrupt files).
    # HEIC files are not supported by Pillow's default decoders; we skip the
    # decodability check for them since they go through S3/CDN processing anyway.
    if content_type != "image/heic":
        _assert_decodable(file_bytes, content_type)


def _assert_decodable(file_bytes: bytes, content_type: str) -> None:
    """Attempt to open and verify the image bytes with Pillow.

    Raises InvalidImageError if Pillow cannot read the file.
    If Pillow is not installed, this check is skipped (dev environments
    may not have it; production always will).
    """
    try:
        from PIL import Image, UnidentifiedImageError  # type: ignore[import]
    except ImportError:
        return  # Pillow not available — skip decodability check

    try:
        import io
        with Image.open(io.BytesIO(file_bytes)) as img:
            img.verify()
    except (UnidentifiedImageError, Exception) as exc:
        raise InvalidImageError(
            "The uploaded file could not be read as an image. "
            "Please upload a valid JPEG, PNG, or WebP."
        ) from exc


def _upload_s3(file_bytes: bytes, content_type: str, key: str) -> str:
    try:
        import boto3
        from botocore.exceptions import BotoCoreError, ClientError
    except ImportError as exc:
        raise StorageError("boto3 is not installed") from exc

    try:
        client = boto3.client(
            "s3",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id or None,
            aws_secret_access_key=settings.aws_secret_access_key or None,
        )
        client.put_object(
            Bucket=settings.s3_bucket,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
    except (BotoCoreError, ClientError) as exc:  # type: ignore[misc]
        raise StorageError(f"S3 upload failed: {exc}") from exc

    return f"https://{settings.s3_bucket}.s3.{settings.aws_region}.amazonaws.com/{key}"


def _delete_s3(image_url: str) -> None:
    """Extract the S3 key from the URL and delete the object."""
    try:
        import boto3
        from botocore.exceptions import BotoCoreError, ClientError
    except ImportError as exc:
        raise StorageError("boto3 is not installed") from exc

    parsed = urlparse(image_url)
    # Path is like /outfits/{user_id}/{uuid}.jpg — strip leading slash for S3 key
    key = parsed.path.lstrip("/")
    if not key:
        logger.warning("Could not extract S3 key from URL: %s", image_url)
        return

    try:
        client = boto3.client(
            "s3",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id or None,
            aws_secret_access_key=settings.aws_secret_access_key or None,
        )
        client.delete_object(Bucket=settings.s3_bucket, Key=key)
    except (BotoCoreError, ClientError) as exc:  # type: ignore[misc]
        raise StorageError(f"S3 delete failed: {exc}") from exc


def _delete_local(image_url: str) -> None:
    """Remove a locally stored file by reconstructing its path from the URL."""
    parsed = urlparse(image_url)
    # URL is like http://localhost:8000/uploads/outfits/{uid}/{uuid}.jpg
    # Strip /uploads/ prefix to get the key, then join with LOCAL_UPLOADS_DIR
    path_parts = parsed.path.lstrip("/").split("/", 1)  # ["uploads", "outfits/..."]
    if len(path_parts) < 2:
        return
    key = path_parts[1]  # "outfits/{uid}/{uuid}.jpg"
    dest = LOCAL_UPLOADS_DIR / key
    try:
        dest.unlink(missing_ok=True)
    except OSError:
        pass  # best-effort


def _upload_local(file_bytes: bytes, key: str) -> str:
    """Save to LOCAL_UPLOADS_DIR and return a localhost URL.

    The API is always at localhost:8000 in dev (S3 is never empty in prod),
    so hardcoding the port here is safe and keeps things simple.
    """
    dest = LOCAL_UPLOADS_DIR / key
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(file_bytes)

    # FastAPI serves LOCAL_UPLOADS_DIR at /uploads via StaticFiles.
    api_base = getattr(settings, "api_local_base_url", "http://localhost:8000")
    return f"{api_base}/uploads/{key}"
