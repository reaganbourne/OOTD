# otthomas Workboard

This is the focused build plan for `@otthomas`, who owns frontend and database work for OOTD.

## Current Status

- `chore-monorepo-scaffold` is already created, committed, and pushed.
- The repo scaffold is in place, but it is not merged into `main` yet.
- The next active work should start from the scaffold branch until that PR lands, or from `main` after it merges.

## Your Phase 1 Issues

### Issue 1. Set up monorepo structure
- Status: done on `chore-monorepo-scaffold`
- Branch: `chore-monorepo-scaffold`
- Notes: wait for merge into `main`

### Issue 3. Design v1 database schema
- Status: start now
- Recommended branch: `feature-db-v1-schema-design`
- Goal: define the first-pass schema for auth, outfits, and the social graph

### Issue 4. Add Alembic baseline and initial migrations
- Status: next after Issue 3
- Recommended branch: `feature-db-alembic-baseline`
- Goal: turn the approved schema into a runnable migration baseline

### Issue 7. Build login and signup screens
- Status: start now in parallel with Issue 3
- Recommended branch: `feature-fe-auth-screens`
- Goal: build the auth UI against mocked payloads first

### Issue 9. Build typed API client for web
- Status: wait for auth contract signoff
- Recommended branch: `feature-fe-api-client`
- Goal: replace auth mocks with a reusable client once backend payloads are locked

## Recommended Order

1. Start Issue 3 on `feature-db-v1-schema-design`
2. Start Issue 7 on `feature-fe-auth-screens`
3. Finish schema review and signoff with Reagan
4. Start Issue 4 on `feature-db-alembic-baseline`
5. Start Issue 9 on `feature-fe-api-client`

## Exact Branch Commands

Run these from the repo root.

### If `chore-monorepo-scaffold` is already merged into `main`

```powershell
git checkout main
git pull origin main
git checkout -b feature-db-v1-schema-design
```

```powershell
git checkout main
git pull origin main
git checkout -b feature-fe-auth-screens
```

```powershell
git checkout main
git pull origin main
git checkout -b feature-db-alembic-baseline
```

```powershell
git checkout main
git pull origin main
git checkout -b feature-fe-api-client
```

### If `chore-monorepo-scaffold` is not merged yet

```powershell
git fetch origin
git checkout chore-monorepo-scaffold
git pull origin chore-monorepo-scaffold
git checkout -b feature-db-v1-schema-design
```

```powershell
git fetch origin
git checkout chore-monorepo-scaffold
git pull origin chore-monorepo-scaffold
git checkout -b feature-fe-auth-screens
```

## Deliverables By Branch

### `feature-db-v1-schema-design`
- Add a schema document in `docs/`
- Define these MVP tables:
  - `users`
  - `refresh_sessions`
  - `outfits`
  - `clothing_items`
  - `follows`
  - `likes`
  - `comments`
- Define:
  - primary keys
  - foreign keys
  - unique constraints
  - core indexes
- Mark any table or field that is post-MVP

### `feature-fe-auth-screens`
- Build login page
- Build signup page
- Add validation states
- Add error states
- Add loading states
- Use mocked request and response payloads
- Keep the UI mobile-first

### `feature-db-alembic-baseline`
- Set up Alembic config
- Add initial migration
- Ensure fresh database bootstrap works
- Add short setup notes for local development

### `feature-fe-api-client`
- Create shared API client
- Add base URL config
- Add auth token handling
- Add refresh path handling
- Normalize API errors for the UI

## Dependencies and Blockers

### You can do these immediately
- Issue 3 schema design
- Issue 7 auth screens
- design tokens
- mocked auth responses
- form validation UX

### These depend on Reagan
- Issue 9 depends on auth request and response shapes
- later feed and board UI work depends on endpoint contracts

### These depend on your own earlier work
- Issue 4 depends on Issue 3 schema signoff

## This Week Plan

### Day 1
- Pull or base off `chore-monorepo-scaffold`
- Create `feature-db-v1-schema-design`
- Draft the schema doc
- List all MVP tables and relationships

### Day 2
- Finish schema constraints and indexes
- Review the schema with Reagan
- Create `feature-fe-auth-screens`
- Build the auth page structure and layout

### Day 3
- Finish validation and loading states on auth screens
- Freeze mocked auth payloads to match Reagan's draft contract
- Update the schema doc from any review feedback

### Day 4
- Create `feature-db-alembic-baseline`
- Add Alembic setup and initial migration
- Verify the migration plan is consistent with the schema doc

### Day 5
- If auth contract is ready, create `feature-fe-api-client`
- Build the shared client and wire it into the auth screens
- If auth contract is not ready, spend the day polishing auth UX and documenting frontend assumptions

## Definition of Done For Your Current Week

- schema doc exists and is reviewable
- auth screens are built with mocked data
- Alembic baseline is started or completed
- auth client branch is either started or clearly blocked on contract signoff
- Reagan has everything needed to build backend auth endpoints without guessing at your schema assumptions

## Questions To Resolve With Reagan

- Should usernames be required at signup or added later in onboarding?
- Should refresh sessions be stored as hashed tokens or opaque IDs?
- Are likes and comments MVP-critical or can comments be deferred?
- Will auth tokens live in cookies or in client-managed storage for the initial web build?
