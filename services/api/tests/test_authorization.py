"""
Authorization tests — verify that authenticated endpoints are properly protected
and that users cannot read, edit, or delete other users' private resources.

Covers P0.3: Audit protected API authorization.
"""

import io

import pytest

REGISTER_URL = "/auth/register"

USER_A = {"username": "auth_a", "email": "auth_a@example.com", "password": "password123456"}
USER_B = {"username": "auth_b", "email": "auth_b@example.com", "password": "password123456"}


def _register(client, user):
    res = client.post(REGISTER_URL, json=user)
    assert res.status_code == 201, res.json()
    return res.json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _create_outfit(client, token, monkeypatch):
    monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/a.jpg")
    monkeypatch.setattr("app.routers.outfits.run_vibe_check", lambda **kw: (None, None))
    res = client.post(
        "/outfits",
        headers=_auth(token),
        files={"image": ("fit.jpg", io.BytesIO(b"fake"), "image/jpeg")},
        data={"metadata": '{"caption": "my outfit"}'},
    )
    assert res.status_code == 201, res.json()
    return res.json()["id"]


# ── Unauthenticated access ────────────────────────────────────────────────────

class TestUnauthenticated:
    def test_feed_requires_auth(self, client):
        res = client.get("/outfits/feed")
        assert res.status_code == 401

    def test_explore_is_public(self, client):
        # Explore is intentionally public (no auth) — the frontend redirects
        # unauthenticated users, but the endpoint itself serves anonymous reads.
        res = client.get("/outfits/explore")
        assert res.status_code == 200

    def test_vault_requires_auth(self, client):
        res = client.get("/outfits/me")
        assert res.status_code == 401

    def test_create_outfit_requires_auth(self, client):
        res = client.post(
            "/outfits",
            files={"image": ("fit.jpg", io.BytesIO(b"fake"), "image/jpeg")},
            data={"metadata": "{}"},
        )
        assert res.status_code == 401

    def test_profile_update_requires_auth(self, client):
        res = client.patch("/users/me", json={"display_name": "hacker"})
        assert res.status_code == 401

    def test_follow_requires_auth(self, client):
        _register(client, USER_A)
        res = client.post("/users/auth_a/follow")
        assert res.status_code == 401

    def test_admin_delete_outfit_requires_auth(self, client):
        import uuid
        res = client.delete(f"/admin/outfits/{uuid.uuid4()}")
        assert res.status_code == 401


# ── Cross-user outfit mutations ───────────────────────────────────────────────

class TestCrossUserOutfitAccess:
    def test_user_cannot_delete_others_outfit(self, client, monkeypatch):
        token_a = _register(client, USER_A)
        token_b = _register(client, USER_B)
        outfit_id = _create_outfit(client, token_a, monkeypatch)

        # User B tries to delete User A's outfit
        res = client.delete(f"/outfits/{outfit_id}", headers=_auth(token_b))
        assert res.status_code == 403

    def test_user_can_delete_own_outfit(self, client, monkeypatch):
        token_a = _register(client, USER_A)
        outfit_id = _create_outfit(client, token_a, monkeypatch)
        monkeypatch.setattr("app.routers.outfits.delete_image", lambda url: None)

        res = client.delete(f"/outfits/{outfit_id}", headers=_auth(token_a))
        assert res.status_code == 204

    def test_deleted_outfit_not_in_vault(self, client, monkeypatch):
        token_a = _register(client, USER_A)
        outfit_id = _create_outfit(client, token_a, monkeypatch)
        monkeypatch.setattr("app.routers.outfits.delete_image", lambda url: None)

        client.delete(f"/outfits/{outfit_id}", headers=_auth(token_a))

        vault = client.get("/outfits/me", headers=_auth(token_a))
        assert vault.status_code == 200
        ids = [o["id"] for o in vault.json()["outfits"]]
        assert outfit_id not in ids

    def test_deleted_outfit_not_in_explore(self, client, monkeypatch):
        """After delete, the outfit should not appear in explore."""
        token_a = _register(client, USER_A)
        outfit_id = _create_outfit(client, token_a, monkeypatch)
        monkeypatch.setattr("app.routers.outfits.delete_image", lambda url: None)

        client.delete(f"/outfits/{outfit_id}", headers=_auth(token_a))

        # Explore paginates everything — check the outfit is gone
        res = client.get("/outfits/explore", headers=_auth(token_a))
        assert res.status_code == 200
        ids = [o["id"] for o in res.json()["outfits"]]
        assert outfit_id not in ids

    def test_deleted_outfit_detail_returns_404(self, client, monkeypatch):
        token_a = _register(client, USER_A)
        outfit_id = _create_outfit(client, token_a, monkeypatch)
        monkeypatch.setattr("app.routers.outfits.delete_image", lambda url: None)

        client.delete(f"/outfits/{outfit_id}", headers=_auth(token_a))

        res = client.get(f"/outfits/{outfit_id}", headers=_auth(token_a))
        assert res.status_code == 404

    def test_user_cannot_update_others_profile(self, client):
        """PATCH /users/me is always scoped to the token owner — no impersonation possible."""
        token_a = _register(client, USER_A)
        token_b = _register(client, USER_B)

        # User B sends a patch — it goes to their own profile, not A's
        res = client.patch("/users/me", json={"display_name": "hacker"}, headers=_auth(token_b))
        assert res.status_code == 200
        # User A's profile is unchanged
        profile_a = client.get("/users/auth_a", headers=_auth(token_a))
        assert profile_a.json()["display_name"] != "hacker"


