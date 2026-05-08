"""Tests for notification endpoints."""

import io

from starlette.testclient import TestClient

REGISTER_URL = "/auth/register"
FOLLOW_URL = "/users/{username}/follow"
NOTIF_URL = "/notifications"
UNSEEN_URL = "/notifications/unseen-count"
SEEN_URL = "/notifications/seen"

USER_A = {"username": "usera", "email": "a@example.com", "password": "password123"}
USER_B = {"username": "userb", "email": "b@example.com", "password": "password123"}


def _register(client: TestClient, payload: dict) -> dict:
    res = client.post(REGISTER_URL, json=payload)
    assert res.status_code == 201
    return res.json()


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _post_outfit(client, token, caption="test outfit"):
    fake_image = io.BytesIO(b"fake-image-data")
    return client.post(
        "/outfits",
        headers=_auth(token),
        files={"image": ("test.jpg", fake_image, "image/jpeg")},
        data={"metadata": f'{{"caption": "{caption}"}}'},
    )


class TestNotifications:
    def test_empty_list_initially(self, client):
        a = _register(client, USER_A)
        res = client.get(NOTIF_URL, headers=_auth(a["access_token"]))
        assert res.status_code == 200
        body = res.json()
        assert body["items"] == []
        assert body["next_cursor"] is None

    def test_unseen_count_zero_initially(self, client):
        a = _register(client, USER_A)
        res = client.get(UNSEEN_URL, headers=_auth(a["access_token"]))
        assert res.status_code == 200
        assert res.json()["unseen_count"] == 0

    def test_follow_creates_notification(self, client):
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        # A follows B — B should get a notification
        client.post(FOLLOW_URL.format(username=b["user"]["username"]), headers=_auth(a["access_token"]))

        res = client.get(NOTIF_URL, headers=_auth(b["access_token"]))
        assert res.status_code == 200
        items = res.json()["items"]
        assert len(items) == 1
        assert items[0]["type"] == "follow"
        assert items[0]["seen"] is False
        assert items[0]["actor"]["username"] == "usera"

    def test_follow_increments_unseen_count(self, client):
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        client.post(FOLLOW_URL.format(username=b["user"]["username"]), headers=_auth(a["access_token"]))

        res = client.get(UNSEEN_URL, headers=_auth(b["access_token"]))
        assert res.json()["unseen_count"] == 1

    def test_mark_all_seen(self, client):
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        client.post(FOLLOW_URL.format(username=b["user"]["username"]), headers=_auth(a["access_token"]))

        # Mark all seen with empty list
        res = client.post(SEEN_URL, headers=_auth(b["access_token"]), json={"notification_ids": []})
        assert res.status_code == 204

        # Count should now be 0
        assert client.get(UNSEEN_URL, headers=_auth(b["access_token"])).json()["unseen_count"] == 0
        # Items still exist but are marked seen
        items = client.get(NOTIF_URL, headers=_auth(b["access_token"])).json()["items"]
        assert items[0]["seen"] is True

    def test_like_creates_notification(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/test.jpg")
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        outfit = _post_outfit(client, b["access_token"], "b's fit")
        assert outfit.status_code == 201

        # A likes B's outfit — B gets notified
        client.post(f"/outfits/{outfit.json()['id']}/likes", headers=_auth(a["access_token"]))

        res = client.get(NOTIF_URL, headers=_auth(b["access_token"]))
        items = res.json()["items"]
        assert len(items) == 1
        assert items[0]["type"] == "like"
        assert items[0]["outfit_id"] == outfit.json()["id"]
        assert items[0]["actor"]["username"] == "usera"

    def test_comment_creates_notification(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/test.jpg")
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        outfit = _post_outfit(client, b["access_token"], "b's fit")
        assert outfit.status_code == 201

        # A comments on B's outfit
        client.post(
            f"/outfits/{outfit.json()['id']}/comments",
            headers=_auth(a["access_token"]),
            json={"body": "looking good!"},
        )

        res = client.get(NOTIF_URL, headers=_auth(b["access_token"]))
        items = res.json()["items"]
        assert len(items) == 1
        assert items[0]["type"] == "comment"
        assert items[0]["outfit_id"] == outfit.json()["id"]

    def test_no_self_notification_on_like(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/test.jpg")
        a = _register(client, USER_A)
        outfit = _post_outfit(client, a["access_token"], "my fit")
        # Like own outfit — should not create a notification
        client.post(f"/outfits/{outfit.json()['id']}/likes", headers=_auth(a["access_token"]))
        res = client.get(NOTIF_URL, headers=_auth(a["access_token"]))
        assert res.json()["items"] == []

    def test_duplicate_follow_does_not_duplicate_notification(self, client):
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        headers = _auth(a["access_token"])
        client.post(FOLLOW_URL.format(username=b["user"]["username"]), headers=headers)
        client.post(FOLLOW_URL.format(username=b["user"]["username"]), headers=headers)

        res = client.get(NOTIF_URL, headers=_auth(b["access_token"]))
        assert len(res.json()["items"]) == 1

    def test_mark_specific_notifications_seen(self, client):
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        client.post(FOLLOW_URL.format(username=b["user"]["username"]), headers=_auth(a["access_token"]))

        items = client.get(NOTIF_URL, headers=_auth(b["access_token"])).json()["items"]
        notif_id = items[0]["id"]

        res = client.post(SEEN_URL, headers=_auth(b["access_token"]), json={"notification_ids": [notif_id]})
        assert res.status_code == 204
        assert client.get(UNSEEN_URL, headers=_auth(b["access_token"])).json()["unseen_count"] == 0

    def test_requires_auth(self, client):
        assert client.get(NOTIF_URL).status_code == 401
        assert client.get(UNSEEN_URL).status_code == 401
        assert client.post(SEEN_URL, json={}).status_code == 401
