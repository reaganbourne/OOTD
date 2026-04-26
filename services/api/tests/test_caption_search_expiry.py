"""Tests for caption suggestion (#80), vault search (#56), and board expiry (#47)."""

import io
from datetime import datetime, timedelta, timezone

import pytest

REGISTER_URL = "/auth/register"

USER_A = {"username": "cse_a", "email": "cse_a@example.com", "password": "password123"}
USER_B = {"username": "cse_b", "email": "cse_b@example.com", "password": "password123"}


def _register(client, payload):
    res = client.post(REGISTER_URL, json=payload)
    assert res.status_code == 201
    return res.json()


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _post_outfit(client, token, caption="my fit", clothing_items=None):
    meta = {"caption": caption}
    if clothing_items:
        meta["clothing_items"] = clothing_items
    fake_image = io.BytesIO(b"fake-image-data")
    res = client.post(
        "/outfits",
        headers=_auth(token),
        files={"image": ("test.jpg", fake_image, "image/jpeg")},
        data={"metadata": str(meta).replace("'", '"')},
    )
    assert res.status_code == 201
    return res.json()


def _create_board(client, token, name="Test Board", event_date=None):
    body = {"name": name}
    if event_date:
        body["event_date"] = event_date
    res = client.post("/boards", json=body, headers=_auth(token))
    assert res.status_code == 201
    return res.json()


# ── Caption Suggestion (#80) ──────────────────────────────────────────────────

class TestCaptionSuggestion:
    def test_caption_suggestion_requires_auth(self, client):
        fake_image = io.BytesIO(b"fake-image-data")
        res = client.post(
            "/outfits/caption-suggestion",
            files={"image": ("test.jpg", fake_image, "image/jpeg")},
        )
        assert res.status_code == 401

    def test_caption_suggestion_returns_list(self, client, monkeypatch):
        """When AI is unavailable (no API key in test env), returns empty list — never errors."""
        monkeypatch.setattr("app.services.caption.settings", type("S", (), {"anthropic_api_key": ""})())
        a = _register(client, USER_A)
        fake_image = io.BytesIO(b"fake-image-data")
        res = client.post(
            "/outfits/caption-suggestion",
            headers=_auth(a["access_token"]),
            files={"image": ("test.jpg", fake_image, "image/jpeg")},
        )
        assert res.status_code == 200
        data = res.json()
        assert "suggestions" in data
        assert isinstance(data["suggestions"], list)

    def test_caption_suggestion_mocked_response(self, client, monkeypatch):
        """Verify the endpoint correctly returns whatever the service produces."""
        monkeypatch.setattr(
            "app.routers.outfits.suggest_captions",
            lambda **kw: ["Sunday brunch fit", "Laid back and cozy", "Coffee run ready"],
        )
        a = _register(client, USER_A)
        fake_image = io.BytesIO(b"fake-image-data")
        res = client.post(
            "/outfits/caption-suggestion",
            headers=_auth(a["access_token"]),
            files={"image": ("test.jpg", fake_image, "image/jpeg")},
        )
        assert res.status_code == 200
        assert res.json()["suggestions"] == [
            "Sunday brunch fit",
            "Laid back and cozy",
            "Coffee run ready",
        ]

    def test_caption_suggestion_empty_on_ai_failure(self, client, monkeypatch):
        """Service-level failure returns empty list — upload flow is never blocked."""
        monkeypatch.setattr("app.routers.outfits.suggest_captions", lambda **kw: [])
        a = _register(client, USER_A)
        fake_image = io.BytesIO(b"fake-image-data")
        res = client.post(
            "/outfits/caption-suggestion",
            headers=_auth(a["access_token"]),
            files={"image": ("test.jpg", fake_image, "image/jpeg")},
        )
        assert res.status_code == 200
        assert res.json()["suggestions"] == []


# ── Vault Search (#56) ────────────────────────────────────────────────────────

