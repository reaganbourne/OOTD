"""Tests for feed, vault, and profile outfit endpoints."""

import io
from starlette.testclient import TestClient

REGISTER_URL = "/auth/register"
FOLLOW_URL = "/users/{user_id}/follow"
FEED_URL = "/outfits/feed"
MY_VAULT_URL = "/outfits/me"
USER_VAULT_URL = "/outfits/user/{username}"

USER_A = {"username": "usera", "email": "a@example.com", "password": "password123"}
USER_B = {"username": "userb", "email": "b@example.com", "password": "password123"}
USER_C = {"username": "userc", "email": "c@example.com", "password": "password123"}


def _register(client, payload):
    res = client.post(REGISTER_URL, json=payload)
    assert res.status_code == 201
    return res.json()


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _post_outfit(client, token, caption="test outfit"):
    """Post a fake outfit — S3 upload is mocked via monkeypatch in conftest."""
    fake_image = io.BytesIO(b"fake-image-data")
    return client.post(
        "/outfits",
        headers=_auth(token),
        files={"image": ("test.jpg", fake_image, "image/jpeg")},
        data={"metadata": f'{{"caption": "{caption}"}}'},
    )


class TestFeed:
    def test_empty_feed_when_following_nobody(self, client):
        a = _register(client, USER_A)
        res = client.get(FEED_URL, headers=_auth(a["access_token"]))
        assert res.status_code == 200
        body = res.json()
        assert body["outfits"] == []
        assert body["next_cursor"] is None

    def test_feed_shows_followed_users_outfits(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/test.jpg")
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        client.post(FOLLOW_URL.format(user_id=b["user"]["id"]), headers=_auth(a["access_token"]))
        _post_outfit(client, b["access_token"], "b's outfit")
        res = client.get(FEED_URL, headers=_auth(a["access_token"]))
        assert res.status_code == 200
        assert len(res.json()["outfits"]) == 1
        assert res.json()["outfits"][0]["caption"] == "b's outfit"

    def test_feed_does_not_show_unfollowed_users(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/test.jpg")
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        _post_outfit(client, b["access_token"], "b's outfit")
        res = client.get(FEED_URL, headers=_auth(a["access_token"]))
        assert res.json()["outfits"] == []

    def test_feed_requires_auth(self, client):
        assert client.get(FEED_URL).status_code == 401

    def test_feed_cursor_pagination(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/test.jpg")
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        client.post(FOLLOW_URL.format(user_id=b["user"]["id"]), headers=_auth(a["access_token"]))
        for i in range(3):
            _post_outfit(client, b["access_token"], f"outfit {i}")
        res = client.get(FEED_URL + "?limit=2", headers=_auth(a["access_token"]))
        assert len(res.json()["outfits"]) == 2
        assert res.json()["next_cursor"] is not None
        cursor = res.json()["next_cursor"]
        res2 = client.get(FEED_URL + f"?limit=2&cursor={cursor}", headers=_auth(a["access_token"]))
        assert len(res2.json()["outfits"]) == 1
        assert res2.json()["next_cursor"] is None


class TestVault:
    def test_my_vault_returns_own_outfits(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/test.jpg")
        a = _register(client, USER_A)
        _post_outfit(client, a["access_token"], "my outfit")
        res = client.get(MY_VAULT_URL, headers=_auth(a["access_token"]))
        assert res.status_code == 200
        assert len(res.json()["outfits"]) == 1
        assert res.json()["outfits"][0]["caption"] == "my outfit"

    def test_my_vault_requires_auth(self, client):
        assert client.get(MY_VAULT_URL).status_code == 401

    def test_user_vault_is_public(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/test.jpg")
        a = _register(client, USER_A)
        _post_outfit(client, a["access_token"], "public outfit")
        res = client.get(USER_VAULT_URL.format(username="usera"))
        assert res.status_code == 200
        assert len(res.json()["outfits"]) == 1

    def test_user_vault_unknown_user_returns_404(self, client):
        assert client.get(USER_VAULT_URL.format(username="nobody")).status_code == 404
