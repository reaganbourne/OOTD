"""Tests for GET /users/me/wrapped.

The wrapped endpoint returns the Monthly Fits Wrapped schema:
  year, month (ints), total_outfits, total_items,
  top_colors / top_brands / top_categories (lists of {value, count} objects),
  longest_streak, current_streak, most_worn_vibe, outfits_by_week.
"""

import io

REGISTER_URL = "/auth/register"
CREATE_OUTFIT_URL = "/outfits"
WRAPPED_URL = "/users/me/wrapped"

USER_A = {"username": "usera", "email": "a@example.com", "password": "password12345"}


def _register(client, payload):
    res = client.post(REGISTER_URL, json=payload)
    assert res.status_code == 201
    return res.json()


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _post_outfit(client, token, metadata: dict | None = None):
    import json
    meta = json.dumps(metadata or {})
    fake_image = io.BytesIO(b"fake-image-data")
    return client.post(
        CREATE_OUTFIT_URL,
        headers=_auth(token),
        files={"image": ("test.jpg", fake_image, "image/jpeg")},
        data={"metadata": meta},
    )


def _mock_upload(monkeypatch):
    monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/test.jpg")
    monkeypatch.setattr("app.routers.outfits.run_vibe_check", lambda **kw: (None, None))


class TestWrapped:
    def test_requires_auth(self, client):
        res = client.get(WRAPPED_URL, params={"month": "2026-04"})
        assert res.status_code == 401

    def test_invalid_month_format_returns_422(self, client):
        a = _register(client, USER_A)
        for bad in ["2026", "04-2026", "not-a-month", "2026-13"]:
            res = client.get(WRAPPED_URL, params={"month": bad}, headers=_auth(a["access_token"]))
            assert res.status_code == 422, f"expected 422 for month={bad!r}"

    def test_empty_month_returns_zeroes(self, client):
        a = _register(client, USER_A)
        res = client.get(WRAPPED_URL, params={"month": "2020-01"}, headers=_auth(a["access_token"]))
        assert res.status_code == 200
        body = res.json()
        assert body["year"] == 2020
        assert body["month"] == 1
        assert body["total_outfits"] == 0
        assert body["total_items"] == 0
        assert body["top_colors"] == []
        assert body["top_brands"] == []
        assert body["top_categories"] == []
        assert body["most_worn_vibe"] is None
        assert body["longest_streak"] == 0
        assert body["current_streak"] == 0
        assert body["outfits_by_week"] == []

    def test_total_outfits_count(self, client, monkeypatch):
        _mock_upload(monkeypatch)
        a = _register(client, USER_A)
        for i in range(3):
            _post_outfit(client, a["access_token"], {"worn_on": "2026-04-01"})
        res = client.get(WRAPPED_URL, params={"month": "2026-04"}, headers=_auth(a["access_token"]))
        assert res.json()["total_outfits"] == 3

    def test_top_colors_ordered_by_frequency(self, client, monkeypatch):
        _mock_upload(monkeypatch)
        a = _register(client, USER_A)
        # 3 outfits with black, 2 with white, 1 with blue
        for _ in range(3):
            _post_outfit(client, a["access_token"], {
                "worn_on": "2026-04-01",
                "clothing_items": [{"category": "top", "color": "black"}],
            })
        for _ in range(2):
            _post_outfit(client, a["access_token"], {
                "worn_on": "2026-04-02",
                "clothing_items": [{"category": "top", "color": "white"}],
            })
        _post_outfit(client, a["access_token"], {
            "worn_on": "2026-04-03",
            "clothing_items": [{"category": "top", "color": "blue"}],
        })
        res = client.get(WRAPPED_URL, params={"month": "2026-04"}, headers=_auth(a["access_token"]))
        top_colors = res.json()["top_colors"]
        assert [c["color"] for c in top_colors] == ["black", "white", "blue"]
        assert [c["count"] for c in top_colors] == [3, 2, 1]

    def test_top_brands(self, client, monkeypatch):
        _mock_upload(monkeypatch)
        a = _register(client, USER_A)
        for _ in range(2):
            _post_outfit(client, a["access_token"], {
                "worn_on": "2026-04-01",
                "clothing_items": [{"category": "top", "brand": "Zara"}],
            })
        _post_outfit(client, a["access_token"], {
            "worn_on": "2026-04-02",
            "clothing_items": [{"category": "top", "brand": "Nike"}],
        })
        res = client.get(WRAPPED_URL, params={"month": "2026-04"}, headers=_auth(a["access_token"]))
        top_brands = res.json()["top_brands"]
        assert top_brands[0]["brand"] == "Zara"
        assert top_brands[0]["count"] == 2

    def test_top_categories(self, client, monkeypatch):
        _mock_upload(monkeypatch)
        a = _register(client, USER_A)
        for _ in range(2):
            _post_outfit(client, a["access_token"], {
                "worn_on": "2026-04-01",
                "clothing_items": [{"category": "top"}],
            })
        _post_outfit(client, a["access_token"], {
            "worn_on": "2026-04-02",
            "clothing_items": [{"category": "shoes"}],
        })
        res = client.get(WRAPPED_URL, params={"month": "2026-04"}, headers=_auth(a["access_token"]))
        top_categories = res.json()["top_categories"]
        assert top_categories[0]["category"] == "top"
        assert top_categories[0]["count"] == 2

    def test_most_worn_vibe(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.outfits.upload_image", lambda **kw: "https://s3.example.com/test.jpg")
        call_count = {"n": 0}

        def fake_vibe(**kw):
            call_count["n"] += 1
            return ("casual vibes", "casual") if call_count["n"] <= 2 else ("formal look", "formal")

        monkeypatch.setattr("app.routers.outfits.run_vibe_check", fake_vibe)

        a = _register(client, USER_A)
        for _ in range(2):
            _post_outfit(client, a["access_token"], {"worn_on": "2026-04-01"})
        _post_outfit(client, a["access_token"], {"worn_on": "2026-04-02"})

        res = client.get(WRAPPED_URL, params={"month": "2026-04"}, headers=_auth(a["access_token"]))
        assert res.json()["most_worn_vibe"] == "casual"

    def test_longest_streak(self, client, monkeypatch):
        _mock_upload(monkeypatch)
        a = _register(client, USER_A)
        # Days 1, 2, 3 → streak of 3; then gap; day 5 → streak of 1
        for day in ["2026-04-01", "2026-04-02", "2026-04-03", "2026-04-05"]:
            _post_outfit(client, a["access_token"], {"worn_on": day})
        res = client.get(WRAPPED_URL, params={"month": "2026-04"}, headers=_auth(a["access_token"]))
        assert res.json()["longest_streak"] == 3

    def test_total_items_counted(self, client, monkeypatch):
        _mock_upload(monkeypatch)
        a = _register(client, USER_A)
        # One outfit with 2 items, one with 1 item → 3 total
        _post_outfit(client, a["access_token"], {
            "worn_on": "2026-04-01",
            "clothing_items": [
                {"category": "top", "brand": "Zara"},
                {"category": "bottom", "brand": "Levi's"},
            ],
        })
        _post_outfit(client, a["access_token"], {
            "worn_on": "2026-04-02",
            "clothing_items": [{"category": "shoes"}],
        })
        res = client.get(WRAPPED_URL, params={"month": "2026-04"}, headers=_auth(a["access_token"]))
        assert res.json()["total_items"] == 3

    def test_outfits_by_week(self, client, monkeypatch):
        _mock_upload(monkeypatch)
        a = _register(client, USER_A)
        # week 1 (day 3) x2, week 3 (day 17) x1
        _post_outfit(client, a["access_token"], {"worn_on": "2026-04-03"})
        _post_outfit(client, a["access_token"], {"worn_on": "2026-04-03"})
        _post_outfit(client, a["access_token"], {"worn_on": "2026-04-17"})
        res = client.get(WRAPPED_URL, params={"month": "2026-04"}, headers=_auth(a["access_token"]))
        by_week = {w["week"]: w["count"] for w in res.json()["outfits_by_week"]}
        assert by_week[1] == 2
        assert by_week[3] == 1

    def test_year_and_month_in_response(self, client):
        a = _register(client, USER_A)
        res = client.get(WRAPPED_URL, params={"month": "2026-04"}, headers=_auth(a["access_token"]))
        body = res.json()
        assert body["year"] == 2026
        assert body["month"] == 4

    def test_outfits_from_other_months_excluded(self, client, monkeypatch):
        _mock_upload(monkeypatch)
        a = _register(client, USER_A)
        _post_outfit(client, a["access_token"], {"worn_on": "2026-03-15"})  # March
        _post_outfit(client, a["access_token"], {"worn_on": "2026-04-10"})  # April
        res = client.get(WRAPPED_URL, params={"month": "2026-04"}, headers=_auth(a["access_token"]))
        assert res.json()["total_outfits"] == 1
