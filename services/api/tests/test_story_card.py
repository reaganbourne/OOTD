"""Tests for GET /outfits/{outfit_id}/story-card."""

import io
import uuid

REGISTER_URL = "/auth/register"
CREATE_OUTFIT_URL = "/outfits"
STORY_CARD_URL = "/outfits/{outfit_id}/story-card"

USER_A = {"username": "usera", "email": "a@example.com", "password": "password123"}


def _register(client, payload):
    res = client.post(REGISTER_URL, json=payload)
    assert res.status_code == 201
    return res.json()


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _post_outfit(client, token, caption="test outfit"):
    fake_image = io.BytesIO(b"fake-image-data")
    return client.post(
        CREATE_OUTFIT_URL,
        headers=_auth(token),
        files={"image": ("test.jpg", fake_image, "image/jpeg")},
        data={"metadata": f'{{"caption": "{caption}"}}'},
    )


def _fake_fetch(url: str) -> bytes:
    """Returns a tiny but valid JPEG so Pillow can open it."""
    # 1×1 white JPEG
    img_buf = io.BytesIO()
    from PIL import Image
    Image.new("RGB", (1, 1), (255, 255, 255)).save(img_buf, format="JPEG")
    return img_buf.getvalue()


class TestStoryCard:
    def test_returns_png_for_existing_outfit(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/test.jpg")
        monkeypatch.setattr("app.routers.outfits.run_vibe_check", lambda **kw: ("Cool fit!", "casual"))
        monkeypatch.setattr("app.routers.outfits.fetch_image", _fake_fetch)

        a = _register(client, USER_A)
        outfit_res = _post_outfit(client, a["access_token"], "brunch fit")
        outfit_id = outfit_res.json()["id"]

        res = client.get(STORY_CARD_URL.format(outfit_id=outfit_id))
        assert res.status_code == 200
        assert res.headers["content-type"] == "image/png"
        # PNG files start with the PNG signature bytes
        assert res.content[:4] == b"\x89PNG"

    def test_no_auth_required(self, client, monkeypatch):
        """Story card endpoint is public — no token needed."""
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/test.jpg")
        monkeypatch.setattr("app.routers.outfits.run_vibe_check", lambda **kw: (None, None))
        monkeypatch.setattr("app.routers.outfits.fetch_image", _fake_fetch)

        a = _register(client, USER_A)
        outfit_res = _post_outfit(client, a["access_token"])
        outfit_id = outfit_res.json()["id"]

        # No auth header
        res = client.get(STORY_CARD_URL.format(outfit_id=outfit_id))
        assert res.status_code == 200

    def test_unknown_outfit_returns_404(self, client):
        res = client.get(STORY_CARD_URL.format(outfit_id=str(uuid.uuid4())))
        assert res.status_code == 404

    def test_invalid_uuid_returns_404(self, client):
        res = client.get(STORY_CARD_URL.format(outfit_id="not-a-uuid"))
        assert res.status_code == 404

    def test_card_still_generated_when_image_fetch_fails(self, client, monkeypatch):
        """If the S3 image can't be fetched, card is still returned (dark bg)."""
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/test.jpg")
        monkeypatch.setattr("app.routers.outfits.run_vibe_check", lambda **kw: ("Great fit!", "streetwear"))
        monkeypatch.setattr("app.routers.outfits.fetch_image", lambda url: (_ for _ in ()).throw(Exception("network error")))

        a = _register(client, USER_A)
        outfit_res = _post_outfit(client, a["access_token"], "risky fit")
        outfit_id = outfit_res.json()["id"]

        res = client.get(STORY_CARD_URL.format(outfit_id=outfit_id))
        assert res.status_code == 200
        assert res.content[:4] == b"\x89PNG"

    def test_content_disposition_header(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/test.jpg")
        monkeypatch.setattr("app.routers.outfits.run_vibe_check", lambda **kw: (None, None))
        monkeypatch.setattr("app.routers.outfits.fetch_image", _fake_fetch)

        a = _register(client, USER_A)
        outfit_res = _post_outfit(client, a["access_token"])
        outfit_id = outfit_res.json()["id"]

        res = client.get(STORY_CARD_URL.format(outfit_id=outfit_id))
        assert "content-disposition" in res.headers
        assert "ootd-" in res.headers["content-disposition"]
