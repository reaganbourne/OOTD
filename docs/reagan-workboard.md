# reaganbourne Workboard

Owned areas: `services/api/`, backend APIs, database (SQLAlchemy models, Alembic migrations), infra wiring

Last synced: 2026-04-13

## Done (merged to main)

- Repo scaffold
- v1 DB schema (all 7 tables in initial migration)
- FastAPI scaffold (routers, models, config, Docker Compose)
- Auth API contract (`packages/contracts/auth-contract.md`)
- JWT auth flow (register, login, refresh, logout, /me)
- Auth integration tests — 30 tests, GitHub Actions CI
- S3 image storage adapter (`app/services/storage.py`)
- Create-outfit endpoint (`POST /outfits` — multipart upload + clothing items)
- Outfit API contract (`packages/contracts/outfit-contract.md`)

## Up Next (Phase 2)

### GH #23 — Follow and unfollow endpoints
- Branch: `feat-be-follow-endpoints`
- `POST /users/{user_id}/follow` (idempotent), `DELETE /users/{user_id}/follow` (idempotent)
- Self-follow returns 400, unknown user returns 404, both require auth

### GH #39 — Add link_url field to clothing items
- Branch: `feat-be-clothing-link`
- Migration adding nullable `link_url` to `clothing_items`
- Update model, schema, and create-outfit endpoint

### GH #40 — User profile and vault endpoints
- Branch: `feat-be-profile`
- `GET /users/{username}` — public profile with follower/following counts
- `GET /users/{username}/outfits` — paginated vault (cursor-based)
- `GET /outfits/me` — current user's own vault

### GH #22 — Feed endpoint with cursor pagination
- Branch: `feat-be-feed`
- `GET /feed` — outfits from followed users, newest first, cursor paginated
- Blocked by: #23 (needs follows to query)

## Phase 3 — Boards

### GH #43 — Boards schema migration
- New tables: `boards`, `board_memberships`, `board_outfits`
- `boards`: id, creator_id, name, description, event_date, expires_at, invite_token, pinterest_url
- `board_outfits` is completely separate from the vault `outfits` table

### GH #44 — Board CRUD endpoints
- `POST /boards`, `GET /boards/{invite_token}`, `GET /boards/{id}`, `PATCH /boards/{id}`, `DELETE /boards/{id}`
- Expired boards (expires_at in past) return 410

### GH #45 — Board outfit upload endpoint
- `POST /boards/{id}/outfits` — multipart upload, stores to `board_outfits` not vault
- Non-members: 403, expired board: 410

### GH #46 — Board creator moderation endpoints
- `DELETE /boards/{id}/outfits/{outfit_id}` (creator or uploader)
- `DELETE /boards/{id}/members/{user_id}` (creator only, removes their outfits too)

### GH #47 — Board expiry system
- expires_at = event_date + 30 days, enforced on all endpoints
- Background cleanup for S3 images from boards expired 90+ days

### GH #48 — Pinterest embed integration
- `GET /boards/{id}/pinterest-embed` — fetches Pinterest oEmbed, caches 1 hour

### GH #49 — Board activity SMS notifications
- Add phone_number + sms_opt_in to users, PATCH /users/me to update
- Twilio: text opted-in members when 5+ outfits uploaded to a board in 1 hour

## Phase 3 — Story Card & AI

### GH #52 — Vibe check AI endpoint
- `POST /outfits/{id}/vibe-check` — calls Claude, stores witty blurb + tone tag
- Adds `anthropic` to requirements, `ANTHROPIC_API_KEY` to config

### GH #53 — Story card image generation endpoint
- `GET /outfits/{id}/story-card` — returns 1080x1920 PNG
- Full-bleed photo, frosted glass panel, username, date, vibe check text
- Built with Pillow, works without a vibe check

## Phase 3 — Monthly Fits Wrapped

### GH #TBD — Monthly Fits Wrapped endpoint
- `GET /users/me/wrapped?month=2026-04`
- Stats: total outfits, top 3 colors/brands, most active day, most used category, vibe of the month, top outfit, longest streak
- 404 if no outfits for the month, defaults to current calendar month

## Phase 4

### GH #55 — Likes and comments endpoints
- Like/unlike, paginated comments, add/delete comment
- Tables already in schema

### GH #56 — Vault search endpoint
- `GET /outfits/search?q=black+mini+dress`
- PostgreSQL full-text search across caption, category, brand, color
- Scoped to authenticated user's vault

## Recommended Order

1. #23 follow/unfollow
2. #39 link_url on clothing items
3. #40 profile + vault endpoints
4. #22 feed endpoint
5. #43 boards schema migration
6. #44 board CRUD
7. #45 board outfit upload
8. #46 board moderation
9. #47 board expiry
10. #48 Pinterest embed
11. #49 SMS notifications
12. #52 vibe check AI
13. #53 story card
14. Wrapped endpoint
15. #55 likes + comments
16. #56 vault search
