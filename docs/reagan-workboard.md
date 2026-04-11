# reaganbourne Workboard

This is the focused build plan for `@reaganbourne`, who owns backend and database work for OOTD.

## Ownership

- `services/api/` — FastAPI backend service
- `packages/db/` — SQLAlchemy models, Alembic migrations, seed data

## Current Status

- `main` is current and already includes:
  - Issue 1 `Set up monorepo structure`
  - Issue 3 `Design v1 database schema`
  - Issue 7 `Build login and signup screens`
- Reagan's next active work starts from updated `main`.
- The frontend auth screens are merged and runtime-tested. Remaining follow-up is wiring the real auth contract once Issue 6 is frozen.

## Architecture Decisions

### Deployment
- **Compute**: Railway (FastAPI service + managed Postgres)
- **File storage**: AWS S3 (outfit images)
- Deploy to ECS once the MVP is stable; Railway gets us there without infra overhead.

### Database
- SQLAlchemy 2.x ORM + Alembic migrations
- Models and migrations live in `services/api/` (no separate Python package needed at this scale)
- `packages/db/` is reserved for shared seed scripts and fixtures

### Auth strategy
- Access token: short-lived JWT (15 min) returned in response body as `{ access_token, token_type: "bearer" }`
- Refresh token: longer-lived (7 days), stored as httpOnly cookie, tracked in `refresh_sessions` table
- Passwords: bcrypt via passlib

### Auth API contract (for Issue 6 and Issue 8)

**POST /auth/register**
- Request: `{ username, email, password }`
- Response: `{ access_token, token_type, user: { id, username, email } }`

**POST /auth/login**
- Request: `{ email, password }`
- Response: `{ access_token, token_type, user: { id, username, email } }`

**POST /auth/refresh**
- Request: httpOnly cookie with refresh token
- Response: `{ access_token, token_type }`

**POST /auth/logout**
- Request: httpOnly cookie with refresh token
- Response: `{ message: "logged out" }` + clears cookie + revokes session

**GET /auth/me**
- Request: `Authorization: Bearer <access_token>`
- Response: `{ id, username, email, display_name, bio, profile_image_url }`

Error shape across all auth endpoints:
```json
{ "detail": "human-readable message" }
```

## Your Phase 1 Issues

### Issue 2. Create Docker Compose local stack
- Status: start now
- Recommended branch: `chore-docker-compose-stack`
- Goal: create a shared local environment for web, api, db, and optional worker services

### Issue 4. Add Alembic baseline and initial migrations
- Status: start now (Reagan owns this, previously listed under otthomas)
- Recommended branch: `feature-be-alembic-baseline`
- Goal: configure Alembic, add initial migration for all v1 tables

### Issue 5. Scaffold FastAPI service
- Status: in progress
- Branch: `feature-be-fastapi-scaffold`
- Goal: FastAPI app structure, config loading, router layout, `/health` endpoint, SQLAlchemy session wiring

### Issue 6. Define auth API contract
- Status: start now in parallel with Issue 5
- Recommended branch: `docs-auth-api-contract`
- Goal: document request/response shapes (contract defined above, this branch formalizes it in `packages/contracts`)

### Issue 8. Implement JWT auth flow
- Status: next after Issues 5 and 6
- Recommended branch: `feature-be-jwt-auth`
- Goal: implement auth endpoints, password hashing, refresh lifecycle, and protected route dependency

### Issue 10. Add auth smoke tests and CI hook
- Status: next after Issue 8
- Recommended branch: `chore-be-auth-ci-tests`
- Goal: integration tests for auth + CI checks on PRs

## Recommended Order

1. Issue 5 on `feature-be-fastapi-scaffold` (in progress)
2. Issue 4 on `feature-be-alembic-baseline`
3. Issue 2 on `chore-docker-compose-stack`
4. Issue 6 on `docs-auth-api-contract`
5. Issue 8 on `feature-be-jwt-auth`
6. Issue 10 on `chore-be-auth-ci-tests`

## Deliverables By Branch

### `feature-be-fastapi-scaffold`
- FastAPI app entrypoint and lifespan
- Pydantic settings config loading
- Router organization (health, auth stub, outfits stub)
- `/health` endpoint
- SQLAlchemy engine + session dependency
- Alembic config and env.py wired to models
- `.env.example`

### `feature-be-alembic-baseline`
- SQLAlchemy models for all v1 tables (users, refresh_sessions, outfits, clothing_items, follows, likes, comments)
- Alembic initial migration
- Verified: fresh DB bootstraps from `alembic upgrade head`
- Verified: `alembic downgrade base` works

### `chore-docker-compose-stack`
- `docker-compose.yml` for web, api, db services
- Env wiring from `.env`
- Health checks for api and db

### `docs-auth-api-contract`
- Auth contract doc added to `packages/contracts/`
- Example request/response payloads
- Error shape documented

### `feature-be-jwt-auth`
- POST /auth/register, /auth/login, /auth/refresh, /auth/logout, GET /auth/me
- bcrypt password hashing
- JWT access token (15 min)
- httpOnly refresh cookie (7 days) + refresh_sessions persistence
- `get_current_user` dependency for protected routes

### `chore-be-auth-ci-tests`
- pytest integration tests for all auth endpoints
- CI job runs on PRs
- Test failures block merge to `main`

## Full Roadmap Branch Queue

### Phase 2
- `feature-be-image-storage-adapter` (S3 + local dev fallback)
- `feature-be-create-outfit-endpoint`
- `feature-be-clothing-item-tagging`
- `feature-be-follow-endpoints`
- `feature-be-feed-endpoint`
- `chore-be-phase2-integration-tests`

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

## Dependencies and Blockers

### Start immediately
- Issue 5 FastAPI scaffold (in progress)
- Issue 4 Alembic baseline (Reagan owns this now)
- Issue 2 Docker stack

### Depend on earlier work
- Issue 6 auth contract: best documented after Issue 5 exists
- Issue 8 JWT auth: requires Issues 5 and 6
- Issue 10 tests + CI: requires Issue 8
