"""Tests for PATCH /users/me, POST /users/me/avatar, GET /users/search, GET /users/suggested."""

import io

REGISTER_URL = "/auth/register"
UPDATE_PROFILE_URL = "/users/me"
UPLOAD_AVATAR_URL = "/users/me/avatar"
SEARCH_URL = "/users/search"
SUGGESTED_URL = "/users/suggested"
FOLLOW_URL = "/users/{user_id}/follow"

USER_A = {"username": "usera", "email": "a@example.com", "password": "password123"}
USER_B = {"username": "userb", "email": "b@example.com", "password": "password123"}
USER_C = {"username": "userc", "email": "c@example.com", "password": "password123"}


def _register(client, payload):
    res = client.post(REGISTER_URL, json=payload)
    assert res.status_code == 201
    return res.json()


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


# ── PATCH /users/me ───────────────────────────────────────────────────────────

class TestUpdateProfile:
    def test_update_display_name(self, client):
        a = _register(client, USER_A)
        res = client.patch(UPDATE_PROFILE_URL, json={"display_name": "Reagan B"}, headers=_auth(a["access_token"]))
        assert res.status_code == 200
        assert res.json()["display_name"] == "Reagan B"

    def test_update_bio(self, client):
        a = _register(client, USER_A)
        res = client.patch(UPDATE_PROFILE_URL, json={"bio": "living in fits 🤍"}, headers=_auth(a["access_token"]))
        assert res.status_code == 200
        assert res.json()["bio"] == "living in fits 🤍"

    def test_update_username(self, client):
        a = _register(client, USER_A)
        res = client.patch(UPDATE_PROFILE_URL, json={"username": "reagan_b"}, headers=_auth(a["access_token"]))
        assert res.status_code == 200
        assert res.json()["username"] == "reagan_b"

    def test_partial_update_leaves_other_fields_unchanged(self, client):
        a = _register(client, USER_A)
        client.patch(UPDATE_PROFILE_URL, json={"bio": "first bio"}, headers=_auth(a["access_token"]))
        res = client.patch(UPDATE_PROFILE_URL, json={"display_name": "New Name"}, headers=_auth(a["access_token"]))
        assert res.json()["bio"] == "first bio"
        assert res.json()["display_name"] == "New Name"

    def test_duplicate_username_returns_409(self, client):
        a = _register(client, USER_A)
        _register(client, USER_B)
        res = client.patch(UPDATE_PROFILE_URL, json={"username": "userb"}, headers=_auth(a["access_token"]))
        assert res.status_code == 409

    def test_invalid_username_format_returns_422(self, client):
        a = _register(client, USER_A)
        res = client.patch(UPDATE_PROFILE_URL, json={"username": "bad username!"}, headers=_auth(a["access_token"]))
        assert res.status_code == 422

    def test_requires_auth(self, client):
        assert client.patch(UPDATE_PROFILE_URL, json={"bio": "test"}).status_code == 401

    def test_bio_max_length(self, client):
        a = _register(client, USER_A)
        res = client.patch(UPDATE_PROFILE_URL, json={"bio": "x" * 161}, headers=_auth(a["access_token"]))
        assert res.status_code == 422

    def test_returns_follower_counts(self, client):
        a = _register(client, USER_A)
        res = client.patch(UPDATE_PROFILE_URL, json={"display_name": "Test"}, headers=_auth(a["access_token"]))
        assert "follower_count" in res.json()
        assert "following_count" in res.json()


# ── POST /users/me/avatar ─────────────────────────────────────────────────────

class TestUploadAvatar:
    def test_avatar_sets_profile_image_url(self, client, monkeypatch):
        monkeypatch.setattr(
            "app.routers.users.upload_image",
            lambda **kw: "https://s3.example.com/avatars/test.jpg",
        )
        a = _register(client, USER_A)
        fake = io.BytesIO(b"fake-image")
        res = client.post(
            UPLOAD_AVATAR_URL,
            headers=_auth(a["access_token"]),
            files={"image": ("avatar.jpg", fake, "image/jpeg")},
        )
        assert res.status_code == 200
        assert res.json()["profile_image_url"] == "https://s3.example.com/avatars/test.jpg"

    def test_avatar_requires_auth(self, client):
        fake = io.BytesIO(b"fake-image")
        res = client.post(UPLOAD_AVATAR_URL, files={"image": ("avatar.jpg", fake, "image/jpeg")})
        assert res.status_code == 401


# ── GET /users/search ─────────────────────────────────────────────────────────

class TestSearchUsers:
    def test_finds_by_username(self, client):
        _register(client, USER_A)
        res = client.get(SEARCH_URL, params={"q": "usera"})
        assert res.status_code == 200
        assert any(u["username"] == "usera" for u in res.json())

    def test_finds_by_display_name(self, client):
        a = _register(client, USER_A)
        client.patch(UPDATE_PROFILE_URL, json={"display_name": "Reagan Bourne"}, headers=_auth(a["access_token"]))
        res = client.get(SEARCH_URL, params={"q": "reagan"})
        assert any(u["display_name"] == "Reagan Bourne" for u in res.json())

    def test_case_insensitive(self, client):
        _register(client, USER_A)
        res = client.get(SEARCH_URL, params={"q": "USERA"})
        assert any(u["username"] == "usera" for u in res.json())

    def test_no_results_returns_empty_list(self, client):
        _register(client, USER_A)
        res = client.get(SEARCH_URL, params={"q": "zzznomatch"})
        assert res.status_code == 200
        assert res.json() == []

    def test_no_auth_required(self, client):
        _register(client, USER_A)
        assert client.get(SEARCH_URL, params={"q": "user"}).status_code == 200

    def test_returns_follower_count(self, client):
        _register(client, USER_A)
        res = client.get(SEARCH_URL, params={"q": "usera"})
        assert "follower_count" in res.json()[0]

    def test_empty_query_returns_422(self, client):
        assert client.get(SEARCH_URL, params={"q": ""}).status_code == 422


# ── GET /users/suggested ──────────────────────────────────────────────────────

class TestSuggestedUsers:
    def test_requires_auth(self, client):
        assert client.get(SUGGESTED_URL).status_code == 401

    def test_excludes_self(self, client):
        a = _register(client, USER_A)
        res = client.get(SUGGESTED_URL, headers=_auth(a["access_token"]))
        assert res.status_code == 200
        assert not any(u["username"] == "usera" for u in res.json())

    def test_excludes_already_followed(self, client):
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        client.post(FOLLOW_URL.format(user_id=b["user"]["id"]), headers=_auth(a["access_token"]))
        res = client.get(SUGGESTED_URL, headers=_auth(a["access_token"]))
        assert not any(u["username"] == "userb" for u in res.json())

    def test_returns_users_when_population_exists(self, client):
        a = _register(client, USER_A)
        _register(client, USER_B)
        _register(client, USER_C)
        res = client.get(SUGGESTED_URL, headers=_auth(a["access_token"]))
        assert res.status_code == 200
        assert len(res.json()) >= 1

    def test_friends_of_friends_appear(self, client):
        """A follows B, B follows C — C should appear in A's suggestions."""
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        c = _register(client, USER_C)
        client.post(FOLLOW_URL.format(user_id=b["user"]["id"]), headers=_auth(a["access_token"]))
        client.post(FOLLOW_URL.format(user_id=c["user"]["id"]), headers=_auth(b["access_token"]))
        res = client.get(SUGGESTED_URL, headers=_auth(a["access_token"]))
        assert any(u["username"] == "userc" for u in res.json())
