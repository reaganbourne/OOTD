# Auth API Contract

This document defines the request and response shapes for all authentication endpoints.
It is the source of truth for `@otthomas` building the typed API client (Issue 11) and
`@reaganbourne` implementing the JWT auth flow (Issue 12).

## Base URL

```
http://localhost:8000   (local dev)
https://api.ootd.app   (production — TBD on Railway)
```

All endpoints are prefixed with `/auth`.

## Token strategy

- **Access token** — short-lived JWT (15 minutes). Returned in the response body.
  Send on every authenticated request as `Authorization: Bearer <access_token>`.
- **Refresh token** — longer-lived (7 days). Sent and received as an `httpOnly` cookie
  named `refresh_token`. The browser handles it automatically — never stored in JS.
- **`confirmPassword`** — frontend-only field. Strip it before sending to the API.

---

## Endpoints

### POST /auth/register

Create a new account.

**Request**
```json
{
  "username": "closetmaincharacter",
  "email": "user@example.com",
  "password": "mysecurepassword"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `username` | string | yes | min 3 characters |
| `email` | string | yes | must be a valid email |
| `password` | string | yes | min 8 characters |

**Response `201 Created`**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "018e9b3e-1234-7000-abcd-ef0123456789",
    "username": "closetmaincharacter",
    "email": "user@example.com"
  }
}
```

Sets `Set-Cookie: refresh_token=<token>; HttpOnly; Path=/auth/refresh; SameSite=Lax`

**Error responses**

| Status | `detail` | Cause |
|---|---|---|
| `409 Conflict` | `"Email already registered."` | Duplicate email |
| `409 Conflict` | `"Username already taken."` | Duplicate username |
| `422 Unprocessable Entity` | _(field-level errors from FastAPI)_ | Validation failure |

---

### POST /auth/login

Sign in with email and password.

**Request**
```json
{
  "email": "user@example.com",
  "password": "mysecurepassword"
}
```

| Field | Type | Required |
|---|---|---|
| `email` | string | yes |
| `password` | string | yes |

**Response `200 OK`**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "018e9b3e-1234-7000-abcd-ef0123456789",
    "username": "closetmaincharacter",
    "email": "user@example.com"
  }
}
```

Sets `Set-Cookie: refresh_token=<token>; HttpOnly; Path=/auth/refresh; SameSite=Lax`

**Error responses**

| Status | `detail` | Cause |
|---|---|---|
| `401 Unauthorized` | `"Invalid email or password."` | Wrong credentials |
| `422 Unprocessable Entity` | _(field-level errors from FastAPI)_ | Validation failure |

---

### POST /auth/refresh

Exchange a valid refresh token cookie for a new access token.
No request body needed — the browser sends the `refresh_token` cookie automatically.

**Request**

_(no body — refresh token is sent as an httpOnly cookie)_

**Response `200 OK`**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

Rotates the refresh token: clears the old cookie and sets a new one.

**Error responses**

| Status | `detail` | Cause |
|---|---|---|
| `401 Unauthorized` | `"Refresh token missing."` | No cookie present |
| `401 Unauthorized` | `"Refresh token expired or revoked."` | Token is stale or logged out |

---

### POST /auth/logout

Revoke the current session. Clears the refresh token cookie and marks the session
as revoked in the database.

**Request**

_(no body — refresh token is read from the httpOnly cookie)_

**Response `200 OK`**
```json
{
  "message": "Logged out."
}
```

Clears `Set-Cookie: refresh_token=; HttpOnly; Max-Age=0`

**Error responses**

| Status | `detail` | Cause |
|---|---|---|
| `401 Unauthorized` | `"Refresh token missing."` | No cookie present |

---

### GET /auth/me

Return the currently authenticated user.
Requires a valid access token in the `Authorization` header.

**Request headers**
```
Authorization: Bearer <access_token>
```

**Response `200 OK`**
```json
{
  "id": "018e9b3e-1234-7000-abcd-ef0123456789",
  "username": "closetmaincharacter",
  "email": "user@example.com",
  "display_name": "Main Character",
  "bio": "outfits only ✨",
  "profile_image_url": "https://..."
}
```

`display_name`, `bio`, and `profile_image_url` may be `null` until the user completes
their profile.

**Error responses**

| Status | `detail` | Cause |
|---|---|---|
| `401 Unauthorized` | `"Not authenticated."` | Missing or invalid token |
| `401 Unauthorized` | `"Token expired."` | Access token has expired — client should refresh |

---

## Error shape

All errors follow FastAPI's default shape:

```json
{
  "detail": "Human-readable message."
}
```

For validation errors (422), FastAPI returns the standard structured format:

```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

The API client should handle both shapes. Treat any non-`ok` response without a
`detail` array as a flat string error.

---

## Notes for @otthomas (Issue 11)

- The existing `mockSubmitAuth` in `apps/web/lib/auth.ts` already returns
  `{ ok, message, errors? }`. Keep that shape in the API client so `auth-form.tsx`
  needs minimal changes.
- `confirmPassword` is validated on the frontend and **never sent to the API**.
- On a `401` from any protected endpoint, attempt `POST /auth/refresh` once, then
  retry the original request. If refresh also fails, redirect to `/login`.
- The refresh token cookie is `httpOnly` — you cannot read it from JS. Just call
  `POST /auth/refresh` and the browser sends it automatically.
- Local dev API base URL: `http://localhost:8000`. Wire via `NEXT_PUBLIC_API_URL`
  env var.
