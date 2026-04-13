# reaganbourne Workboard

Owned areas: `services/api/`, backend APIs, database work, SQLAlchemy models, Alembic migrations, seeds, and infra wiring

Last synced: 2026-04-12

## Done On Main

- GH #8 `Scaffold FastAPI service`
- GH #9 `Define auth API contract`
- GH #10 `Add Alembic baseline and initial migrations`
- Docker Compose local stack code is merged
- GH #12 `Implement JWT auth flow` is merged at the code level

## Still Needs Verification

### Docker Compose local stack
- runtime verification is still pending on a machine with Docker installed

### GH #12 `Implement JWT auth flow`
- code is merged, but live verification against a real Postgres-backed environment is still pending

## Ready Next

### GH #13 `Add auth smoke tests and CI hook`
- Status: ready now
- Recommended branch: `chore-be-auth-ci-tests`
- Acceptance criteria:
  - auth tests cover register, login, refresh, logout, and a protected route
  - duplicate email registration returns the correct error
  - invalid credentials return the correct error
  - revoked or expired refresh tokens are rejected
  - `.github/workflows/api-ci.yml` runs `pytest` on push and PRs to `main`
  - workflow installs dependencies and required env vars
  - `services/api/README.md` documents test execution

### GH #17 `Add outfit and clothing item schema migration`
- Status: ready now
- Recommended branch: `feature-be-outfit-schema`
- Acceptance criteria:
  - Alembic migration creates `outfits` and `clothing_items`
  - indexes match `docs/db-v1-schema.md`
  - SQLAlchemy models exist for both tables
  - `alembic upgrade head` works on top of the auth baseline
  - `alembic downgrade -1` works cleanly

### GH #18 `Implement image storage adapter`
- Status: ready now
- Recommended branch: `feature-be-image-storage-adapter`
- Acceptance criteria:
  - storage adapter interface defines `upload()` and `delete()`
  - local adapter writes to a configurable directory
  - backend selection is driven by env config
  - multipart upload helper or dependency exists
  - non-image MIME types are rejected with a clear error
  - file size is bounded by config

### GH #23 `Implement follow and unfollow endpoints`
- Status: ready now
- Recommended branch: `feature-be-follow-endpoints`
- Acceptance criteria:
  - follow endpoint is idempotent
  - unfollow endpoint is idempotent
  - both endpoints require auth
  - self-follow returns `400`
  - non-existent target user returns `404`

## Blocked

### GH #20 `Implement create-outfit endpoint`
- Blocked by: GH #17 and GH #18
- Recommended branch: `feature-be-create-outfit-endpoint`
- Acceptance criteria:
  - `POST /outfits` accepts multipart data
  - image upload flows through the storage adapter
  - one `clothing_items` row is inserted per submitted item
  - endpoint requires auth
  - non-image files return `422`
  - response payload matches frontend upload expectations

### GH #22 `Implement feed endpoint with cursor pagination`
- Blocked by: GH #20
- Recommended branch: `feature-be-feed-endpoint`
- Acceptance criteria:
  - `GET /feed` requires auth
  - cursor pagination is stable and not offset-based
  - default page size is 20 with max 50
  - each item includes all fields needed by the feed UI
  - `next_cursor` is returned
  - empty follow list returns an empty result instead of an error

## Recommended Order

1. GH #13 auth smoke tests and CI
2. GH #17 outfit and clothing item schema migration
3. GH #18 image storage adapter
4. GH #20 create-outfit endpoint
5. GH #22 feed endpoint with cursor pagination
6. GH #23 follow and unfollow endpoints

## Definition Of Done For The Current Slice

- auth is covered by repeatable tests and CI
- local Docker stack is verified on a real machine
- outfit schema migration is landed
- storage adapter is landed
- create-outfit endpoint is ready for frontend upload integration
- feed endpoint contract is stable enough for frontend feed work

## Source Of Truth

- Shared status: `docs/github-board-status.md`
- Full long-range backlog: `docs/github-ready-issue-list.md`
