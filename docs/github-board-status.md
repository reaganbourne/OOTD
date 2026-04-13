# GitHub Board Status

This document reflects the current implementation state of the OOTD repo.
Use it to mark completed work, move issues, and avoid starting blocked work early.

Last synced: 2026-04-11

---

## What's merged to main

| GH # | Title | Owner |
|---|---|---|
| — | Monorepo scaffold | @otthomas |
| — | Draft v1 database schema | @otthomas |
| — | Scaffold auth screens | @otthomas |
| #8 | Scaffold FastAPI service | @reaganbourne |
| #9 | Define auth API contract | @reaganbourne |
| #10 | Add Alembic baseline and initial migrations | @reaganbourne |

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
---

## Manual GitHub actions needed

These can't be done from docs — requires clicking on GitHub:

- **Close issue #10** — Alembic baseline is merged (PR #26). Issue is still showing open.
- **Reassign issue #17** from `@otthomas` → `@reaganbourne` — outfit/clothing schema migration is database work, Reagan owns all DB.

---

## Board columns — current state

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
### Done
- Monorepo structure
- v1 database schema (docs)
- Login and signup screens (GH #6)
- Scaffold FastAPI service (GH #8)
- Define auth API contract (GH #9)
- Add Alembic baseline and initial migrations (GH #10)

### In Progress
_(nothing currently in progress — pick up GH #12)_

### Ready Next

**@reaganbourne**
- GH #12: Implement JWT auth flow ← **start here**
- GH #7: Create Docker Compose local stack (can run alongside #12)

**@otthomas**
- GH #11: Build typed API client ← **unblocked** (auth contract #9 is merged)
- GH #14: Add auth state management to web app (after #11)
- GH #15: Add Next.js route protection middleware (after #14)
- GH #16: Update home page from scaffold placeholder

### Blocked

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
| GH # | Title | Owner | Blocked by |
|---|---|---|---|
| #13 | Auth smoke tests and CI | @reaganbourne | GH #12 |
| #17 | Outfit/clothing schema migration | @reaganbourne (reassign) | GH #12 merged (Phase 2 start) |
| #18 | Image storage adapter | @reaganbourne | GH #12 |
| #19 | Build outfit upload flow UI | @otthomas | GH #18 |
| #20 | Implement create-outfit endpoint | @reaganbourne | GH #17, #18 |
| #21 | Build home feed grid | @otthomas | GH #20 |
| #22 | Feed endpoint with cursor pagination | @reaganbourne | GH #20 |
| #23 | Follow and unfollow endpoints | @reaganbourne | GH #12 |

### Backlog
- Phase 3 (event boards), Phase 4 (AI), Phase 5 (polish/launch)

---

## Dependency map — auth critical path

```
GH #12 JWT auth flow
  ├── GH #13 auth tests + CI
  ├── GH #23 follow/unfollow endpoints
  └── unblocks Tomi: GH #15 route protection, GH #16 home page redirect

GH #11 typed API client (Tomi, unblocked now)
  └── GH #14 auth state management
```

### `@otthomas`
- Open PR for Issue 11 from `feature-fe-api-client`
- Start Issue 14 auth state management once the Issue 11 PR is up
- No database work - fully handed off to Reagan

### `@reaganbourne`
- Issue 12 JWT auth flow (in progress)
- Issue 13 auth smoke tests and CI hook (next)
## Dependency map — Phase 2 critical path

```
GH #17 outfit schema migration (Reagan)
GH #18 image storage adapter (Reagan)
  └── GH #20 create-outfit endpoint
        ├── GH #21 home feed grid (Tomi)
        └── GH #22 feed endpoint
              └── GH #23 follow/unfollow
```
