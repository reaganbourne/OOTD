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
- Remaining auth-screen follow-up is contract alignment with Reagan's backend auth payloads

## Move These To Done

### Issue 1. Set up monorepo structure
- Owner: `@otthomas`
- Status: `Done`
- Reason:
  - repo scaffold is merged
  - root config files exist
  - app, api, db, contracts, and docs folders exist

### Issue 3. Design v1 database schema
- Owner: `@otthomas`
- Status: `Done`
- Reason:
  - V1 schema draft is merged in `docs/db-v1-schema.md`
  - MVP tables, indexes, and open decisions are documented

### Issue 7. Build login and signup screens
- Owner: `@otthomas`
- Status: `Done`
- Reason:
  - auth screens are merged
  - mocked runtime flow was verified locally
  - checklist exists in `docs/fe-auth-screens-checklist.md`

## Create Or Move These To Ready Next

These are the best next issues to create or move into the `Ready` / `Todo` column.

### Issue 2. Create Docker Compose local stack
- Owner: `@reaganbourne`
- Status: `Ready Next`
- Why now:
  - needed for a shared backend + DB environment
  - unblocks reliable local backend work

### Issue 5. Scaffold FastAPI service
- Owner: `@reaganbourne`
- Status: `Ready Next`
- Why now:
  - backend implementation cannot move without the service structure

### Issue 6. Define auth API contract
- Owner: `@reaganbourne`
- Status: `Ready Next`
- Why now:
  - unlocks auth payload alignment with the merged frontend auth screens

## Create Or Move These To Blocked / Waiting

### Issue 4. Add Alembic baseline and initial migrations
- Owner: `@otthomas`
- Status: `Blocked`
- Blocked by:
  - backend service structure needs to exist so migration placement is not guessed
- Notes:
  - schema design is already done
  - this should begin as soon as Reagan has created the FastAPI/Python project structure

### Issue 9. Build typed API client for web
- Owner: `@otthomas`
- Status: `Blocked`
- Blocked by:
  - Issue 6 auth API contract
- Notes:
  - the auth UI is already in place
  - this becomes the next frontend integration task once request and response shapes are frozen

### Issue 8. Implement JWT auth flow
- Owner: `@reaganbourne`
- Status: `Blocked`
- Blocked by:
  - Issue 5 backend scaffold
  - Issue 6 auth API contract

### Issue 10. Add auth smoke tests and CI hook
- Owner: `@reaganbourne`
- Status: `Blocked`
- Blocked by:
  - Issue 8 JWT auth flow

## Suggested Board Columns

Recommended columns for the GitHub board right now:

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

### Ready Next
- Issue 2. Create Docker Compose local stack
- Issue 5. Scaffold FastAPI service
- Issue 6. Define auth API contract

### Blocked
- Issue 4. Add Alembic baseline and initial migrations
- Issue 8. Implement JWT auth flow
- Issue 9. Build typed API client for web
- Issue 10. Add auth smoke tests and CI hook

### Backlog
- Phase 2 and later issues from `docs/github-ready-issue-list.md`

## Recommended Next Assignment Split

### `@otthomas`
- monitor Issue 6 auth API contract
- prepare for Issue 4 Alembic baseline
- prepare for Issue 9 API client once contract is approved

### `@reaganbourne`
- start Issue 2 Docker Compose stack
- start Issue 5 FastAPI scaffold
- draft Issue 6 auth API contract

## Manual Update Notes

The GitHub connector in this session can read some repo state but cannot directly create or edit issues/projects here.

Use this document as the manual update source for the board until issue/project write access is available.
