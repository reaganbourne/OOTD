"""Tests for collaborative board endpoints."""

import io

import pytest

REGISTER_URL = "/auth/register"
BOARDS_URL = "/boards"

USER_A = {"username": "board_a", "email": "board_a@example.com", "password": "password123"}
USER_B = {"username": "board_b", "email": "board_b@example.com", "password": "password123"}
USER_C = {"username": "board_c", "email": "board_c@example.com", "password": "password123"}


def _register(client, payload):
    res = client.post(REGISTER_URL, json=payload)
    assert res.status_code == 201
    return res.json()


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _create_board(client, token, name="Event Night", event_date=None):
    body = {"name": name}
    if event_date:
        body["event_date"] = event_date
    res = client.post(BOARDS_URL, json=body, headers=_auth(token))
    return res


def _post_outfit(client, token, caption="outfit"):
    """Create a real outfit row (S3 must be patched by caller)."""
    fake_image = io.BytesIO(b"fake-image-data")
    return client.post(
        "/outfits",
        headers=_auth(token),
        files={"image": ("test.jpg", fake_image, "image/jpeg")},
        data={"metadata": f'{{"caption": "{caption}"}}'},
    )


# ── Create / Read ─────────────────────────────────────────────────────────────

class TestCreateBoard:
    def test_create_board_returns_201(self, client):
        a = _register(client, USER_A)
        res = _create_board(client, a["access_token"])
        assert res.status_code == 201
        data = res.json()
        assert data["name"] == "Event Night"
        assert "invite_code" in data
        assert len(data["invite_code"]) == 8
        assert data["member_count"] == 1
        assert data["creator_id"] == a["user"]["id"]

    def test_create_board_with_event_date(self, client):
        a = _register(client, USER_A)
        res = _create_board(client, a["access_token"], event_date="2026-06-15")
        assert res.status_code == 201
        assert res.json()["event_date"] == "2026-06-15"

    def test_create_board_requires_auth(self, client):
        res = client.post(BOARDS_URL, json={"name": "test"})
        assert res.status_code == 401

    def test_create_board_name_required(self, client):
        a = _register(client, USER_A)
        res = client.post(BOARDS_URL, json={}, headers=_auth(a["access_token"]))
        assert res.status_code == 422


class TestMyBoards:
    def test_my_boards_empty_initially(self, client):
        a = _register(client, USER_A)
        res = client.get(f"{BOARDS_URL}/me", headers=_auth(a["access_token"]))
        assert res.status_code == 200
        assert res.json() == []

    def test_my_boards_shows_created_board(self, client):
        a = _register(client, USER_A)
        _create_board(client, a["access_token"], "My Board")
        res = client.get(f"{BOARDS_URL}/me", headers=_auth(a["access_token"]))
        assert res.status_code == 200
        assert len(res.json()) == 1
        assert res.json()[0]["name"] == "My Board"

    def test_my_boards_shows_joined_board(self, client):
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        board = _create_board(client, a["access_token"], "A's Board").json()
        invite_code = board["invite_code"]
        # B joins
        client.post(f"{BOARDS_URL}/invite/{invite_code}/join", headers=_auth(b["access_token"]))
        res = client.get(f"{BOARDS_URL}/me", headers=_auth(b["access_token"]))
        assert res.status_code == 200
        assert len(res.json()) == 1


class TestGetBoard:
    def test_get_board_as_member(self, client):
        a = _register(client, USER_A)
        board = _create_board(client, a["access_token"]).json()
        res = client.get(f"{BOARDS_URL}/{board['id']}", headers=_auth(a["access_token"]))
        assert res.status_code == 200
        assert res.json()["id"] == board["id"]

    def test_get_board_non_member_forbidden(self, client):
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        board = _create_board(client, a["access_token"]).json()
        res = client.get(f"{BOARDS_URL}/{board['id']}", headers=_auth(b["access_token"]))
        assert res.status_code == 403

    def test_get_board_not_found(self, client):
        a = _register(client, USER_A)
        res = client.get(f"{BOARDS_URL}/00000000-0000-0000-0000-000000000000", headers=_auth(a["access_token"]))
        assert res.status_code == 404


# ── Invite / Join ─────────────────────────────────────────────────────────────

