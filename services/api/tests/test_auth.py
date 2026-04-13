"""
Auth integration tests — covers all five endpoints against a real
Postgres test database with a full request/response cycle.

Each test class is isolated: the conftest wipes all rows between tests.
"""

REGISTER_URL = "/auth/register"
LOGIN_URL = "/auth/login"
REFRESH_URL = "/auth/refresh"
LOGOUT_URL = "/auth/logout"
ME_URL = "/auth/me"

VALID_USER = {
    "username": "testuser",
    "email": "test@example.com",
    "password": "securepassword123",
}


# ------------------------------------------------------------------ helpers


def _register(client, payload=None):
    return client.post(REGISTER_URL, json=payload or VALID_USER)


def _login(client, email=None, password=None):
    return client.post(
        LOGIN_URL,
        json={
            "email": email or VALID_USER["email"],
            "password": password or VALID_USER["password"],
        },
    )


def _bearer(token):
    return {"Authorization": f"Bearer {token}"}


# ------------------------------------------------------------------ register


class TestRegister:
    def test_success_returns_201_with_token_and_user(self, client):
        res = _register(client)
        assert res.status_code == 201
        data = res.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == VALID_USER["email"]
        assert data["user"]["username"] == VALID_USER["username"]

    def test_password_never_returned(self, client):
        res = _register(client)
        user = res.json()["user"]
        assert "password" not in user
        assert "password_hash" not in user

    def test_sets_refresh_cookie(self, client):
        _register(client)
        assert "refresh_token" in client.cookies

    def test_duplicate_email_returns_409(self, client):
        _register(client)
        res = _register(client, {**VALID_USER, "username": "otherusername"})
        assert res.status_code == 409
        assert "email" in res.json()["detail"].lower()

    def test_duplicate_username_returns_409(self, client):
        _register(client)
        res = _register(client, {**VALID_USER, "email": "other@example.com"})
        assert res.status_code == 409
        assert "username" in res.json()["detail"].lower()

    def test_invalid_email_returns_422(self, client):
        res = _register(client, {**VALID_USER, "email": "not-an-email"})
        assert res.status_code == 422

    def test_short_password_returns_422(self, client):
        res = _register(client, {**VALID_USER, "password": "short"})
        assert res.status_code == 422

    def test_short_username_returns_422(self, client):
        res = _register(client, {**VALID_USER, "username": "ab"})
        assert res.status_code == 422

    def test_missing_fields_returns_422(self, client):
        res = client.post(REGISTER_URL, json={"email": "test@example.com"})
        assert res.status_code == 422


# ------------------------------------------------------------------ login


class TestLogin:
    def test_success_returns_200_with_token_and_user(self, client):
        _register(client)
        res = _login(client)
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["user"]["email"] == VALID_USER["email"]

    def test_sets_refresh_cookie(self, client):
        _register(client)
        _login(client)
        assert "refresh_token" in client.cookies

    def test_wrong_password_returns_401(self, client):
        _register(client)
        res = _login(client, password="wrongpassword")
        assert res.status_code == 401
        assert "invalid" in res.json()["detail"].lower()

    def test_wrong_email_returns_401(self, client):
        _register(client)
        res = _login(client, email="nobody@example.com")
        assert res.status_code == 401

    def test_unregistered_user_returns_401(self, client):
        res = _login(client)
        assert res.status_code == 401

    def test_password_never_returned(self, client):
        _register(client)
        res = _login(client)
        user = res.json()["user"]
        assert "password_hash" not in user


# ------------------------------------------------------------------ refresh


class TestRefresh:
    def test_success_returns_new_access_token(self, client):
        _register(client)
        res = client.post(REFRESH_URL)
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_rotates_refresh_cookie(self, client):
        _register(client)
        old_cookie = client.cookies.get("refresh_token")
        client.post(REFRESH_URL)
        new_cookie = client.cookies.get("refresh_token")
        assert new_cookie is not None
        assert old_cookie != new_cookie

    def test_no_cookie_returns_401(self, client):
        res = client.post(REFRESH_URL)
        assert res.status_code == 401
        assert "missing" in res.json()["detail"].lower()

    def test_revoked_token_returns_401(self, client):
        # After rotation the old token is revoked in the DB.
        # Grab it before it's overwritten, then replay it.
        _register(client)
        old_token = client.cookies.get("refresh_token")
        client.post(REFRESH_URL)  # rotates — old_token is now revoked
        client.cookies.set("refresh_token", old_token, path="/auth")
        res = client.post(REFRESH_URL)
        assert res.status_code == 401
        assert "revoked" in res.json()["detail"].lower()

    def test_rotated_token_can_refresh_again(self, client):
        _register(client)
        client.post(REFRESH_URL)
        res = client.post(REFRESH_URL)
        assert res.status_code == 200


# ------------------------------------------------------------------ logout


class TestLogout:
    def test_success_returns_200(self, client):
        _register(client)
        res = client.post(LOGOUT_URL)
        assert res.status_code == 200
        assert res.json()["message"] == "Logged out."

    def test_clears_refresh_cookie(self, client):
        _register(client)
        client.post(LOGOUT_URL)
        assert not client.cookies.get("refresh_token")

    def test_refresh_fails_after_logout(self, client):
        _register(client)
        client.post(LOGOUT_URL)
        res = client.post(REFRESH_URL)
        assert res.status_code == 401

    def test_no_cookie_still_returns_200(self, client):
        """Logout is lenient — missing cookie should not error."""
        res = client.post(LOGOUT_URL)
        assert res.status_code == 200


# ------------------------------------------------------------------ me


class TestMe:
    def test_success_returns_current_user(self, client):
        res = _register(client)
        token = res.json()["access_token"]
        me = client.get(ME_URL, headers=_bearer(token))
        assert me.status_code == 200
        data = me.json()
        assert data["email"] == VALID_USER["email"]
        assert data["username"] == VALID_USER["username"]

    def test_password_hash_never_returned(self, client):
        res = _register(client)
        token = res.json()["access_token"]
        me = client.get(ME_URL, headers=_bearer(token))
        assert "password_hash" not in me.json()

    def test_no_token_returns_401(self, client):
        res = client.get(ME_URL)
        assert res.status_code == 401

    def test_invalid_token_returns_401(self, client):
        res = client.get(ME_URL, headers=_bearer("not.a.real.token"))
        assert res.status_code == 401

    def test_malformed_auth_header_returns_401(self, client):
        res = client.get(ME_URL, headers={"Authorization": "Basic sometoken"})
        assert res.status_code == 401

    def test_new_token_from_refresh_works_on_me(self, client):
        """Token issued by /auth/refresh should be valid on protected routes."""
        _register(client)
        refresh_res = client.post(REFRESH_URL)
        new_token = refresh_res.json()["access_token"]
        me = client.get(ME_URL, headers=_bearer(new_token))
        assert me.status_code == 200
