"""Tests for outfit detail and OG metadata endpoints (#111, #74, #75)."""

import io

REGISTER_URL = "/auth/register"

USER_A = {"username": "detail_a", "email": "detail_a@example.com", "password": "password123"}
USER_B = {"username": "detail_b", "email": "detail_b@example.com", "password": "password123"}


def _register(client, payload):
    res = client.post(REGISTER_URL, json=payload)
    assert res.status_code == 201
    return res.json()


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _post_outfit(client, token, caption="test outfit"):
    fake_image = io.BytesIO(b"fake-image-data")
    return client.post(
        "/outfits",
        headers=_auth(token),
        files={"image": ("test.jpg", fake_image, "image/jpeg")},
        data={"metadata": f'{{"caption": "{caption}"}}'},
    )


# ── GET /outfits/{outfit_id} ──────────────────────────────────────────────────

class TestOutfitDetail:
    def test_get_outfit_no_auth(self, client, monkeypatch):
        """Anyone can fetch an outfit detail — no auth required."""
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        outfit = _post_outfit(client, a["access_token"], "my fit").json()

        res = client.get(f"/outfits/{outfit['id']}")
        assert res.status_code == 200

    def test_outfit_detail_includes_all_fields(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        outfit = _post_outfit(client, a["access_token"], "brunch fit").json()

        res = client.get(f"/outfits/{outfit['id']}")
        data = res.json()
        assert data["id"] == outfit["id"]
        assert data["caption"] == "brunch fit"
        assert data["image_url"] == "https://s3.example.com/img.jpg"
        assert "clothing_items" in data
        assert "created_at" in data

    def test_outfit_detail_includes_owner(self, client, monkeypatch):
        """Response embeds owner profile — no extra request needed from Tomi."""
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        outfit = _post_outfit(client, a["access_token"]).json()

        res = client.get(f"/outfits/{outfit['id']}")
        data = res.json()
        assert "owner" in data
        assert data["owner"]["id"] == a["user"]["id"]
        assert data["owner"]["username"] == USER_A["username"]

    def test_outfit_detail_404_on_missing(self, client):
        res = client.get("/outfits/00000000-0000-0000-0000-000000000000")
        assert res.status_code == 404

    def test_outfit_detail_404_on_bad_uuid(self, client):
        res = client.get("/outfits/not-a-uuid")
        assert res.status_code == 404

    def test_different_user_can_view_outfit(self, client, monkeypatch):
        """Public endpoint — user B can view user A's outfit without following."""
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        outfit = _post_outfit(client, a["access_token"], "a's fit").json()

        res = client.get(f"/outfits/{outfit['id']}", headers=_auth(b["access_token"]))
        assert res.status_code == 200
        assert res.json()["caption"] == "a's fit"


# ── GET /outfits/{outfit_id}/og ───────────────────────────────────────────────

class TestOutfitOG:
    def test_og_no_auth(self, client, monkeypatch):
        """OG endpoint is public — no auth required for crawlers."""
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        outfit = _post_outfit(client, a["access_token"], "date night").json()

        res = client.get(f"/outfits/{outfit['id']}/og")
        assert res.status_code == 200

    def test_og_has_required_fields(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        outfit = _post_outfit(client, a["access_token"], "cozy sunday").json()

        res = client.get(f"/outfits/{outfit['id']}/og")
        data = res.json()
        assert "title" in data
        assert "description" in data
        assert "image_url" in data
        assert "page_url" in data
        assert "site_name" in data
        assert "twitter_card" in data

    def test_og_description_uses_caption(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        outfit = _post_outfit(client, a["access_token"], "casual friday").json()

        res = client.get(f"/outfits/{outfit['id']}/og")
        assert res.json()["description"] == "casual friday"

    def test_og_title_includes_username(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        outfit = _post_outfit(client, a["access_token"]).json()

        res = client.get(f"/outfits/{outfit['id']}/og")
        assert USER_A["username"] in res.json()["title"]

    def test_og_image_url_is_outfit_image(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        outfit = _post_outfit(client, a["access_token"]).json()

        res = client.get(f"/outfits/{outfit['id']}/og")
        assert res.json()["image_url"] == "https://s3.example.com/img.jpg"

    def test_og_page_url_contains_outfit_id(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        outfit = _post_outfit(client, a["access_token"]).json()

        res = client.get(f"/outfits/{outfit['id']}/og")
        assert outfit["id"] in res.json()["page_url"]

    def test_og_site_name_and_twitter_card(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        outfit = _post_outfit(client, a["access_token"]).json()

        res = client.get(f"/outfits/{outfit['id']}/og")
        data = res.json()
        assert data["site_name"] == "OOTD"
        assert data["twitter_card"] == "summary_large_image"

    def test_og_404_on_missing_outfit(self, client):
        res = client.get("/outfits/00000000-0000-0000-0000-000000000000/og")
        assert res.status_code == 404

    def test_og_fallback_description_when_no_caption(self, client, monkeypatch):
        """If no caption, description falls back to a default string."""
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/img.jpg")
        a = _register(client, USER_A)
        # Post outfit with no caption
        fake_image = io.BytesIO(b"fake-image-data")
        outfit = client.post(
            "/outfits",
            headers=_auth(a["access_token"]),
            files={"image": ("test.jpg", fake_image, "image/jpeg")},
            data={"metadata": "{}"},
        ).json()

        res = client.get(f"/outfits/{outfit['id']}/og")
        desc = res.json()["description"]
        assert len(desc) > 0  # Some fallback text, not empty
