# OOTD GitHub Issues — Updated Descriptions and New Issues

This document contains updated body copy for all 7 open issues and a set of new issues to create, all grounded in the current codebase state.

Apply each section by editing the corresponding GitHub issue or creating a new one at `https://github.com/reaganbourne/OOTD/issues`.

---

## Updates to Existing Open Issues

### Issue #7 — Create Docker Compose local stack

**Assignee:** `@reaganbourne`
**Labels:** `phase-1`, `infra`, `backend`, `priority:high`

**Body:**

Add a `docker-compose.yml` at the repo root that gives both developers a single-command local backend environment. The repo currently has `services/api/` (empty FastAPI scaffold) and `packages/db/` (empty), with `.env.example` at the root. This stack needs to wire those together with a Postgres instance so backend development does not depend on a locally-installed database.

**Acceptance criteria:**
- `docker compose up` starts the API service and a Postgres container
- Postgres is reachable from the API container using env-var-configured credentials
- All environment variables are read from `.env`, matching the keys in `.env.example`
- A health check is defined for the Postgres service
- A `volumes:` block persists Postgres data across restarts for local dev
- The API container mounts `services/api/` as a live volume so code changes reload without a full rebuild
- A short usage note is added to the root `README.md` or `services/api/README.md`

**Blocked by:** Nothing — can start immediately.

---

### Issue #8 — Scaffold FastAPI service

**Assignee:** `@reaganbourne`
**Labels:** `phase-1`, `backend`, `priority:high`

**Body:**

Create the initial FastAPI application structure inside `services/api/`. The directory currently contains only a `README.md`. This scaffold is the prerequisite for all backend work including auth implementation, database wiring, and CI.

**Acceptance criteria:**
- `pyproject.toml` (or `requirements.txt`) with FastAPI, Uvicorn, python-dotenv, and a test runner (pytest) pinned
- Application entrypoint at `services/api/app/main.py` (or equivalent) that creates the FastAPI app and mounts routers
- Config loading from environment variables using a settings module
- A `GET /health` endpoint that returns `{"status": "ok"}`
- Router stubs for `auth` and `outfits` even if no routes are implemented yet
- A shared `app/dependencies.py` for future DB session and auth injection
- Project structure is test-ready: a `tests/` directory with a placeholder test that can be run with `pytest`
- `services/api/README.md` updated with local run and test instructions

**Blocked by:** Nothing — can start immediately.

---

### Issue #9 — Define auth API contract

**Assignee:** `@reaganbourne`
**Labels:** `phase-1`, `backend`, `docs`, `needs-contract`

**Body:**

Lock the request and response shapes for all auth endpoints so the frontend can wire the existing auth screens to real API calls. The frontend auth screens are already merged and use a mock submit layer (`apps/web/lib/auth.ts → mockSubmitAuth`). The signup form captures `username`, `email`, `password`, and `confirmPassword`. The login form captures `email` and `password`. The real contract needs to match these field names.

**Endpoints to define:**
- `POST /auth/register` — accepts `{ username, email, password }`, returns user object and access token
- `POST /auth/login` — accepts `{ email, password }`, returns access token and sets refresh token cookie (or returns both)
- `POST /auth/refresh` — uses refresh token to issue a new access token
- `POST /auth/logout` — invalidates the current refresh session
- `GET /auth/me` — returns the current authenticated user object

**Acceptance criteria:**
- A contract document is added to `packages/contracts/` (e.g., `auth-contract.md` or `auth.json`) with example request and response payloads for every endpoint above
- Error response shape is consistent: `{ detail: string }` or a structured equivalent — pick one and document it
- The field names in the contract match what the frontend already sends: `username`, `email`, `password`
- `confirmPassword` is a frontend-only field — document that it is stripped before the API call
- Both `@otthomas` and `@reaganbourne` sign off before implementation of #11 or #12 begins

**Blocked by:** Nothing — can start immediately.

---

### Issue #10 — Add Alembic baseline and initial migrations

**Assignee:** `@otthomas`
**Labels:** `phase-1`, `database`, `priority:high`

**Body:**

