# reaganbourne Workboard

This is the focused build plan for `@reaganbourne`, who owns backend work for OOTD.

## Current Status

- `main` is current and already includes:
  - Issue 1 `Set up monorepo structure`
  - Issue 3 `Design v1 database schema`
  - Issue 7 `Build login and signup screens`
- Issue 1 is complete and merged. No further implementation work is needed there.
- The frontend auth screens are merged and runtime-tested. The remaining auth follow-up is contract alignment, not more frontend scaffolding.
- Reagan's next active work should start from updated `main`.

## Your Phase 1 Issues

### Issue 2. Create Docker Compose local stack
- Status: start now
- Recommended branch: `chore-docker-compose-stack`
- Goal: create a shared local environment for web, api, db, and optional worker services

### Issue 5. Scaffold FastAPI service
- Status: start now
- Recommended branch: `feature-be-fastapi-scaffold`
- Goal: establish FastAPI app structure, config loading, routing layout, and `/health`

### Issue 6. Define auth API contract
- Status: start now in parallel with Issue 5
- Recommended branch: `docs-auth-api-contract`
- Goal: lock request and response shapes for register, login, refresh, logout, and current-user

### Issue 8. Implement JWT auth flow
- Status: next after Issues 5 and 6
- Recommended branch: `feature-be-jwt-auth`
- Goal: implement auth endpoints, password hashing, refresh lifecycle, and protected route support

### Issue 10. Add auth smoke tests and CI hook
- Status: next after Issue 8
- Recommended branch: `chore-be-auth-ci-tests`
- Goal: add integration coverage for auth plus CI checks for backend verification

## Recommended Order

1. Start Issue 2 on `chore-docker-compose-stack`
2. Start Issue 5 on `feature-be-fastapi-scaffold`
3. Start Issue 6 on `docs-auth-api-contract`
4. Start Issue 8 on `feature-be-jwt-auth`
5. Start Issue 10 on `chore-be-auth-ci-tests`

## Exact Branch Commands

Run these from the repo root.

```powershell
git checkout main
git pull origin main
git checkout -b chore-docker-compose-stack
```

```powershell
git checkout main
git pull origin main
git checkout -b feature-be-fastapi-scaffold
```

```powershell
git checkout main
git pull origin main
git checkout -b docs-auth-api-contract
```

```powershell
git checkout main
git pull origin main
git checkout -b feature-be-jwt-auth
```

```powershell
git checkout main
git pull origin main
git checkout -b chore-be-auth-ci-tests
```

## Deliverables By Branch

### `chore-docker-compose-stack`
- Add `docker compose` setup for shared local services
- Add env wiring for the local stack
- Document startup expectations for web, api, and db
- Keep the stack simple enough for both developers to run the same environment

### `feature-be-fastapi-scaffold`
- Add app entrypoint
- Add config loading
- Add router organization
- Add `/health` endpoint
- Create a backend structure that later auth, outfit, and board routes can grow into

### `docs-auth-api-contract`
- Add auth payload examples
- Add expected error shape examples
- Document required fields and assumptions
- Add contract alignment notes for `@otthomas`

### `feature-be-jwt-auth`
- Add register, login, refresh, and logout endpoints
- Add password hashing
- Add refresh-token or session persistence path
- Add auth guard or dependency for protected routes

### `chore-be-auth-ci-tests`
- Add auth integration tests
- Add backend test step to CI
- Add short testing notes in docs if needed

## Full Roadmap Branch Queue

### Phase 2
- `feature-be-image-storage-adapter`
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

### You can do these immediately
- Issue 2 Docker stack
- Issue 5 FastAPI scaffold
- Issue 6 auth API contract

### These depend on your own earlier work
- Issue 8 depends on:
  - Issue 5 backend scaffold
  - Issue 6 auth API contract
- Issue 10 depends on:
  - Issue 8 JWT auth flow

### Questions that must be resolved with otthomas
- Are usernames required during signup or added later in onboarding?
- Will auth use cookies or client-managed tokens for the web app?
- What exact error shape should the frontend rely on?
- Which fields belong in the login and signup responses?

## This Week Plan

### Day 1
- Pull updated `main`
- Create `chore-docker-compose-stack`
- Define local services and env model

### Day 2
- Create `feature-be-fastapi-scaffold`
- Set up FastAPI app layout and `/health`

### Day 3
- Create `docs-auth-api-contract`
- Lock register, login, refresh, logout, and current-user payloads with `@otthomas`

### Day 4
- Create `feature-be-jwt-auth`
- Implement register and login basics
- Add password hashing and session persistence direction

### Day 5
- Finish refresh and protected-route behavior
- Start `chore-be-auth-ci-tests` if JWT flow is stable

## Definition of Done For Your Current Week

- Docker environment exists or is close enough for shared startup
- FastAPI scaffold exists
- Auth API contract is documented and reviewed with `@otthomas`
- JWT auth flow is started or completed
- Backend auth tests are started if endpoints are stable
