"""
Tests for follow/unfollow endpoints and public profile.

POST /users/{user_id}/follow   — follow a user
DELETE /users/{user_id}/follow — unfollow a user
GET /users/{username}          — public profile
"""

import pytest
from starlette.testclient import TestClient

REGISTER_URL = "/auth/register"
FOLLOW_URL = "/users/{user_id}/follow"
PROFILE_URL = "/users/{username}"

USER_A = {"username": "usera", "email": "a@example.com", "password": "password123"}
USER_B = {"username": "userb", "email": "b@example.com", "password": "password123"}


def _register(client: TestClient, payload: dict) -> dict:
    res = client.post(REGISTER_URL, json=payload)
    assert res.status_code == 201
    return res.json()


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ------------------------------------------------------------------ profile


class TestPublicProfile:
    def test_returns_profile(self, client):
        data = _register(client, USER_A)
        res = client.get(PROFILE_URL.format(username="usera"))
        assert res.status_code == 200
        body = res.json()
        assert body["username"] == "usera"
        assert body["follower_count"] == 0
        assert body["following_count"] == 0
        assert "password" not in body
        assert "password_hash" not in body

    def test_unknown_username_returns_404(self, client):
        res = client.get(PROFILE_URL.format(username="nobody"))
        assert res.status_code == 404

    def test_no_auth_required(self, client):
        _register(client, USER_A)
        res = client.get(PROFILE_URL.format(username="usera"))
        assert res.status_code == 200


# ------------------------------------------------------------------ follow


class TestFollow:
    def test_follow_returns_200_with_counts(self, client):
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        res = client.post(
            FOLLOW_URL.format(user_id=b["user"]["id"]),
            headers=_auth_header(a["access_token"]),
        )
        assert res.status_code == 200
        body = res.json()
        assert body["following"] is True
        assert body["follower_count"] == 1

    def test_follow_is_idempotent(self, client):
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        headers = _auth_header(a["access_token"])
        client.post(FOLLOW_URL.format(user_id=b["user"]["id"]), headers=headers)
        res = client.post(FOLLOW_URL.format(user_id=b["user"]["id"]), headers=headers)
        assert res.status_code == 200
        assert res.json()["follower_count"] == 1

    def test_follow_updates_profile_counts(self, client):
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        client.post(
            FOLLOW_URL.format(user_id=b["user"]["id"]),
            headers=_auth_header(a["access_token"]),
        )
        profile = client.get(PROFILE_URL.format(username="userb")).json()
        assert profile["follower_count"] == 1

        profile_a = client.get(PROFILE_URL.format(username="usera")).json()
        assert profile_a["following_count"] == 1

    def test_self_follow_returns_400(self, client):
        a = _register(client, USER_A)
        res = client.post(
            FOLLOW_URL.format(user_id=a["user"]["id"]),
            headers=_auth_header(a["access_token"]),
        )
        assert res.status_code == 400

    def test_follow_unknown_user_returns_404(self, client):
        a = _register(client, USER_A)
        res = client.post(
            FOLLOW_URL.format(user_id="00000000-0000-0000-0000-000000000000"),
            headers=_auth_header(a["access_token"]),
        )
        assert res.status_code == 404

    def test_follow_requires_auth(self, client):
        b = _register(client, USER_B)
        res = client.post(FOLLOW_URL.format(user_id=b["user"]["id"]))
        assert res.status_code == 401


# ------------------------------------------------------------------ unfollow


class TestUnfollow:
    def test_unfollow_returns_200_with_counts(self, client):
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        headers = _auth_header(a["access_token"])
        client.post(FOLLOW_URL.format(user_id=b["user"]["id"]), headers=headers)
        res = client.delete(FOLLOW_URL.format(user_id=b["user"]["id"]), headers=headers)
        assert res.status_code == 200
        body = res.json()
        assert body["following"] is False
        assert body["follower_count"] == 0

    def test_unfollow_is_idempotent(self, client):
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        headers = _auth_header(a["access_token"])
        res = client.delete(FOLLOW_URL.format(user_id=b["user"]["id"]), headers=headers)
        assert res.status_code == 200

    def test_self_unfollow_returns_400(self, client):
        a = _register(client, USER_A)
        res = client.delete(
            FOLLOW_URL.format(user_id=a["user"]["id"]),
            headers=_auth_header(a["access_token"]),
        )
        assert res.status_code == 400

    def test_unfollow_requires_auth(self, client):
        b = _register(client, USER_B)
        res = client.delete(FOLLOW_URL.format(user_id=b["user"]["id"]))
        assert res.status_code == 401