class TestInviteJoin:
    def test_preview_invite_no_auth(self, client):
        a = _register(client, USER_A)
        board = _create_board(client, a["access_token"]).json()
        res = client.get(f"{BOARDS_URL}/invite/{board['invite_code']}")
        assert res.status_code == 200
        assert res.json()["name"] == board["name"]

    def test_preview_invite_invalid_code(self, client):
        res = client.get(f"{BOARDS_URL}/invite/BADCODE1")
        assert res.status_code == 404

    def test_join_board_via_invite(self, client):
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        board = _create_board(client, a["access_token"]).json()
        res = client.post(
            f"{BOARDS_URL}/invite/{board['invite_code']}/join",
            headers=_auth(b["access_token"]),
        )
        assert res.status_code == 200
        assert res.json()["member_count"] == 2

    def test_join_idempotent(self, client):
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        board = _create_board(client, a["access_token"]).json()
        # join twice
        client.post(f"{BOARDS_URL}/invite/{board['invite_code']}/join", headers=_auth(b["access_token"]))
        res = client.post(f"{BOARDS_URL}/invite/{board['invite_code']}/join", headers=_auth(b["access_token"]))
        assert res.status_code == 200
        # Still only 2 members
        members = client.get(f"{BOARDS_URL}/{board['id']}/members", headers=_auth(b["access_token"])).json()
        assert len(members) == 2


# ── Members ───────────────────────────────────────────────────────────────────

class TestMembers:
    def test_list_members_includes_creator(self, client):
        a = _register(client, USER_A)
        board = _create_board(client, a["access_token"]).json()
        res = client.get(f"{BOARDS_URL}/{board['id']}/members", headers=_auth(a["access_token"]))
        assert res.status_code == 200
        members = res.json()
        assert len(members) == 1
        assert members[0]["role"] == "creator"
        assert members[0]["user_id"] == a["user"]["id"]

    def test_non_member_cannot_list_members(self, client):
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        board = _create_board(client, a["access_token"]).json()
        res = client.get(f"{BOARDS_URL}/{board['id']}/members", headers=_auth(b["access_token"]))
        assert res.status_code == 403

    def test_remove_member(self, client):
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        board = _create_board(client, a["access_token"]).json()
        client.post(f"{BOARDS_URL}/invite/{board['invite_code']}/join", headers=_auth(b["access_token"]))
        # Creator removes B
        res = client.delete(
            f"{BOARDS_URL}/{board['id']}/members/{b['user']['id']}",
            headers=_auth(a["access_token"]),
        )
        assert res.status_code == 204
        members = client.get(f"{BOARDS_URL}/{board['id']}/members", headers=_auth(a["access_token"])).json()
        assert len(members) == 1

    def test_member_cannot_remove_others(self, client):
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        c = _register(client, USER_C)
        board = _create_board(client, a["access_token"]).json()
        client.post(f"{BOARDS_URL}/invite/{board['invite_code']}/join", headers=_auth(b["access_token"]))
        client.post(f"{BOARDS_URL}/invite/{board['invite_code']}/join", headers=_auth(c["access_token"]))
        # B tries to remove C — should be 403
        res = client.delete(
            f"{BOARDS_URL}/{board['id']}/members/{c['user']['id']}",
            headers=_auth(b["access_token"]),
        )
        assert res.status_code == 403

    def test_creator_cannot_remove_self(self, client):
        a = _register(client, USER_A)
        board = _create_board(client, a["access_token"]).json()
        res = client.delete(
            f"{BOARDS_URL}/{board['id']}/members/{a['user']['id']}",
            headers=_auth(a["access_token"]),
        )
        assert res.status_code == 400


class TestLeaveBoard:
    def test_member_can_leave(self, client):
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        board = _create_board(client, a["access_token"]).json()
        client.post(f"{BOARDS_URL}/invite/{board['invite_code']}/join", headers=_auth(b["access_token"]))
        res = client.delete(f"{BOARDS_URL}/{board['id']}/leave", headers=_auth(b["access_token"]))
        assert res.status_code == 204

    def test_creator_cannot_leave(self, client):
        a = _register(client, USER_A)
        board = _create_board(client, a["access_token"]).json()
        res = client.delete(f"{BOARDS_URL}/{board['id']}/leave", headers=_auth(a["access_token"]))
        assert res.status_code == 400


# ── Board Outfits ─────────────────────────────────────────────────────────────

