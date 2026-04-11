# reaganbourne Workboard

Owned areas: `services/api/` (FastAPI backend), all database work (SQLAlchemy models, Alembic migrations, seed data).

Last synced: 2026-04-11

---

## Architecture decisions (locked)

| Decision | Choice |
|---|---|
| Compute | Railway |
| File storage | AWS S3 (local filesystem adapter for dev) |
| ORM | SQLAlchemy 2.x |
| Migrations | Alembic |
| Auth | JWT access token (15 min, bearer) + httpOnly refresh cookie (7 days) |
| Password hashing | bcrypt via passlib |

---

## Phase 1 — status

| GH # | Title | Branch | Status |
|---|---|---|---|
| #8 | Scaffold FastAPI service | `feature-be-fastapi-scaffold` | ✅ Merged |
| #9 | Define auth API contract | `docs-auth-api-contract` | ✅ Merged |
| #10 | Alembic baseline + initial migrations | `feature-be-alembic-baseline` | ✅ Merged |
| #7 | Docker Compose local stack | `chore-docker-compose-stack` | 🔲 Not started |
| #12 | Implement JWT auth flow | `feature-be-jwt-auth` | 🔲 Not started — **start here** |
| #13 | Auth smoke tests and CI | `chore-be-auth-ci-tests` | 🔲 Blocked by #12 |

---

## What to build next

### GH #12 — JWT auth flow (`feature-be-jwt-auth`)

The big one. Implements all auth endpoints against the contract in `packages/contracts/auth-contract.md`.

**New dependencies to add to `requirements.txt`:**
- `python-jose[cryptography]` — JWT signing/verification
- `passlib[bcrypt]` — password hashing
- `python-multipart` — required by FastAPI for form data

**New files to create:**
```
services/api/app/
  schemas/
    auth.py        # Pydantic request/response models (UserCreate, TokenResponse, etc.)
  services/
    auth.py        # business logic: register(), login(), create_tokens(), verify_token()
  crud/
    user.py        # get_by_email(), create_user()
    session.py     # create_session(), get_session_by_hash(), revoke_session()
```

**Endpoints to implement in `app/routers/auth.py`:**
- `POST /auth/register` → 201 + access token + sets refresh cookie
- `POST /auth/login` → 200 + access token + sets refresh cookie
- `POST /auth/refresh` → 200 + new access token + rotates refresh cookie
- `POST /auth/logout` → 200 + clears cookie + revokes session
- `GET /auth/me` → 200 + current user object

**`get_current_user` dependency** goes in `app/dependencies.py` — reads and validates the JWT from the `Authorization: Bearer` header. Every future protected route uses this.

### GH #7 — Docker Compose (`chore-docker-compose-stack`)

Can be done in parallel with #12. Simple — `docker-compose.yml` at repo root with:
- `db` service: Postgres 16, health check, named volume
- `api` service: builds from `services/api/`, mounts code as volume for hot reload, depends on `db`

---

## Phase 2 — queued (after auth is stable)

| GH # | Title | Branch | Notes |
|---|---|---|---|
| #17 | Outfit + clothing item schema migration | `feature-be-outfit-schema` | Reassign from @otthomas |
| #18 | Image storage adapter | `feature-be-image-storage-adapter` | Local + S3 |
| #20 | Create-outfit endpoint | `feature-be-create-outfit-endpoint` | After #17 + #18 |
| #22 | Feed endpoint + cursor pagination | `feature-be-feed-endpoint` | After #20 |
| #23 | Follow/unfollow endpoints | `feature-be-follow-endpoints` | After #12 |

---

## Full branch queue

### Phase 3
- `feature-be-board-crud`
- `feature-be-invite-token-join`
- `feature-be-outfit-board-submission`
- `chore-be-board-integration-tests`

### Phase 4
- `feature-be-llm-provider-adapter`
- `feature-be-vibe-check-endpoint`
- `feature-be-caption-endpoint`
- `feature-be-tag-suggestion-endpoint`
- `feature-be-ai-rate-limits`

### Phase 5
- `feature-be-search-discover-endpoints`
- `feature-be-api-error-standardization`
- `chore-be-coverage-expansion`
- `docs-be-setup-architecture`
- `chore-be-ci-cd-pipeline`

---

## Definition of done — Phase 1

- [x] FastAPI scaffold with `/health`, config, SQLAlchemy session
- [x] Auth API contract documented in `packages/contracts/`
- [x] SQLAlchemy models for all 7 v1 tables
- [x] Alembic initial migration — `alembic upgrade head` creates full schema
- [ ] Docker Compose — `docker compose up` starts API + Postgres
- [ ] JWT auth — register, login, refresh, logout, me all working
- [ ] Auth tests — pytest coverage + GitHub Actions CI
