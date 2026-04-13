# GitHub Board Status

Live status snapshot for the OOTD repository.

Last synced: 2026-04-12

## Ownership

- `@otthomas` owns frontend work in `apps/web/`
- `@reaganbourne` owns backend and database work in `services/api/`, SQLAlchemy models, Alembic migrations, seed data, and infra wiring

## Merged To Main

- Monorepo scaffold
- v1 schema doc
- auth screens
- FastAPI scaffold
- auth API contract
- Alembic baseline and initial migration
- Docker Compose local stack code
- GH #11 `Build typed API client for web`
- GH #12 `Implement JWT auth flow`
- GH #14 `Add auth state management to web app`
- GH #15 `Add Next.js route protection middleware`
- GH #16 `Update home page from scaffold placeholder to real landing`

## Still Needs Verification

### Docker Compose local stack
- Status: code is merged, but runtime verification is still pending on a machine with Docker installed
- Done means:
  - `docker compose up` starts Postgres and API successfully
  - Postgres is reachable from the API container
  - migrations run cleanly on container startup

### GH #12 `Implement JWT auth flow`
- Status: merged to `main`, but full live verification against real Postgres is still pending
- Remaining verification:
  - register, login, refresh, logout, and `/auth/me` all work against a running database
  - refresh-session rotation behaves correctly
  - logout revokes the refresh session as expected

## Ready Next

### GH #13 `Add auth smoke tests and CI hook`
- Owner: `@reaganbourne`
- Why now: auth code is merged and needs stabilization before more protected features pile on
- Acceptance criteria:
  - `tests/test_auth.py` or equivalent covers register, login, refresh, logout, and a protected route
  - duplicate email registration returns the correct error
  - invalid login credentials return the correct error
  - expired or revoked refresh tokens are rejected
  - `.github/workflows/api-ci.yml` runs `pytest` on push and pull requests targeting `main`
  - CI installs dependencies and required env vars
  - `services/api/README.md` includes basic test instructions

### GH #17 `Add outfit and clothing item schema migration`
- Owner: `@reaganbourne`
- Why now: this is the first required backend/database dependency for the outfit loop
- Acceptance criteria:
  - new Alembic migration creates `outfits` and `clothing_items`
  - indexes match `docs/db-v1-schema.md`
  - SQLAlchemy models are added for both tables
  - `alembic upgrade head` runs cleanly on top of the auth baseline
  - `alembic downgrade -1` reverts cleanly

### GH #18 `Implement image storage adapter`
- Owner: `@reaganbourne`
- Why now: this unblocks real upload handling for the outfit creation flow
- Acceptance criteria:
  - a storage adapter interface defines `upload()` and `delete()`
  - a local development adapter writes files to a configurable directory
  - active storage backend is selected from env config
  - multipart upload handling exists in FastAPI
  - non-image MIME types are rejected cleanly
  - file size is bounded by config

### GH #23 `Implement follow and unfollow endpoints`
- Owner: `@reaganbourne`
- Why now: auth is merged, and the `follows` table already exists in the baseline schema
- Acceptance criteria:
  - `POST /users/{user_id}/follow` is idempotent
  - `DELETE /users/{user_id}/follow` is idempotent
  - both endpoints require authentication
  - self-follow returns `400`
  - following a non-existent user returns `404`

## Blocked

### GH #19 `Build outfit upload flow UI`
- Owner: `@otthomas`
- Blocked by: GH #18 and GH #20
- Why blocked: the UI can be mocked early, but the issue cannot be completed until storage and the create-outfit API contract exist
- Acceptance criteria:
  - Step 1 photo selection with image preview
  - Step 2 clothing item tags with brand, category, color, and stable `display_order`
  - Step 3 optional metadata for caption, event name, and date worn
  - review step before submission
  - loading and error states on submit
  - mobile-first layout
  - incomplete submissions are blocked with clear messaging

### GH #20 `Implement create-outfit endpoint`
- Owner: `@reaganbourne`
- Blocked by: GH #17 and GH #18
- Acceptance criteria:
  - `POST /outfits` accepts multipart form data
  - image goes through the storage adapter and persists to `outfits.image_url`
  - one `clothing_items` row is created per submitted item
  - endpoint requires authentication
  - non-image files return `422`
  - response payload matches frontend upload expectations

### GH #21 `Build home feed grid`
- Owner: `@otthomas`
- Blocked by: GH #22
- Why blocked: the final issue depends on the real `/feed` payload and cursor behavior
- Acceptance criteria:
  - `/feed` is a protected route
  - mobile uses a 2-column grid
  - desktop uses a 3-column grid
  - each card shows image, username, and date
  - tapping a card opens outfit detail
  - loading skeletons exist
  - empty state exists
  - pagination or infinite scroll uses the API cursor response

### GH #22 `Implement feed endpoint with cursor pagination`
- Owner: `@reaganbourne`
- Blocked by: GH #20
- Acceptance criteria:
  - `GET /feed` requires authentication
  - cursor pagination is stable and not offset-based
  - default page size is 20 with max 50
  - payload includes all fields needed by feed cards
  - response includes `next_cursor`
  - empty follow list returns an empty result instead of an error

## Frontend Reality Right Now

- There are no fully unblocked GitHub frontend issues left on `main`
- The next official frontend issue is GH #19 once GH #18 and GH #20 are ready enough to support real upload wiring
- GH #21 remains blocked until GH #22 is ready

## Suggested Backend Order

1. GH #13 auth smoke tests and CI
2. GH #17 outfit and clothing item schema migration
3. GH #18 image storage adapter
4. GH #20 create-outfit endpoint
5. GH #22 feed endpoint with cursor pagination
6. GH #23 follow and unfollow endpoints

## Manual GitHub Cleanup

- Audit and close merged frontend issues if they are still open: GH #11, GH #14, GH #15, GH #16
- Decide whether GH #12 should stay open until live Postgres verification is finished or be closed now as code-complete
- Reassign GH #17 to `@reaganbourne` if GitHub still shows it under the wrong owner

## Source Of Truth

- Live status and blockers: this file
- Long-range backlog and later-phase acceptance criteria: `docs/github-ready-issue-list.md`