Set up Alembic inside `packages/db/` and add the initial migration for the V1 schema. The schema is already designed and documented in `docs/db-v1-schema.md`. The following tables are ready to migrate: `users`, `refresh_sessions`, `outfits`, `clothing_items`, `follows`, `likes`, `comments`.

**Acceptance criteria:**
- Alembic is initialized in `packages/db/` with `alembic.ini` and `alembic/env.py`
- `DATABASE_URL` (or equivalent) is read from the environment, not hardcoded
- The initial migration creates all seven V1 tables with columns, constraints, and indexes as documented in `docs/db-v1-schema.md`
- `alembic upgrade head` applied to a fresh Postgres instance creates the full schema
- `alembic downgrade -1` reverts cleanly for development use
- SQLAlchemy models (or at minimum Base declarations) exist in `packages/db/` to support the env.py autogenerate target

**Blocked by:** `#8` (FastAPI scaffold) — migration file placement and the Python project structure in `services/api/` need to exist first so the shared database package integrates cleanly.

---

### Issue #11 — Build typed API client for web

**Assignee:** `@otthomas`
**Labels:** `phase-1`, `frontend`

**Body:**

Replace the mock auth layer in `apps/web/lib/auth.ts` with a real, reusable API client that the auth screens (and future screens) can use. Currently `auth-form.tsx` calls `mockSubmitAuth`, which simulates network delay and fake success/error states. Once the auth contract (#9) is locked, this mock needs to be replaced with real `fetch`-based calls. The QA notes panel in `auth-form.tsx` should also be removed when real wiring is in place.

**Acceptance criteria:**
- A shared client utility exists (e.g., `apps/web/lib/api-client.ts`) with base URL configuration from an environment variable (`NEXT_PUBLIC_API_URL`)
- Auth methods (`register`, `login`, `refresh`, `logout`, `me`) are implemented against the contract defined in #9
- The 401 automatic refresh path is supported: on a 401 response, attempt `POST /auth/refresh` once, then retry the original request
- Errors are normalized so all call sites receive a consistent `{ ok, message, errors? }` shape — matching what `mockSubmitAuth` currently returns, so the form component (`auth-form.tsx`) requires minimal changes
- The mock QA notes panel in `auth-form.tsx` is removed once the real client is wired
- The form's intro copy in `auth-form.tsx` (currently references "mocked flow" and "wiring to the real API comes next") is updated to reflect the live integration

**Blocked by:** `#9` (auth API contract must be frozen before wiring begins).

---

### Issue #12 — Implement JWT auth flow

**Assignee:** `@reaganbourne`
**Labels:** `phase-1`, `backend`, `priority:high`

**Body:**

Implement the full auth backend using the contract defined in #9. The database schema already specifies the relevant tables: `users` (with `password_hash`) and `refresh_sessions` (with `token_hash`, `expires_at`, `revoked_at`, `user_id`). The FastAPI service scaffold (#8) must exist before this work begins.

**Acceptance criteria:**
- `POST /auth/register`: creates a `users` row with bcrypt-hashed password, returns an access token and user object
- `POST /auth/login`: verifies credentials against `users.password_hash`, issues a short-lived JWT access token and a longer-lived refresh token stored as a hashed value in `refresh_sessions`
- `POST /auth/refresh`: validates the refresh token hash against `refresh_sessions`, checks `expires_at` and `revoked_at`, issues a new access token (and rotates the refresh token if using rotation)
- `POST /auth/logout`: sets `revoked_at` on the current refresh session
- `GET /auth/me`: protected endpoint that returns the current user from the access token claim
- A reusable `get_current_user` FastAPI dependency is implemented for use on future protected routes
- Passwords are never stored or logged in plaintext
- Tokens are signed with a secret loaded from environment variables

**Blocked by:** `#8` (FastAPI scaffold) and `#9` (auth API contract).

---

### Issue #13 — Add auth smoke tests and CI hook

**Assignee:** `@reaganbourne`
**Labels:** `phase-1`, `testing`, `backend`

**Body:**

Add smoke test coverage for the auth endpoints and a GitHub Actions workflow that runs tests on every pull request. The repo currently has no `.github/workflows/` directory and no test configuration.

**Acceptance criteria:**
- `tests/test_auth.py` (or equivalent) covers: register, login, token refresh, logout, and a protected route accessed with and without a valid token
- Duplicate email registration returns the appropriate error
- Invalid credentials on login return the appropriate error
- Expired or revoked refresh tokens are rejected
- A GitHub Actions workflow file (`.github/workflows/api-ci.yml`) runs `pytest` on every push and pull request targeting `main`
- The workflow installs dependencies, sets required test environment variables from GitHub Actions secrets or defaults, and fails the check if any test fails
- Basic testing instructions are added to `services/api/README.md`

**Blocked by:** `#12` (JWT auth flow must be implemented first).

---

## New Issues to Create

---

### New Issue — Add auth state management to the web app

**Suggested title:** `Add auth state management to web app`
**Assignee:** `@otthomas`
**Labels:** `phase-1`, `frontend`, `priority:high`

**Body:**

The web app currently has no auth state layer. After the typed API client (#11) is wired, there is no mechanism for storing the access token, tracking whether the user is logged in, or providing auth state to components. This issue adds that missing layer before any protected UI is built.

**Acceptance criteria:**
- A client-side auth context or store exists (e.g., React context in `apps/web/lib/auth-context.tsx`) that exposes `user`, `isAuthenticated`, `login()`, `logout()`, and `isLoading`
- The access token is stored securely (e.g., in memory or an `httpOnly` cookie approach is agreed with backend)
- `login()` calls the API client, stores the token, and updates the user state
- `logout()` calls `POST /auth/logout`, clears local state, and redirects to `/login`
- The context wraps the app in `apps/web/app/layout.tsx`

**Blocked by:** `#11` (typed API client).

---

### New Issue — Add Next.js route protection middleware

**Suggested title:** `Add Next.js route protection middleware`
**Assignee:** `@otthomas`
**Labels:** `phase-1`, `frontend`

**Body:**

The app currently has no route protection. Unauthenticated users can access any future protected route directly, and authenticated users are not redirected away from `/login` and `/signup`. Add Next.js middleware to handle both cases.

**Acceptance criteria:**
- `apps/web/middleware.ts` is added using the Next.js middleware API
- Requests to protected routes (e.g., `/feed`, `/vault`, `/upload`) without a valid auth token redirect to `/login`
- Requests to `/login` and `/signup` from an already-authenticated session redirect to `/` (or `/feed` once it exists)
- The middleware matcher is scoped correctly — it should not run on static assets or API routes
- Token validation in middleware uses a lightweight check (e.g., cookie presence or a short-lived session cookie from the backend)

**Blocked by:** Auth state layer (see auth state management issue above).

---

### New Issue — Update home page from scaffold placeholder to real landing

**Suggested title:** `Update home page from scaffold state to real landing page`
**Assignee:** `@otthomas`
**Labels:** `phase-1`, `frontend`

**Body:**

`apps/web/app/page.tsx` currently renders a placeholder designed for reviewing the auth screen scaffold. It contains developer-facing text ("Auth flow scaffold is ready for review", "Review login screen", "Review sign-up screen") that should not be the final home experience.

Once the auth wiring is in place, the home page should either redirect authenticated users to their feed and unauthenticated users to `/login`, or serve as the proper marketing landing page for the product.

**Acceptance criteria:**
- The developer scaffold copy is removed from `page.tsx`
- Authenticated users landing on `/` are redirected to `/feed` (or `/vault` if feed is not yet built)
- Unauthenticated users landing on `/` are redirected to `/login` or see a proper marketing landing screen
- The four product pillars (`Personal outfit vault`, `Event board coordination`, `AI vibe checks`, `Story card export`) are retained if the home page serves as the public landing

**Blocked by:** Auth state management and route protection issues above.

---

### New Issue — Add outfit and clothing item schema migration

**Suggested title:** `Add outfit and clothing item schema migration`
**Assignee:** `@otthomas`
**Labels:** `phase-2`, `database`, `priority:high`

**Body:**

Extend the database schema with the `outfits` and `clothing_items` tables. The V1 schema for these tables is already designed in `docs/db-v1-schema.md` and should be implemented as a second Alembic migration after the auth baseline (#10) is merged.

**Outfits table columns (from `docs/db-v1-schema.md`):** `id` UUID PK, `user_id` UUID FK → `users.id` ON DELETE CASCADE, `image_url` text not null, `caption` text, `event_name` text, `worn_on` date, `vibe_check_text` text, `vibe_check_tone` text, `created_at` timestamptz, `updated_at` timestamptz.

**Clothing items table columns:** `id` UUID PK, `outfit_id` UUID FK → `outfits.id` ON DELETE CASCADE, `brand` text, `category` text not null, `color` text, `display_order` integer default 0, `created_at` timestamptz.

**Acceptance criteria:**
- New Alembic migration creates both tables with columns, FK constraints, and indexes from `docs/db-v1-schema.md`
- Indexes: `outfits(user_id)`, `outfits(created_at)`, `outfits(user_id, worn_on desc)`, `clothing_items(outfit_id)`, `clothing_items(category)`, `clothing_items(color)`
- SQLAlchemy models for `Outfit` and `ClothingItem` are added to `packages/db/`
- `alembic upgrade head` runs cleanly on a database that already has the auth baseline applied
- `alembic downgrade -1` reverts cleanly

**Blocked by:** `#10` (Alembic baseline must be merged first).

---

### New Issue — Implement image storage adapter

**Suggested title:** `Implement image storage adapter`
**Assignee:** `@reaganbourne`
**Labels:** `phase-2`, `backend`, `infra`, `priority:high`

**Body:**

Build a storage abstraction in `services/api/` that handles image uploads for outfit photos. The initial implementation should write files to local disk for development and be designed so the underlying storage provider can be swapped for S3 or another object store in a later phase.

**Acceptance criteria:**
- A `StorageAdapter` interface (or abstract class) defines `upload(file, filename) → url` and `delete(url)` methods
- A `LocalStorageAdapter` implementation writes files to a configurable local directory and returns a URL accessible by the API
- The active adapter is selected from an environment variable (e.g., `STORAGE_BACKEND=local`)
- Multipart file upload is supported via a FastAPI endpoint helper or dependency
- File type validation rejects non-image MIME types with a clear error
- Uploaded file size is bounded by a configurable limit

**Blocked by:** `#8` (FastAPI scaffold).

---

### New Issue — Build outfit upload flow UI

**Suggested title:** `Build outfit upload flow UI`
**Assignee:** `@otthomas`
**Labels:** `phase-2`, `frontend`, `priority:high`

**Body:**

Create a multi-step outfit upload flow. The user should be able to select a photo, add clothing item tags (brand, category, color), optionally add an event name and date worn, and submit. This is the core action that drives all other features (feed, vault, boards, AI).

**Acceptance criteria:**
- Step 1: photo selection from device with image preview
- Step 2: clothing item tag input — add one or more items with brand (optional), category (required), and color (optional) fields; `display_order` matches the order items were added
- Step 3: outfit metadata — caption, event name, date worn (all optional)
- Step review / confirm: shows summary before submission
- Loading and error states are handled on submit
- Mobile layout is prioritized — the flow should feel native on a small screen
- Incomplete submissions (missing required photo or category) are blocked with clear messaging

**Blocked by:** `#9` (auth contract, for image upload endpoint shape).

---

### New Issue — Implement create-outfit endpoint

**Suggested title:** `Implement create-outfit endpoint`
**Assignee:** `@reaganbourne`
**Labels:** `phase-2`, `backend`, `priority:high`

**Body:**

Add the authenticated endpoint that accepts a multipart upload and creates an `outfits` record with associated `clothing_items`. This is the backend counterpart to the upload flow UI.

**Acceptance criteria:**
- `POST /outfits` accepts multipart form data: image file + JSON or form fields for caption, event_name, worn_on, and a list of clothing items
- The image is passed through the storage adapter (see image storage issue) and the returned URL is stored in `outfits.image_url`
- One `clothing_items` row is inserted per item in the payload, preserving `display_order`
- The endpoint requires authentication (`get_current_user` dependency)
- Non-image file types are rejected with a 422 error
- The response payload matches the shape the frontend upload flow UI expects

**Blocked by:** `#8` (FastAPI scaffold), `#12` (auth), storage adapter issue.

---

### New Issue — Build home feed grid

**Suggested title:** `Build home feed grid`
**Assignee:** `@otthomas`
**Labels:** `phase-2`, `frontend`

**Body:**

Build the main feed page at `/feed` showing a responsive grid of outfit cards from followed users, ordered by most recent. This is the primary browsing surface and the first thing a logged-in user sees.

**Acceptance criteria:**
- `/feed` is a protected route requiring auth
- Mobile: 2-column grid of outfit cards
- Desktop: 3-column grid of outfit cards
- Each card shows the outfit photo, username, and date
- Tapping a card navigates to the outfit detail route (stub `/outfits/[id]` is fine if detail screen is not yet built)
- Loading skeleton state is shown while data fetches
- Empty state is designed for a user who follows nobody yet
- Pagination or infinite scroll using cursor-based pagination from the API

**Blocked by:** Feed endpoint (see below) and route protection.

---

### New Issue — Implement feed endpoint with cursor pagination

**Suggested title:** `Implement feed endpoint with cursor pagination`
**Assignee:** `@reaganbourne`
**Labels:** `phase-2`, `backend`, `priority:high`

**Body:**

Create the authenticated feed endpoint that returns outfit cards from users the current user follows, ordered by `outfits.created_at DESC`, with stable cursor pagination.

**Acceptance criteria:**
- `GET /feed` requires authentication
- Response is paginated using a cursor (e.g., `created_at` + `id` composite cursor) — no offset pagination
- Default page size is 20; accepts an optional `limit` param up to 50
- Each item in the response includes: outfit `id`, `image_url`, `caption`, `event_name`, `worn_on`, `created_at`, and the author's `username` and `profile_image_url`
- The response includes a `next_cursor` field (null when the feed is exhausted)
- An empty follow list returns an empty result, not an error

**Blocked by:** `#10` + outfit schema migration, `#12` (auth), and follow endpoints.

---

### New Issue — Implement follow and unfollow endpoints

**Suggested title:** `Implement follow and unfollow endpoints`
**Assignee:** `@reaganbourne`
**Labels:** `phase-2`, `backend`

**Body:**

Add endpoints for managing follow relationships. The `follows` table exists in the V1 schema (`docs/db-v1-schema.md`) with composite PK on `(follower_id, following_id)` and a constraint preventing self-follows.

**Acceptance criteria:**
- `POST /users/{user_id}/follow` — creates a `follows` row; returns 200 if already followed (idempotent) or 201 if newly created
- `DELETE /users/{user_id}/follow` — removes the follow row; returns 200 if it existed, 204 if it was not found (idempotent)
- Both endpoints require authentication
- Attempting to follow yourself returns a 400 error
- Following a non-existent user returns a 404

**Blocked by:** `#8` (FastAPI scaffold), `#10` + outfit schema migration (for the `follows` table).

---

## Summary of What Still Needs Issues

The following Phase 3–5 items from `docs/github-ready-issue-list.md` do not have GitHub issues yet. Create them when Phase 2 work is underway:

- Add event board schema (Phase 3)
- Implement board CRUD endpoints (Phase 3)
- Build create-board form (Phase 3)
- Implement invite token and join flow (Phase 3)
- Build invite and join pages (Phase 3)
- Implement outfit submission to board (Phase 3)
- Build board detail page (Phase 3)
- Add notification persistence (Phase 3)
- Add board API integration tests (Phase 3)
- Add AI run tracking tables (Phase 4)
- Implement LLM provider adapter (Phase 4)
- Build vibe check UI (Phase 4)
- Implement vibe check endpoint (Phase 4)
- Implement caption generator endpoint (Phase 4)
- Build suggested-tags UI (Phase 4)
- Implement tag suggestion endpoint (Phase 4)
- Build story card export screen (Phase 4)
- Implement story card rendering and download (Phase 4)
- Add AI rate limiting and timeouts (Phase 4)
- Add search and trending query support (Phase 5)
- Implement search and discover endpoints (Phase 5)
- Build search and discover screens (Phase 5)
- Build notifications screen (Phase 5)
- Standardize API error responses (Phase 5)
- Add responsive polish and skeleton states (Phase 5)
- Expand backend test coverage (Phase 5)
- Create seed data and demo fixtures (Phase 5)
- Document setup, architecture, and env vars (Phase 5)
- Set up CI/CD and deployment pipeline (Phase 5)
