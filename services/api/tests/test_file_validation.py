"""
Tests for server-side file validation on outfit upload.

Covers:
- Invalid MIME type (returns 422)
- Oversized file (returns 422)
- Corrupt/non-image bytes (returns 422 when Pillow is available)
- Valid image types succeed (with storage+vibe mocked out)
"""

import io
import struct

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


def _post_outfit(client, token, *, content_type="image/jpeg", data=b"fake"):
    return client.post(
        CREATE_OUTFIT_URL,
        headers=_auth(token),
        files={"image": ("fit.jpg", io.BytesIO(data), content_type)},
        data={"metadata": '{"caption": "test"}'},
    )


# ── MIME type validation ──────────────────────────────────────────────────────

class TestMimeValidation:
    def test_pdf_rejected_422(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/a.jpg")
        monkeypatch.setattr("app.routers.outfits.run_vibe_check", lambda **kw: (None, None))
        token = _register(client)
        res = _post_outfit(client, token, content_type="application/pdf")
        assert res.status_code == 422
        assert "Unsupported file type" in res.json()["detail"]

    def test_text_rejected_422(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/a.jpg")
        monkeypatch.setattr("app.routers.outfits.run_vibe_check", lambda **kw: (None, None))
        token = _register(client)
        res = _post_outfit(client, token, content_type="text/plain", data=b"not an image")
        assert res.status_code == 422

    def test_jpeg_accepted(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/a.jpg")
        monkeypatch.setattr("app.routers.outfits.run_vibe_check", lambda **kw: (None, None))
        token = _register(client)
        # storage.upload_image is mocked so actual bytes don't matter
        res = _post_outfit(client, token, content_type="image/jpeg", data=b"fake-jpeg")
        assert res.status_code == 201

    def test_png_accepted(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/a.jpg")
        monkeypatch.setattr("app.routers.outfits.run_vibe_check", lambda **kw: (None, None))
        token = _register(client)
        res = _post_outfit(client, token, content_type="image/png", data=b"fake-png")
        assert res.status_code == 201

    def test_webp_accepted(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/a.jpg")
        monkeypatch.setattr("app.routers.outfits.run_vibe_check", lambda **kw: (None, None))
        token = _register(client)
        res = _post_outfit(client, token, content_type="image/webp", data=b"fake-webp")
        assert res.status_code == 201


# ── File size validation ──────────────────────────────────────────────────────

class TestFileSizeValidation:
    def test_oversized_file_rejected_422(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/a.jpg")
        monkeypatch.setattr("app.routers.outfits.run_vibe_check", lambda **kw: (None, None))
        token = _register(client)
        big_file = b"x" * (11 * 1024 * 1024)  # 11 MB — over the 10 MB limit
        res = _post_outfit(client, token, data=big_file)
        assert res.status_code == 422
        assert "too large" in res.json()["detail"].lower()

    def test_10mb_boundary_accepted(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/a.jpg")
        monkeypatch.setattr("app.routers.outfits.run_vibe_check", lambda **kw: (None, None))
        token = _register(client)
        # Exactly at the limit — should be accepted
        exactly_10mb = b"x" * (10 * 1024 * 1024)
        res = _post_outfit(client, token, data=exactly_10mb)
        assert res.status_code == 201


# ── Corrupt image decodability (Pillow) ───────────────────────────────────────

class TestDecodability:
    def test_corrupt_jpeg_rejected_when_pillow_available(self, client, monkeypatch):
        """
        Non-image bytes declared as image/jpeg should be rejected when Pillow
        is installed. If Pillow isn't available the check is skipped and the
        test is automatically skipped.
        """
        try:
            from PIL import Image  # noqa: F401
        except ImportError:
            pytest.skip("Pillow not installed — decodability check inactive")

        token = _register(client)
        # These bytes have the right MIME type but are obviously not a JPEG
        res = _post_outfit(client, token, content_type="image/jpeg", data=b"definitely not a jpeg")
        assert res.status_code == 422
        assert "could not be read" in res.json()["detail"].lower()

    def test_valid_jpeg_bytes_accepted(self, client, monkeypatch):
        """Minimal valid JPEG (SOI + EOI markers) passes decodability check."""
        try:
            from PIL import Image  # noqa: F401
        except ImportError:
            pytest.skip("Pillow not installed")

        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/a.jpg")
        monkeypatch.setattr("app.routers.outfits.run_vibe_check", lambda **kw: (None, None))
        token = _register(client)

        # Create a tiny but valid 1x1 JPEG
        buf = io.BytesIO()
        import PIL.Image as PILImage
        img = PILImage.new("RGB", (1, 1), color=(255, 0, 0))
        img.save(buf, format="JPEG")
        jpeg_bytes = buf.getvalue()

        res = _post_outfit(client, token, content_type="image/jpeg", data=jpeg_bytes)
        assert res.status_code == 201
