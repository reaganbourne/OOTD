"""
Tests for server-side file validation on outfit upload.

Validation lives inside storage.upload_image() via storage._validate():
- content_type must be an allowed image MIME
- file must be <= 10 MB
- file must be decodable as an image (Pillow), except HEIC

IMPORTANT: rejection tests must NOT mock upload_image, otherwise the real
validation is bypassed. Rejections are raised by _validate() before any
storage write happens, so these tests never touch S3 / local disk.
"""

import io

import pytest

REGISTER_URL = "/auth/register"
CREATE_OUTFIT_URL = "/outfits"

USER = {"username": "fv_user", "email": "fv@example.com", "password": "password123456"}


def _register(client, user=USER):
    res = client.post(REGISTER_URL, json=user)
    assert res.status_code == 201, res.json()
    return res.json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _post_outfit(client, token, *, filename="fit.jpg", content_type="image/jpeg", data=b"fake"):
    return client.post(
        CREATE_OUTFIT_URL,
        headers=_auth(token),
        files={"image": (filename, io.BytesIO(data), content_type)},
        data={"metadata": '{"caption": "test"}'},
    )


def _valid_image_bytes(fmt: str) -> bytes:
    """Generate a real, decodable 1x1 image in the given Pillow format."""
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (1, 1), color=(200, 100, 50)).save(buf, format=fmt)
    return buf.getvalue()


# ── MIME type validation (real validation, no upload mock) ────────────────────

class TestMimeValidation:
    def test_pdf_rejected_422(self, client):
        token = _register(client)
        res = _post_outfit(client, token, content_type="application/pdf", data=b"%PDF-1.4 fake")
        assert res.status_code == 422
        assert "Unsupported file type" in res.json()["detail"]

    def test_text_rejected_422(self, client):
        token = _register(client)
        res = _post_outfit(client, token, content_type="text/plain", data=b"not an image")
        assert res.status_code == 422


# ── File size validation ──────────────────────────────────────────────────────

class TestFileSizeValidation:
    def test_oversized_file_rejected_422(self, client):
        token = _register(client)
        big_file = b"x" * (11 * 1024 * 1024)  # 11 MB — over the 10 MB limit
        res = _post_outfit(client, token, data=big_file)
        assert res.status_code == 422
        assert "too large" in res.json()["detail"].lower()


# ── Corrupt image decodability (Pillow) ───────────────────────────────────────

class TestDecodability:
    def test_corrupt_jpeg_rejected(self, client):
        """Non-image bytes declared as image/jpeg should be rejected by Pillow."""
        pytest.importorskip("PIL")
        token = _register(client)
        res = _post_outfit(client, token, content_type="image/jpeg", data=b"definitely not a jpeg")
        assert res.status_code == 422
        assert "could not be read" in res.json()["detail"].lower()


# ── Acceptance: valid images pass and reach outfit creation ───────────────────

class TestValidUploads:
    def test_valid_jpeg_accepted(self, client, monkeypatch):
        pytest.importorskip("PIL")
        monkeypatch.setattr("app.routers.outfits.run_vibe_check", lambda **kw: (None, None))
        token = _register(client)
        res = _post_outfit(client, token, content_type="image/jpeg", data=_valid_image_bytes("JPEG"))
        assert res.status_code == 201

    def test_valid_png_accepted(self, client, monkeypatch):
        pytest.importorskip("PIL")
        monkeypatch.setattr("app.routers.outfits.run_vibe_check", lambda **kw: (None, None))
        token = _register(client)
        res = _post_outfit(client, token, filename="fit.png", content_type="image/png", data=_valid_image_bytes("PNG"))
        assert res.status_code == 201

    def test_valid_webp_accepted(self, client, monkeypatch):
        pytest.importorskip("PIL")
        monkeypatch.setattr("app.routers.outfits.run_vibe_check", lambda **kw: (None, None))
        token = _register(client)
        res = _post_outfit(client, token, filename="fit.webp", content_type="image/webp", data=_valid_image_bytes("WEBP"))
        assert res.status_code == 201


# ── Unit tests on the storage validator directly ──────────────────────────────

class TestStorageValidator:
    def test_validate_rejects_bad_mime(self):
        from app.services.storage import InvalidImageError, _validate
        with pytest.raises(InvalidImageError):
            _validate(b"data", "application/pdf")

    def test_validate_rejects_oversized(self):
        from app.services.storage import InvalidImageError, MAX_BYTES, _validate
        with pytest.raises(InvalidImageError):
            _validate(b"x" * (MAX_BYTES + 1), "image/jpeg")

    def test_validate_accepts_valid_jpeg(self):
        pytest.importorskip("PIL")
        from app.services.storage import _validate
        # Should not raise
        _validate(_valid_image_bytes("JPEG"), "image/jpeg")

    def test_validate_skips_decodability_for_heic(self):
        """HEIC isn't decodable by default Pillow — validator must skip the
        decodability check for it (size/mime still enforced)."""
        from app.services.storage import _validate
        # Non-decodable bytes but valid HEIC mime + under size limit → no raise
        _validate(b"fake-heic-bytes", "image/heic")