# ── Admin route authorization ─────────────────────────────────────────────────

class TestAdminAuthorization:
    def test_non_admin_cannot_delete_outfit_via_admin(self, client, monkeypatch):
        token = _register(client, USER_A)
        outfit_id = _create_outfit(client, token, monkeypatch)

        res = client.delete(f"/admin/outfits/{outfit_id}", headers=_auth(token))
        assert res.status_code == 403

    def test_unauthenticated_cannot_access_admin(self, client):
        import uuid
        res = client.delete(f"/admin/outfits/{uuid.uuid4()}")
        assert res.status_code == 401

    def test_non_admin_cannot_delete_board_via_admin(self, client):
        token = _register(client, USER_A)
        import uuid
        res = client.delete(f"/admin/boards/{uuid.uuid4()}", headers=_auth(token))
        assert res.status_code == 403


# ── Follow/unfollow rate limit ────────────────────────────────────────────────

class TestFollowRateLimit:
    def test_follow_blocked_after_limit(self, client, monkeypatch):
        from app.services.rate_limit import FixedWindowRateLimiter
        monkeypatch.setattr("app.routers.users.follow_rate_limiter", FixedWindowRateLimiter(2, 60))

        token_a = _register(client, USER_A)
        _register(client, USER_B)

        # Set up a third user to follow
        u3 = {"username": "auth_c", "email": "auth_c@example.com", "password": "password123456"}
        _register(client, u3)

        # Two follows are allowed
        res1 = client.post("/users/auth_b/follow", headers=_auth(token_a))
        assert res1.status_code == 200
        res2 = client.post("/users/auth_c/follow", headers=_auth(token_a))
        assert res2.status_code == 200

        # Third follow is blocked
        u4 = {"username": "auth_d", "email": "auth_d@example.com", "password": "password123456"}
        _register(client, u4)
        res3 = client.post("/users/auth_d/follow", headers=_auth(token_a))
        assert res3.status_code == 429


# ── Idempotency ───────────────────────────────────────────────────────────────

class TestOutfitIdempotency:
    def test_duplicate_submission_returns_same_outfit(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/a.jpg")
        monkeypatch.setattr("app.routers.outfits.run_vibe_check", lambda **kw: (None, None))
        token = _register(client, USER_A)
        key = "test-idempotency-key-123"

        def _post():
            return client.post(
                "/outfits",
                headers={**_auth(token), "Idempotency-Key": key},
                files={"image": ("fit.jpg", io.BytesIO(b"fake"), "image/jpeg")},
                data={"metadata": "{}"},
            )

        first = _post()
        assert first.status_code == 201
        first_id = first.json()["id"]

        second = _post()
        # 200 for cached, still returns the same outfit data
        assert second.status_code in (200, 201)
        assert second.json()["id"] == first_id

    def test_different_keys_create_separate_outfits(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/a.jpg")
        monkeypatch.setattr("app.routers.outfits.run_vibe_check", lambda **kw: (None, None))
        token = _register(client, USER_A)

        def _post(key):
            return client.post(
                "/outfits",
                headers={**_auth(token), "Idempotency-Key": key},
                files={"image": ("fit.jpg", io.BytesIO(b"fake"), "image/jpeg")},
                data={"metadata": "{}"},
            )

        res1 = _post("key-one")
        res2 = _post("key-two")
        assert res1.status_code == 201
        assert res2.status_code == 201
        assert res1.json()["id"] != res2.json()["id"]
