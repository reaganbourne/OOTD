"""
Image storage adapter.

In production (S3_BUCKET is set): uploads go to S3, returns public HTTPS URL.
In development (S3_BUCKET is empty): saves to LOCAL_UPLOADS_DIR, returns a
localhost URL served by FastAPI's StaticFiles mount.

Single responsibility: take raw bytes + metadata, persist them, return a URL.
Everything storage-specific is contained here so the rest of the app never
imports boto3 or filesystem ops directly.

Usage:
    from app.services.storage import upload_image

    url = upload_image(
        file_bytes=await file.read(),
        content_type=file.content_type,
        user_id=current_user.id,
    )
"""

import uuid
from pathlib import Path

from app.config import settings

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
    """Raised for bad content-type or oversized files — routers return 422."""


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
        InvalidImageError: File type not allowed or file too large.
        StorageError:      Upload call failed.
    """
    _validate(file_bytes, content_type)

    ext = _ALLOWED[content_type]
    key = f"{key_prefix}/{user_id}/{uuid.uuid4()}.{ext}"

    if _use_s3():
        return _upload_s3(file_bytes, content_type, key)
    else:
        return _upload_local(file_bytes, key)


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
