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
- Issue 8. Scaffold FastAPI service
- Issue 9. Define auth API contract
- Issue 10. Add Alembic baseline and initial migrations

Completed on feature branches and ready for review or integration:

- Issue 11. Build typed API client for web (`feature-fe-api-client`)
- Issue 12. Implement JWT auth flow (`origin/feature-be-jwt-auth`)

Issue 11 verification now includes:

- production build passing for `apps/web`
- `/login` and `/signup` serving successfully from a local Next start process
- offline/network failure messaging verified against the real client module
- 422 validation normalization verified against the real client module
- 401 refresh-and-retry behavior verified against the real client module
- refresh-failure redirect-to-login behavior verified against the real client module

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

### Issue 8. Scaffold FastAPI service
- Owner: `@reaganbourne`
- Status: `Done`

### Issue 9. Define auth API contract
- Owner: `@reaganbourne`
- Status: `Done`

### Issue 10. Add Alembic baseline and initial migrations
- Owner: `@reaganbourne`
- Status: `Done`

### Issue 11. Build typed API client for web
- Owner: `@otthomas`
- Status: `Done on branch`, ready for PR / review
- Branch: `feature-fe-api-client`

## Move These To In Progress

### Issue 12. Implement JWT auth flow
- Owner: `@reaganbourne`
- Status: `In Progress`
- Branch: `feature-be-jwt-auth`

## Create Or Move These To Ready Next

### Issue 13. Add auth smoke tests and CI hook
- Owner: `@reaganbourne`
- Status: `Ready Next`
- Why now: backend auth implementation exists on branch and is the next stabilization step

### Issue 14. Add auth state management to web app
- Owner: `@otthomas`
- Status: `Ready Next`
- Why now: Issue 11 is complete enough to support a real auth context / session layer on the frontend

## Create Or Move These To Blocked

### Issue 15. Add Next.js route protection middleware
- Owner: `@otthomas`
- Status: `Blocked`
- Blocked by: Issue 14 (frontend auth state management)

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
- Issue 8. Scaffold FastAPI service
- Issue 9. Define auth API contract
- Issue 10. Add Alembic baseline and initial migrations
- Issue 11. Build typed API client for web

### In Progress
- Issue 12. Implement JWT auth flow (`@reaganbourne`)

### Ready Next
- Issue 13. Add auth smoke tests and CI hook (`@reaganbourne`)
- Issue 14. Add auth state management to web app (`@otthomas`)

### Blocked
- Issue 15. Add Next.js route protection middleware

### Backlog
- Phase 2 and later issues from `docs/github-ready-issue-list.md`

## Recommended Next Assignment Split

### `@otthomas`
- Open PR for Issue 11 from `feature-fe-api-client`
- Start Issue 14 auth state management once the Issue 11 PR is up
- No database work - fully handed off to Reagan

### `@reaganbourne`
- Issue 12 JWT auth flow (in progress)
- Issue 13 auth smoke tests and CI hook (next)
