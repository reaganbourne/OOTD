"""Tests for rate limiting on auth, upload, caption, comment, and like endpoints."""

import io

from app.services.rate_limit import FixedWindowRateLimiter

REGISTER_URL = "/auth/register"
LOGIN_URL = "/auth/login"
CREATE_OUTFIT_URL = "/outfits"
CAPTION_URL = "/outfits/caption-suggestion"

USER_A = {"username": "rla", "email": "rla@example.com", "password": "password123456"}
USER_B = {"username": "rlb", "email": "rlb@example.com", "password": "password123456"}


def _register(client, payload):
    res = client.post(REGISTER_URL, json=payload)
    assert res.status_code == 201, res.json()
    return res.json()


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _post_outfit(client, token):
    return client.post(
        CREATE_OUTFIT_URL,
        headers=_auth(token),
        files={"image": ("fit.jpg", io.BytesIO(b"fake"), "image/jpeg")},
        data={"metadata": '{"caption": "test"}'},
    )


def _post_comment(client, token, outfit_id):
    return client.post(
        f"/outfits/{outfit_id}/comments",
        headers=_auth(token),
        json={"body": "nice fit"},
    )


def _post_like(client, token, outfit_id):
    return client.post(
        f"/outfits/{outfit_id}/likes",
        headers=_auth(token),
    )


# ── Register rate limit ───────────────────────────────────────────────────────

class TestRegisterRateLimit:
    def test_register_blocked_after_limit(self, client, monkeypatch):
        # Patch in the router namespace where the name is looked up at call time
        monkeypatch.setattr("app.routers.auth.register_rate_limiter", FixedWindowRateLimiter(2, 60))

        for i in range(2):
            res = client.post(REGISTER_URL, json={
                "username": f"user{i}", "email": f"user{i}@example.com", "password": "password123456"
            })
            assert res.status_code in (201, 409)

        res = client.post(REGISTER_URL, json={
            "username": "blocked", "email": "blocked@example.com", "password": "password123456"
        })
        assert res.status_code == 429
        assert "Retry-After" in res.headers

    def test_register_429_includes_retry_after(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.auth.register_rate_limiter", FixedWindowRateLimiter(1, 60))

        client.post(REGISTER_URL, json={"username": "user0", "email": "user0@example.com", "password": "password123456"})
        res = client.post(REGISTER_URL, json={"username": "user1", "email": "user1@example.com", "password": "password123456"})

        assert res.status_code == 429
        assert int(res.headers["Retry-After"]) > 0


# ── Login rate limit ──────────────────────────────────────────────────────────

class TestLoginRateLimit:
    def test_login_blocked_after_limit(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.auth.login_rate_limiter", FixedWindowRateLimiter(2, 60))

        _register(client, USER_A)
        for _ in range(2):
            client.post(LOGIN_URL, json={"email": USER_A["email"], "password": "wrong"})

        res = client.post(LOGIN_URL, json={"email": USER_A["email"], "password": "wrong"})
        assert res.status_code == 429


# ── Upload rate limit ─────────────────────────────────────────────────────────

class TestUploadRateLimit:
    def test_upload_blocked_after_limit(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_rate_limiter", FixedWindowRateLimiter(2, 86400))
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/a.jpg")
        monkeypatch.setattr("app.routers.outfits.run_vibe_check", lambda **kw: (None, None))

        token = _register(client, USER_A)["access_token"]
        for _ in range(2):
            assert _post_outfit(client, token).status_code == 201

        assert _post_outfit(client, token).status_code == 429

    def test_upload_limit_is_per_user(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_rate_limiter", FixedWindowRateLimiter(1, 86400))
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/a.jpg")
        monkeypatch.setattr("app.routers.outfits.run_vibe_check", lambda **kw: (None, None))

        token_a = _register(client, USER_A)["access_token"]
        token_b = _register(client, USER_B)["access_token"]

        assert _post_outfit(client, token_a).status_code == 201
        assert _post_outfit(client, token_a).status_code == 429
        # User B has a separate counter and is not blocked
        assert _post_outfit(client, token_b).status_code == 201


# ── Caption rate limit ────────────────────────────────────────────────────────

class TestCaptionRateLimit:
    def test_caption_blocked_after_limit(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.caption_rate_limiter", FixedWindowRateLimiter(2, 86400))
        monkeypatch.setattr("app.routers.outfits.suggest_captions", lambda **kw: ["a", "b"])

        token = _register(client, USER_A)["access_token"]
        for _ in range(2):
            res = client.post(
                CAPTION_URL,
                headers=_auth(token),
                files={"image": ("fit.jpg", io.BytesIO(b"fake"), "image/jpeg")},
            )
            assert res.status_code == 200

        res = client.post(
            CAPTION_URL,
            headers=_auth(token),
            files={"image": ("fit.jpg", io.BytesIO(b"fake"), "image/jpeg")},
        )
        assert res.status_code == 429


# ── Comment rate limit ────────────────────────────────────────────────────────

class TestCommentRateLimit:
    def test_comment_blocked_after_limit(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.comment_rate_limiter", FixedWindowRateLimiter(2, 3600))
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/a.jpg")
        monkeypatch.setattr("app.routers.outfits.run_vibe_check", lambda **kw: (None, None))

        token = _register(client, USER_A)["access_token"]
        outfit_id = _post_outfit(client, token).json()["id"]

        for _ in range(2):
            assert _post_comment(client, token, outfit_id).status_code == 201

        assert _post_comment(client, token, outfit_id).status_code == 429


# ── Like rate limit ───────────────────────────────────────────────────────────

class TestLikeRateLimit:
    def test_like_blocked_after_limit(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.like_rate_limiter", FixedWindowRateLimiter(2, 3600))
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/a.jpg")
        monkeypatch.setattr("app.routers.outfits.run_vibe_check", lambda **kw: (None, None))

        token_a = _register(client, USER_A)["access_token"]
        token_b = _register(client, USER_B)["access_token"]
        outfit_id = _post_outfit(client, token_a).json()["id"]

        for _ in range(2):
            assert _post_like(client, token_b, outfit_id).status_code == 200

        assert _post_like(client, token_b, outfit_id).status_code == 429
