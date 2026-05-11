"""Tests for vibe check on outfit creation."""

import io

REGISTER_URL = "/auth/register"
CREATE_OUTFIT_URL = "/outfits"

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


class TestVibeCheck:
    def test_vibe_check_populated_when_service_returns_values(self, client, monkeypatch):
        """Outfit response includes vibe_check fields when Claude returns them."""
        monkeypatch.setattr(
            "app.routers.outfits.upload_image",
            lambda **kw: "https://s3.example.com/test.jpg",
        )
        monkeypatch.setattr(
            "app.routers.outfits.run_vibe_check",
            lambda **kw: ("Effortlessly cool with a streetwear edge.", "streetwear"),
        )

        a = _register(client, USER_A)
        res = _post_outfit(client, a["access_token"], "my fit")

        assert res.status_code == 201
        body = res.json()
        assert body["vibe_check_text"] == "Effortlessly cool with a streetwear edge."
        assert body["vibe_check_tone"] == "streetwear"

    def test_outfit_created_when_vibe_check_fails(self, client, monkeypatch):
        """Outfit is saved successfully even when Claude returns (None, None)."""
        monkeypatch.setattr(
            "app.routers.outfits.upload_image",
            lambda **kw: "https://s3.example.com/test.jpg",
        )
        monkeypatch.setattr(
            "app.routers.outfits.run_vibe_check",
            lambda **kw: (None, None),
        )

        a = _register(client, USER_A)
        res = _post_outfit(client, a["access_token"], "my fit")

        assert res.status_code == 201
        body = res.json()
        assert body["vibe_check_text"] is None
        assert body["vibe_check_tone"] is None

    def test_vibe_check_receives_caption(self, client, monkeypatch):
        """Caption is forwarded to the vibe check service."""
        monkeypatch.setattr(
            "app.routers.outfits.upload_image",
            lambda **kw: "https://s3.example.com/test.jpg",
        )

        received = {}

        def fake_vibe_check(file_bytes, content_type, caption=None):
            received["caption"] = caption
            return ("Great look!", "casual")

        monkeypatch.setattr("app.routers.outfits.run_vibe_check", fake_vibe_check)

        a = _register(client, USER_A)
        _post_outfit(client, a["access_token"], "Sunday brunch fit")

        assert received["caption"] == "Sunday brunch fit"

    def test_vibe_check_skipped_when_no_api_key(self, client, monkeypatch):
        """run_vibe_check returns (None, None) when ANTHROPIC_API_KEY is empty."""
        from app.services import vibe_check as vc_module

        monkeypatch.setattr(
            "app.routers.outfits.upload_image",
            lambda **kw: "https://s3.example.com/test.jpg",
        )
        # Patch settings on the vibe_check module directly
        monkeypatch.setattr(vc_module.settings, "anthropic_api_key", "")

        a = _register(client, USER_A)
        res = _post_outfit(client, a["access_token"], "no key fit")

        assert res.status_code == 201
        assert res.json()["vibe_check_text"] is None
        assert res.json()["vibe_check_tone"] is None
