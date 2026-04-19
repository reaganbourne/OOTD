"""Tests for follow/unfollow and public profile endpoints."""

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


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestPublicProfile:
    def test_returns_profile(self, client):
        _register(client, USER_A)
        res = client.get(PROFILE_URL.format(username="usera"))
        assert res.status_code == 200
        body = res.json()
        assert body["username"] == "usera"
        assert body["follower_count"] == 0
        assert body["following_count"] == 0
        assert "password" not in body
        assert "password_hash" not in body

    def test_unknown_username_returns_404(self, client):
        assert client.get(PROFILE_URL.format(username="nobody")).status_code == 404

    def test_no_auth_required(self, client):
        _register(client, USER_A)
        assert client.get(PROFILE_URL.format(username="usera")).status_code == 200


class TestFollow:
    def test_follow_returns_200_with_counts(self, client):
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        res = client.post(FOLLOW_URL.format(user_id=b["user"]["id"]), headers=_auth(a["access_token"]))
        assert res.status_code == 200
        assert res.json()["following"] is True
        assert res.json()["follower_count"] == 1

    def test_follow_is_idempotent(self, client):
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        headers = _auth(a["access_token"])
        client.post(FOLLOW_URL.format(user_id=b["user"]["id"]), headers=headers)
        res = client.post(FOLLOW_URL.format(user_id=b["user"]["id"]), headers=headers)
        assert res.status_code == 200
        assert res.json()["follower_count"] == 1

    def test_follow_updates_profile_counts(self, client):
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        client.post(FOLLOW_URL.format(user_id=b["user"]["id"]), headers=_auth(a["access_token"]))
        assert client.get(PROFILE_URL.format(username="userb")).json()["follower_count"] == 1
        assert client.get(PROFILE_URL.format(username="usera")).json()["following_count"] == 1

    def test_self_follow_returns_400(self, client):
        a = _register(client, USER_A)
        res = client.post(FOLLOW_URL.format(user_id=a["user"]["id"]), headers=_auth(a["access_token"]))
        assert res.status_code == 400

    def test_follow_unknown_user_returns_404(self, client):
        a = _register(client, USER_A)
        res = client.post(
            FOLLOW_URL.format(user_id="00000000-0000-0000-0000-000000000000"),
            headers=_auth(a["access_token"]),
        )
        assert res.status_code == 404

    def test_follow_requires_auth(self, client):
        b = _register(client, USER_B)
        assert client.post(FOLLOW_URL.format(user_id=b["user"]["id"])).status_code == 401


class TestUnfollow:
    def test_unfollow_returns_200_with_counts(self, client):
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        headers = _auth(a["access_token"])
        client.post(FOLLOW_URL.format(user_id=b["user"]["id"]), headers=headers)
        res = client.delete(FOLLOW_URL.format(user_id=b["user"]["id"]), headers=headers)
        assert res.status_code == 200
        assert res.json()["following"] is False
        assert res.json()["follower_count"] == 0

    def test_unfollow_is_idempotent(self, client):
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        res = client.delete(FOLLOW_URL.format(user_id=b["user"]["id"]), headers=_auth(a["access_token"]))
        assert res.status_code == 200

    def test_self_unfollow_returns_400(self, client):
        a = _register(client, USER_A)
        res = client.delete(FOLLOW_URL.format(user_id=a["user"]["id"]), headers=_auth(a["access_token"]))
        assert res.status_code == 400

    def test_unfollow_requires_auth(self, client):
        b = _register(client, USER_B)
        assert client.delete(FOLLOW_URL.format(user_id=b["user"]["id"])).status_code == 401
