# otthomas Workboard

Owned areas: frontend only in `apps/web/`

Last synced: 2026-04-12

## Current Status

- Historical early work included the repo scaffold and v1 schema doc
- Active ownership is now frontend only
- Auth and entry-flow frontend work is merged through GH #16

## Done On Main

- auth screens
- GH #11 `Build typed API client for web`
- GH #14 `Add auth state management to web app`
- GH #15 `Add Next.js route protection middleware`
- GH #16 `Update home page from scaffold placeholder to real landing`

## What Is Actually Unblocked

- No official GitHub frontend issues are fully unblocked right now
- The next official frontend issue is GH #19, but it depends on backend work that is not finished yet

## Remaining Frontend Issues

### GH #19 `Build outfit upload flow UI`
- Status: blocked
- Blocked by: GH #18 and GH #20
- Recommended branch: `feature-fe-upload-flow-ui`
- Acceptance criteria:
  - Step 1 photo selection with image preview
  - Step 2 clothing item tag entry with `brand`, `category`, `color`, and stable `display_order`
  - Step 3 optional metadata for caption, event name, and worn date
  - review step before final submit
  - loading and error states on submit
  - mobile-first flow
  - missing required photo or category is blocked with clear messaging

### GH #21 `Build home feed grid`
- Status: blocked
- Blocked by: GH #22
- Recommended branch: `feature-fe-home-feed-grid`
- Acceptance criteria:
  - `/feed` is protected
  - mobile uses a 2-column grid
  - desktop uses a 3-column grid
  - cards show outfit photo, username, and date
  - tapping a card opens outfit detail
  - loading skeleton state exists
  - empty state exists for users who follow nobody yet
  - pagination or infinite scroll uses cursor-based API responses

## What Still Needs To Happen Before You Can Pick Up GH #19

- Reagan finishes GH #18 image storage adapter
- Reagan finishes GH #20 create-outfit endpoint
- payload shape for upload submit is frozen so the frontend is not guessing

## What Still Needs To Happen Before You Can Pick Up GH #21

- Reagan finishes GH #22 feed endpoint with cursor pagination
- feed card payload shape is frozen
- at least one demo dataset or seeded response shape exists for empty and loaded states

## Safe Parallel Prep Work

These are not official issue completions, but they are safe mock-first prep once you want to stay busy before blockers clear:

- design the upload flow step layout and local component structure
- build reusable outfit card UI for the future feed
- polish shared authenticated app chrome for `vault`, `feed`, and `upload`
- prepare loading, empty, and error states using fixtures

## Recommended Next Move

Wait for GH #18 and GH #20 if you want the cleanest official path.

If you want momentum before then, build a mock-first shell for GH #19 on a separate branch and treat real API wiring as a later pass.

## Source Of Truth

- Shared status: `docs/github-board-status.md`
- Full long-range backlog: `docs/github-ready-issue-list.md`