class TestVaultSearch:
    def test_search_requires_auth(self, client):
        res = client.get("/outfits/me/search?q=zara")
        assert res.status_code == 401

    def test_search_by_caption(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        _post_outfit(client, a["access_token"], caption="brunch fit")
        _post_outfit(client, a["access_token"], caption="gym session")

        res = client.get("/outfits/me/search?q=brunch", headers=_auth(a["access_token"]))
        assert res.status_code == 200
        results = res.json()
        assert len(results) == 1
        assert results[0]["caption"] == "brunch fit"

    def test_search_case_insensitive(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        _post_outfit(client, a["access_token"], caption="Summer Vibes")

        res = client.get("/outfits/me/search?q=summer", headers=_auth(a["access_token"]))
        assert res.status_code == 200
        assert len(res.json()) == 1

    def test_search_no_results(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        _post_outfit(client, a["access_token"], caption="casual friday")

        res = client.get("/outfits/me/search?q=zara", headers=_auth(a["access_token"]))
        assert res.status_code == 200
        assert res.json() == []

    def test_search_only_own_outfits(self, client, monkeypatch):
        """User B's outfits don't show up in user A's search."""
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        _post_outfit(client, b["access_token"], caption="brunch vibes")

        res = client.get("/outfits/me/search?q=brunch", headers=_auth(a["access_token"]))
        assert res.status_code == 200
        assert res.json() == []

    def test_search_query_required(self, client):
        a = _register(client, USER_A)
        res = client.get("/outfits/me/search", headers=_auth(a["access_token"]))
        assert res.status_code == 422


# ── Board Expiry (#47) ────────────────────────────────────────────────────────

class TestBoardExpiry:
    def test_expired_board_returns_410(self, client, monkeypatch):
        """Accessing an expired board returns 410 Gone."""
        a = _register(client, USER_A)
        board = _create_board(client, a["access_token"])

        # Manually expire the board in the DB via the CRUD
        from app.crud import board as board_crud
        from app.dependencies import get_db
        from app.main import app

        db = next(app.dependency_overrides[get_db]())
        try:
            b = board_crud.get_board(db, board["id"])
            b.expires_at = datetime.now(timezone.utc) - timedelta(days=1)
            db.commit()
        finally:
            db.close()

        res = client.get(f"/boards/{board['id']}", headers=_auth(a["access_token"]))
        assert res.status_code == 410

    def test_active_board_not_expired(self, client):
        a = _register(client, USER_A)
        board = _create_board(client, a["access_token"])
        res = client.get(f"/boards/{board['id']}", headers=_auth(a["access_token"]))
        assert res.status_code == 200

    def test_admin_cleanup_disabled_without_secret(self, client):
        """Cleanup endpoint returns 503 when ADMIN_SECRET is not configured."""
        res = client.post("/boards/admin/cleanup")
        assert res.status_code == 503

    def test_admin_cleanup_rejects_wrong_secret(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.boards.settings", type("S", (), {"admin_secret": "correct-secret"})())
        res = client.post("/boards/admin/cleanup", headers={"X-Admin-Secret": "wrong-secret"})
        assert res.status_code == 403

    def test_admin_cleanup_deletes_expired_boards(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.boards.settings", type("S", (), {"admin_secret": "test-secret"})())
        a = _register(client, USER_A)
        board = _create_board(client, a["access_token"])

        # Expire the board
        from app.crud import board as board_crud
        from app.dependencies import get_db
        from app.main import app

        db = next(app.dependency_overrides[get_db]())
        try:
            b = board_crud.get_board(db, board["id"])
            b.expires_at = datetime.now(timezone.utc) - timedelta(days=1)
            db.commit()
        finally:
            db.close()

        res = client.post("/boards/admin/cleanup", headers={"X-Admin-Secret": "test-secret"})
        assert res.status_code == 200
        assert res.json()["deleted"] == 1

    def test_admin_cleanup_skips_active_boards(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.boards.settings", type("S", (), {"admin_secret": "test-secret"})())
        a = _register(client, USER_A)
        _create_board(client, a["access_token"])  # active board

        res = client.post("/boards/admin/cleanup", headers={"X-Admin-Secret": "test-secret"})
        assert res.status_code == 200
        assert res.json()["deleted"] == 0