class TestBoardOutfits:
    def test_add_outfit_to_board(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/test.jpg")
        a = _register(client, USER_A)
        board = _create_board(client, a["access_token"]).json()
        outfit = _post_outfit(client, a["access_token"]).json()
        res = client.post(
            f"{BOARDS_URL}/{board['id']}/outfits",
            params={"outfit_id": outfit["id"]},
            headers=_auth(a["access_token"]),
        )
        assert res.status_code == 201
        assert res.json()["id"] == outfit["id"]

    def test_get_board_outfits(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/test.jpg")
        a = _register(client, USER_A)
        board = _create_board(client, a["access_token"]).json()
        outfit = _post_outfit(client, a["access_token"]).json()
        client.post(
            f"{BOARDS_URL}/{board['id']}/outfits",
            params={"outfit_id": outfit["id"]},
            headers=_auth(a["access_token"]),
        )
        res = client.get(f"{BOARDS_URL}/{board['id']}/outfits", headers=_auth(a["access_token"]))
        assert res.status_code == 200
        data = res.json()
        assert len(data["outfits"]) == 1
        assert data["outfits"][0]["id"] == outfit["id"]

    def test_add_outfit_non_member_forbidden(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/test.jpg")
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        board = _create_board(client, a["access_token"]).json()
        outfit = _post_outfit(client, a["access_token"]).json()
        res = client.post(
            f"{BOARDS_URL}/{board['id']}/outfits",
            params={"outfit_id": outfit["id"]},
            headers=_auth(b["access_token"]),
        )
        assert res.status_code == 403

    def test_add_nonexistent_outfit_404(self, client):
        a = _register(client, USER_A)
        board = _create_board(client, a["access_token"]).json()
        res = client.post(
            f"{BOARDS_URL}/{board['id']}/outfits",
            params={"outfit_id": "00000000-0000-0000-0000-000000000000"},
            headers=_auth(a["access_token"]),
        )
        assert res.status_code == 404

    def test_remove_outfit_from_board(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/test.jpg")
        a = _register(client, USER_A)
        board = _create_board(client, a["access_token"]).json()
        outfit = _post_outfit(client, a["access_token"]).json()
        client.post(
            f"{BOARDS_URL}/{board['id']}/outfits",
            params={"outfit_id": outfit["id"]},
            headers=_auth(a["access_token"]),
        )
        res = client.delete(
            f"{BOARDS_URL}/{board['id']}/outfits/{outfit['id']}",
            headers=_auth(a["access_token"]),
        )
        assert res.status_code == 204
        # Verify gone
        outfits = client.get(f"{BOARDS_URL}/{board['id']}/outfits", headers=_auth(a["access_token"])).json()
        assert len(outfits["outfits"]) == 0

    def test_pin_outfit_creator_only(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/test.jpg")
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        board = _create_board(client, a["access_token"]).json()
        client.post(f"{BOARDS_URL}/invite/{board['invite_code']}/join", headers=_auth(b["access_token"]))
        outfit = _post_outfit(client, a["access_token"]).json()
        client.post(
            f"{BOARDS_URL}/{board['id']}/outfits",
            params={"outfit_id": outfit["id"]},
            headers=_auth(a["access_token"]),
        )
        # Creator can pin
        res = client.patch(
            f"{BOARDS_URL}/{board['id']}/outfits/{outfit['id']}/pin",
            json={"pinned": True},
            headers=_auth(a["access_token"]),
        )
        assert res.status_code == 200
        # Member cannot pin
        res = client.patch(
            f"{BOARDS_URL}/{board['id']}/outfits/{outfit['id']}/pin",
            json={"pinned": False},
            headers=_auth(b["access_token"]),
        )
        assert res.status_code == 403

    def test_pinned_outfits_appear_first(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/test.jpg")
        a = _register(client, USER_A)
        board = _create_board(client, a["access_token"]).json()
        outfit1 = _post_outfit(client, a["access_token"], "first").json()
        outfit2 = _post_outfit(client, a["access_token"], "second").json()
        client.post(f"{BOARDS_URL}/{board['id']}/outfits", params={"outfit_id": outfit1["id"]}, headers=_auth(a["access_token"]))
        client.post(f"{BOARDS_URL}/{board['id']}/outfits", params={"outfit_id": outfit2["id"]}, headers=_auth(a["access_token"]))
        # Pin outfit1
        client.patch(
            f"{BOARDS_URL}/{board['id']}/outfits/{outfit1['id']}/pin",
            json={"pinned": True},
            headers=_auth(a["access_token"]),
        )
        res = client.get(f"{BOARDS_URL}/{board['id']}/outfits", headers=_auth(a["access_token"]))
        outfits = res.json()["outfits"]
        assert outfits[0]["id"] == outfit1["id"]  # pinned appears first


# ── Delete Board ──────────────────────────────────────────────────────────────

class TestDeleteBoard:
    def test_creator_can_delete_board(self, client):
        a = _register(client, USER_A)
        board = _create_board(client, a["access_token"]).json()
        res = client.delete(f"{BOARDS_URL}/{board['id']}", headers=_auth(a["access_token"]))
        assert res.status_code == 204

    def test_member_cannot_delete_board(self, client):
        a = _register(client, USER_A)
        b = _register(client, USER_B)
        board = _create_board(client, a["access_token"]).json()
        client.post(f"{BOARDS_URL}/invite/{board['invite_code']}/join", headers=_auth(b["access_token"]))
        res = client.delete(f"{BOARDS_URL}/{board['id']}", headers=_auth(b["access_token"]))
        assert res.status_code == 403

    def test_deleted_board_returns_404(self, client):
        a = _register(client, USER_A)
        board = _create_board(client, a["access_token"]).json()
        client.delete(f"{BOARDS_URL}/{board['id']}", headers=_auth(a["access_token"]))
        res = client.get(f"{BOARDS_URL}/{board['id']}", headers=_auth(a["access_token"]))
        assert res.status_code == 404
