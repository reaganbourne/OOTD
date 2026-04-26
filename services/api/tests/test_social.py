"""Tests for likes and comments endpoints (#55)."""

import io

REGISTER_URL = "/auth/register"

USER_A = {"username": "social_a", "email": "social_a@example.com", "password": "password123"}
USER_B = {"username": "social_b", "email": "social_b@example.com", "password": "password123"}
USER_C = {"username": "social_c", "email": "social_c@example.com", "password": "password123"}


def _register(client, payload):
    res = client.post(REGISTER_URL, json=payload)
    assert res.status_code == 201
    return res.json()


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _post_outfit(client, token, caption="my fit"):
    fake_image = io.BytesIO(b"fake-image-data")
    res = client.post(
        "/outfits",
        headers=_auth(token),
        files={"image": ("test.jpg", fake_image, "image/jpeg")},
        data={"metadata": f'{{"caption": "{caption}"}}'},
    )
    assert res.status_code == 201
    return res.json()


# ── Likes ─────────────────────────────────────────────────────────────────────

class TestLikes:
    def test_get_likes_no_auth(self, client, monkeypatch):
        """Like count is public — no auth needed."""
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        outfit = _post_outfit(client, a["access_token"])
        res = client.get(f"/outfits/{outfit['id']}/likes")
        assert res.status_code == 200
        assert res.json()["like_count"] == 0
        assert res.json()["liked"] is False

    def test_like_outfit(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        outfit = _post_outfit(client, a["access_token"])
        res = client.post(f"/outfits/{outfit['id']}/likes", headers=_auth(b["access_token"]))
        assert res.status_code == 200
        assert res.json()["like_count"] == 1
        assert res.json()["liked"] is True

    def test_like_idempotent(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        outfit = _post_outfit(client, a["access_token"])
        client.post(f"/outfits/{outfit['id']}/likes", headers=_auth(a["access_token"]))
        client.post(f"/outfits/{outfit['id']}/likes", headers=_auth(a["access_token"]))
        res = client.get(f"/outfits/{outfit['id']}/likes")
        assert res.json()["like_count"] == 1  # not 2

    def test_unlike_outfit(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        outfit = _post_outfit(client, a["access_token"])
        client.post(f"/outfits/{outfit['id']}/likes", headers=_auth(b["access_token"]))
        res = client.delete(f"/outfits/{outfit['id']}/likes", headers=_auth(b["access_token"]))
        assert res.status_code == 200
        assert res.json()["like_count"] == 0
        assert res.json()["liked"] is False

    def test_unlike_idempotent(self, client, monkeypatch):
        """Unliking an outfit you never liked is fine — no error."""
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        outfit = _post_outfit(client, a["access_token"])
        res = client.delete(f"/outfits/{outfit['id']}/likes", headers=_auth(a["access_token"]))
        assert res.status_code == 200
        assert res.json()["like_count"] == 0

    def test_liked_by_me_true_when_authed(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        outfit = _post_outfit(client, a["access_token"])
        client.post(f"/outfits/{outfit['id']}/likes", headers=_auth(b["access_token"]))
        res = client.get(f"/outfits/{outfit['id']}/likes", headers=_auth(b["access_token"]))
        assert res.json()["liked"] is True

    def test_liked_by_me_false_for_different_user(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        c = _register(client, USER_C)
        outfit = _post_outfit(client, a["access_token"])
        client.post(f"/outfits/{outfit['id']}/likes", headers=_auth(b["access_token"]))
        res = client.get(f"/outfits/{outfit['id']}/likes", headers=_auth(c["access_token"]))
        assert res.json()["liked"] is False

    def test_multiple_users_like(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        c = _register(client, USER_C)
        outfit = _post_outfit(client, a["access_token"])
        client.post(f"/outfits/{outfit['id']}/likes", headers=_auth(b["access_token"]))
        client.post(f"/outfits/{outfit['id']}/likes", headers=_auth(c["access_token"]))
        res = client.get(f"/outfits/{outfit['id']}/likes")
        assert res.json()["like_count"] == 2

    def test_like_requires_auth(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        outfit = _post_outfit(client, a["access_token"])
        res = client.post(f"/outfits/{outfit['id']}/likes")
        assert res.status_code == 401

    def test_like_404_on_missing_outfit(self, client):
        a = _register(client, USER_A)
        res = client.post("/outfits/00000000-0000-0000-0000-000000000000/likes", headers=_auth(a["access_token"]))
        assert res.status_code == 404


# ── Comments ──────────────────────────────────────────────────────────────────

class TestComments:
    def test_list_comments_empty(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        outfit = _post_outfit(client, a["access_token"])
        res = client.get(f"/outfits/{outfit['id']}/comments")
        assert res.status_code == 200
        assert res.json()["comments"] == []
        assert res.json()["next_cursor"] is None

    def test_list_comments_no_auth(self, client, monkeypatch):
        """Comments are public."""
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        outfit = _post_outfit(client, a["access_token"])
        client.post(f"/outfits/{outfit['id']}/comments", json={"body": "nice fit!"}, headers=_auth(a["access_token"]))
        res = client.get(f"/outfits/{outfit['id']}/comments")
        assert res.status_code == 200
        assert len(res.json()["comments"]) == 1

    def test_create_comment(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        outfit = _post_outfit(client, a["access_token"])
        res = client.post(
            f"/outfits/{outfit['id']}/comments",
            json={"body": "love the vibe!"},
            headers=_auth(b["access_token"]),
        )
        assert res.status_code == 201
        data = res.json()
        assert data["body"] == "love the vibe!"
        assert data["user_id"] == b["user"]["id"]

    def test_comment_includes_author(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        outfit = _post_outfit(client, a["access_token"])
        res = client.post(
            f"/outfits/{outfit['id']}/comments",
            json={"body": "fire!"},
            headers=_auth(a["access_token"]),
        )
        data = res.json()
        assert "author" in data
        assert data["author"]["username"] == USER_A["username"]
        assert data["author"]["id"] == a["user"]["id"]

    def test_create_comment_requires_auth(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        outfit = _post_outfit(client, a["access_token"])
        res = client.post(f"/outfits/{outfit['id']}/comments", json={"body": "hi"})
        assert res.status_code == 401

    def test_comment_body_required(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        outfit = _post_outfit(client, a["access_token"])
        res = client.post(f"/outfits/{outfit['id']}/comments", json={}, headers=_auth(a["access_token"]))
        assert res.status_code == 422

    def test_comment_body_max_length(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        outfit = _post_outfit(client, a["access_token"])
        res = client.post(
            f"/outfits/{outfit['id']}/comments",
            json={"body": "x" * 501},
            headers=_auth(a["access_token"]),
        )
        assert res.status_code == 422

    def test_edit_own_comment(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        outfit = _post_outfit(client, a["access_token"])
        comment = client.post(
            f"/outfits/{outfit['id']}/comments",
            json={"body": "original"},
            headers=_auth(a["access_token"]),
        ).json()
        res = client.patch(
            f"/outfits/{outfit['id']}/comments/{comment['id']}",
            json={"body": "edited"},
            headers=_auth(a["access_token"]),
        )
        assert res.status_code == 200
        assert res.json()["body"] == "edited"

    def test_cannot_edit_others_comment(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        outfit = _post_outfit(client, a["access_token"])
        comment = client.post(
            f"/outfits/{outfit['id']}/comments",
            json={"body": "a's comment"},
            headers=_auth(a["access_token"]),
        ).json()
        res = client.patch(
            f"/outfits/{outfit['id']}/comments/{comment['id']}",
            json={"body": "b editing a"},
            headers=_auth(b["access_token"]),
        )
        assert res.status_code == 403

    def test_author_can_delete_own_comment(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        outfit = _post_outfit(client, a["access_token"])
        comment = client.post(
            f"/outfits/{outfit['id']}/comments",
            json={"body": "b's comment"},
            headers=_auth(b["access_token"]),
        ).json()
        res = client.delete(
            f"/outfits/{outfit['id']}/comments/{comment['id']}",
            headers=_auth(b["access_token"]),
        )
        assert res.status_code == 204

    def test_outfit_owner_can_delete_any_comment(self, client, monkeypatch):
        """Outfit owner can moderate — delete anyone's comments."""
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        outfit = _post_outfit(client, a["access_token"])
        comment = client.post(
            f"/outfits/{outfit['id']}/comments",
            json={"body": "b's comment"},
            headers=_auth(b["access_token"]),
        ).json()
        # A (outfit owner) deletes B's comment
        res = client.delete(
            f"/outfits/{outfit['id']}/comments/{comment['id']}",
            headers=_auth(a["access_token"]),
        )
        assert res.status_code == 204

    def test_third_party_cannot_delete_comment(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        c = _register(client, USER_C)
        outfit = _post_outfit(client, a["access_token"])
        comment = client.post(
            f"/outfits/{outfit['id']}/comments",
            json={"body": "b's comment"},
            headers=_auth(b["access_token"]),
        ).json()
        res = client.delete(
            f"/outfits/{outfit['id']}/comments/{comment['id']}",
            headers=_auth(c["access_token"]),
        )
        assert res.status_code == 403

    def test_comments_oldest_first(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        outfit = _post_outfit(client, a["access_token"])
        client.post(f"/outfits/{outfit['id']}/comments", json={"body": "first"}, headers=_auth(a["access_token"]))
        client.post(f"/outfits/{outfit['id']}/comments", json={"body": "second"}, headers=_auth(a["access_token"]))
        res = client.get(f"/outfits/{outfit['id']}/comments")
        comments = res.json()["comments"]
        assert len(comments) == 2
        assert comments[0]["body"] == "first"
        assert comments[1]["body"] == "second"

    def test_delete_removes_from_list(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        outfit = _post_outfit(client, a["access_token"])
        comment = client.post(
            f"/outfits/{outfit['id']}/comments",
            json={"body": "delete me"},
            headers=_auth(a["access_token"]),
        ).json()
        client.delete(f"/outfits/{outfit['id']}/comments/{comment['id']}", headers=_auth(a["access_token"]))
        res = client.get(f"/outfits/{outfit['id']}/comments")
        assert len(res.json()["comments"]) == 0

    def test_comment_404_on_missing_outfit(self, client):
        a = _register(client, USER_A)
        res = client.post(
            "/outfits/00000000-0000-0000-0000-000000000000/comments",
            json={"body": "hello"},
            headers=_auth(a["access_token"]),
        )
        assert res.status_code == 404
