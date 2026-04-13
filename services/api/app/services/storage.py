"""
S3 image storage adapter.

Single responsibility: take raw bytes + metadata, put them in S3,
return the public HTTPS URL. Everything S3-specific is contained here
so the rest of the app never imports boto3 directly.

Usage:
    from app.services.storage import upload_image

    url = upload_image(
        file_bytes=await file.read(),
        content_type=file.content_type,
        user_id=current_user.id,
    )
"""

import uuid

import boto3
from botocore.exceptions import BotoCoreError, ClientError

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


class StorageError(Exception):
    """Raised when an upload fails so routers can return a clean 500."""


class InvalidImageError(ValueError):
    """Raised for bad content-type or oversized files — routers return 422."""


def upload_image(
    file_bytes: bytes,
    content_type: str,
    user_id: uuid.UUID,
) -> str:
    """
    Upload an image to S3 and return its public URL.

    Args:
        file_bytes:   Raw file content read from the multipart upload.
        content_type: MIME type declared by the client (e.g. "image/jpeg").
        user_id:      ID of the uploading user — used to namespace the S3 key.

    Returns:
        The public HTTPS URL of the uploaded object.

    Raises:
        InvalidImageError: File type not allowed or file too large.
        StorageError:      S3 call failed (network, permissions, etc.).
    """
    _validate(file_bytes, content_type)

    ext = _ALLOWED[content_type]
    key = f"outfits/{user_id}/{uuid.uuid4()}.{ext}"

    try:
        client = _s3_client()
        client.put_object(
            Bucket=settings.s3_bucket,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
    except (BotoCoreError, ClientError) as exc:
        raise StorageError(f"S3 upload failed: {exc}") from exc

    return _public_url(key)


# ------------------------------------------------------------------ internals


def _validate(file_bytes: bytes, content_type: str) -> None:
    if content_type not in _ALLOWED:
        raise InvalidImageError(
            f"Unsupported file type '{content_type}'. "
            f"Allowed: {', '.join(_ALLOWED)}."
        )
    if len(file_bytes) > MAX_BYTES:
        mb = len(file_bytes) / 1024 / 1024
        raise InvalidImageError(f"File too large ({mb:.1f} MB). Maximum is 10 MB.")


def _s3_client():
    return boto3.client(
        "s3",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id or None,
        aws_secret_access_key=settings.aws_secret_access_key or None,
    )


def _public_url(key: str) -> str:
    return f"https://{settings.s3_bucket}.s3.{settings.aws_region}.amazonaws.com/{key}"
