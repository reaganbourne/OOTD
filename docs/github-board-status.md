# GitHub Board Status

Last synced: 2026-04-13

## Ownership

- `@otthomas` — frontend (`apps/web/`)
- `@reaganbourne` — backend + database (`services/api/`, models, migrations)

## Merged to Main

| Issue | Title | Owner |
|---|---|---|
| #2 | Repo scaffold | both |
| #5 | v1 DB schema | reaganbourne |
| #6 | FastAPI scaffold | reaganbourne |
| #8 | Auth API contract | reaganbourne |
| #9 | Docker Compose local dev stack | reaganbourne |
| #10 | Alembic baseline + initial migration | reaganbourne |
| #11 | Typed API client for web | otthomas |
| #12 | JWT auth flow | reaganbourne |
| #13 | Auth integration tests + CI | reaganbourne |
| #14 | Auth state management | otthomas |
| #15 | Route protection middleware | otthomas |
| #16 | Landing page | otthomas |
| #17 | Outfit + clothing item schema | reaganbourne (included in #10) |
| #18 | S3 image storage adapter | reaganbourne |
| #20 | Create-outfit endpoint | reaganbourne |

## Open Issues by Phase

### Phase 2 — Core MVP

| # | Title | Owner | Blocked by |
|---|---|---|---|
| #23 | Follow and unfollow endpoints | reaganbourne | — |
| #39 | Add link_url to clothing items | reaganbourne | — |
| #40 | User profile and vault endpoints | reaganbourne | — |
| #22 | Feed endpoint with cursor pagination | reaganbourne | #23 |
| #19 | Build outfit upload flow UI | otthomas | #39 |
| #21 | Build home feed grid | otthomas | #22 |
| #41 | Build profile page UI | otthomas | #40 |
| #42 | Build feed tabs UI | otthomas | #22, boards |
| #58 | Figma design system | otthomas | — |

### Phase 3 — Boards

| # | Title | Owner | Blocked by |
|---|---|---|---|
| #43 | Boards schema migration | reaganbourne | — |
| #44 | Board CRUD endpoints | reaganbourne | #43 |
| #45 | Board outfit upload endpoint | reaganbourne | #43, #44 |
| #46 | Board creator moderation | reaganbourne | #43, #44 |
| #47 | Board expiry system | reaganbourne | #43 |
| #48 | Pinterest embed integration | reaganbourne | #43 |
| #49 | Board activity SMS notifications | reaganbourne | #43 |
| #50 | Build board creation and join UI | otthomas | #44 |
| #51 | Build board outfit upload UI | otthomas | #45 |

### Phase 3 — Story Card & AI

| # | Title | Owner | Blocked by |
|---|---|---|---|
| #52 | Vibe check AI endpoint | reaganbourne | — |
| #53 | Story card image generation | reaganbourne | #52 |
| #54 | Build story card share UI | otthomas | #52, #53 |

### Phase 3 — Monthly Fits Wrapped

| # | Title | Owner | Blocked by |
|---|---|---|---|
| TBD | Monthly Fits Wrapped endpoint | reaganbourne | — |
| TBD | Monthly Fits Wrapped UI | otthomas | backend |

### Phase 4 — Engagement & Polish

| # | Title | Owner | Blocked by |
|---|---|---|---|
| #55 | Likes and comments endpoints | reaganbourne | — |
| #56 | Vault search endpoint | reaganbourne | — |
| #57 | Likes, comments, and search UI | otthomas | #55, #56 |
| #59 | UI polish and redesign pass | otthomas | #58 |

## What to Work on Now

**reaganbourne:** Start #23 (follow/unfollow) — unblocked, unlocks the feed.

**otthomas:** Start #58 (Figma design system) — unblocked, no backend dependency.

## CI Status

GitHub Actions runs `pytest` on every push and PR touching `services/api/`. Currently 30 passing tests covering all auth endpoints.
