# GitHub Board Status

This document reflects the current implementation state of the OOTD repo and the next issue actions to take on the GitHub board.

Use it to:

- mark completed work as done
- create the next issues in the right order
- avoid starting dependent work too early

## Current Snapshot

Merged into `main`:

- Issue 1. Set up monorepo structure
- Issue 3. Design v1 database schema
- Issue 7. Build login and signup screens

Completed but still needs follow-up alignment:

- Auth screens were runtime-tested successfully
- Mock login and sign-up flows worked locally
- Remaining auth-screen follow-up is wiring to Reagan's real auth endpoints

## Ownership Change

**Issue 4 (Alembic baseline and initial migrations)** has been reassigned from `@otthomas` to `@reaganbourne`.

Reagan now owns all database work: SQLAlchemy models, Alembic migrations, and seed data. `@otthomas` focuses exclusively on frontend.

## Architecture Decisions Logged

- **Compute**: Railway (FastAPI + managed Postgres)
- **File storage**: AWS S3
- **ORM**: SQLAlchemy 2.x + Alembic (lives in `services/api/`)
- **Auth**: JWT access token (bearer) + httpOnly refresh cookie, tracked in `refresh_sessions`

## Move These To Done

### Issue 1. Set up monorepo structure
- Owner: `@otthomas`
- Status: `Done`

### Issue 3. Design v1 database schema
- Owner: `@otthomas`
- Status: `Done`

### Issue 7. Build login and signup screens
- Owner: `@otthomas`
- Status: `Done`

## Move These To In Progress

### Issue 5. Scaffold FastAPI service
- Owner: `@reaganbourne`
- Status: `In Progress`
- Branch: `feature-be-fastapi-scaffold`

## Create Or Move These To Ready Next

### Issue 2. Create Docker Compose local stack
- Owner: `@reaganbourne`
- Status: `Ready Next`

### Issue 4. Add Alembic baseline and initial migrations
- Owner: `@reaganbourne` (reassigned from `@otthomas`)
- Status: `Ready Next`
- Why now: FastAPI scaffold sets the project structure; migrations can layer in immediately after

### Issue 6. Define auth API contract
- Owner: `@reaganbourne`
- Status: `Ready Next`
- Note: contract shape is already decided (see `docs/reagan-workboard.md`); this branch publishes it formally to `packages/contracts/`

## Create Or Move These To Blocked

### Issue 8. Implement JWT auth flow
- Owner: `@reaganbourne`
- Status: `Blocked`
- Blocked by: Issue 5 (scaffold) and Issue 6 (contract)

### Issue 9. Build typed API client for web
- Owner: `@otthomas`
- Status: `Blocked`
- Blocked by: Issue 6 (auth API contract must be frozen)

### Issue 10. Add auth smoke tests and CI hook
- Owner: `@reaganbourne`
- Status: `Blocked`
- Blocked by: Issue 8 (JWT auth flow)

## Suggested Board Columns

- `Backlog`
- `Ready Next`
- `In Progress`
- `Blocked`
- `In Review`
- `Done`

## Suggested Immediate Board State

### Done
- Issue 1. Set up monorepo structure
- Issue 3. Design v1 database schema
- Issue 7. Build login and signup screens

### In Progress
- Issue 5. Scaffold FastAPI service (`@reaganbourne`)

### Ready Next
- Issue 2. Create Docker Compose local stack (`@reaganbourne`)
- Issue 4. Add Alembic baseline and initial migrations (`@reaganbourne`)
- Issue 6. Define auth API contract (`@reaganbourne`)

### Blocked
- Issue 8. Implement JWT auth flow
- Issue 9. Build typed API client for web
- Issue 10. Add auth smoke tests and CI hook

### Backlog
- Phase 2 and later issues from `docs/github-ready-issue-list.md`

## Recommended Next Assignment Split

### `@otthomas`
- Monitor Issue 6 auth API contract for review
- Prepare Issue 9 typed API client once contract is approved
- No database work — fully handed off to Reagan

### `@reaganbourne`
- Issue 5 FastAPI scaffold (in progress)
- Issue 4 Alembic baseline (next)
- Issue 2 Docker Compose stack (next)
- Issue 6 auth API contract (parallel)
