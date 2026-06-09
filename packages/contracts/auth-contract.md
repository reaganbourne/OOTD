# Auth API Contract

Request/response shapes for all authentication endpoints.

All endpoints are prefixed with `/auth`.

## Token strategy

- **Access token** — short-lived JWT (15 min). Returned in the response body. Send as `Authorization: Bearer <token>`.
- **Refresh token** — longer-lived (7 days). Sent and received as an `httpOnly` cookie named `refresh_token`. The browser handles it automatically.
- **`confirmPassword`** — frontend-only. Strip it before sending to the API.

---

## POST /auth/register

Create a new account.

**Request**
```json
{
  "username": "closetmaincharacter",
  "email": "user@example.com",
  "password": "mysecurepassword"
}
```

| Field | Type | Notes |
|---|---|---|
| `username` | string | min 3 characters |
| `email` | string | valid email |
| `password` | string | 12–72 bytes |

**Response `201 Created`**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": { "id": "...", "username": "closetmaincharacter", "email": "user@example.com" }
}
```

Sets `Set-Cookie: refresh_token=...; HttpOnly; Path=/`.

**Errors**

| Status | `detail` |
|---|---|
| `409` | `"Email already registered."` |
| `409` | `"Username already taken."` |
| `422` | field-level validation errors |

---

## POST /auth/login

Sign in with email or username.

**Request**
```json
{
  "identifier": "user@example.com",
  "password": "mysecurepassword"
}
```

`identifier` accepts either an email address or a username.

**Response `200 OK`**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": { "id": "...", "username": "closetmaincharacter", "email": "user@example.com" }
}
```

**Errors**

| Status | `detail` |
|---|---|
| `401` | `"Invalid email or password."` |

---

## POST /auth/refresh

Exchange a valid refresh token cookie for a new access token and user object.

**Request** — no body, browser sends cookie automatically.

**Response `200 OK`**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": { "id": "...", "username": "closetmaincharacter", "email": "user@example.com" }
}
```

Rotates the refresh token cookie.

**Errors**

| Status | `detail` |
|---|---|
| `401` | `"Refresh token missing."` |
| `401` | `"Refresh token expired or revoked."` |

---

## POST /auth/logout

Revoke the current session. Clears the refresh cookie.

**Request** — no body.

**Response `200 OK`**
```json
{ "message": "Logged out." }
```

---

## GET /auth/me

Return the authenticated user. Requires `Authorization: Bearer <token>`.

**Response `200 OK`**
```json
{
  "id": "...",
  "username": "closetmaincharacter",
  "email": "user@example.com",
  "display_name": "Main Character",
  "bio": "outfits only",
  "profile_image_url": "https://...",
  "is_admin": false
}
```

---

## POST /auth/forgot-password

Send a password reset email.

**Request**
```json
{ "email": "user@example.com" }
```

**Response `200 OK`** — always returns success to avoid email enumeration.
```json
{ "message": "If that email is registered, a reset link has been sent." }
```

---

## POST /auth/reset-password

Set a new password using a reset token.

**Request**
```json
{
  "token": "<reset_token_from_email>",
  "new_password": "mynewpassword"
}
```

**Response `200 OK`**
```json
{ "message": "Password updated. You can now log in." }
```

**Errors**

| Status | `detail` |
|---|---|
| `400` | `"Reset token is invalid or has expired."` |

---

## Error shape

```json
{ "detail": "Human-readable message." }
```

For validation errors (422):
```json
{
  "detail": [
    { "loc": ["body", "email"], "msg": "value is not a valid email address", "type": "value_error.email" }
  ]
}
```
