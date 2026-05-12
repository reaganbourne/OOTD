# reaganbourne Workboard

Owned areas: `services/api/`, backend APIs, database (SQLAlchemy models, Alembic migrations), infra wiring

Last synced: 2026-05-11

## Done (merged to main)

### Foundation
- Repo scaffold
- v1 DB schema (all 7 tables in initial migration)
- FastAPI scaffold (routers, models, config, Docker Compose)
- Auth API contract (`packages/contracts/auth-contract.md`)
- JWT auth flow (register, login, refresh, logout, /me)
- Auth integration tests — 30 tests, GitHub Actions CI
- S3 image storage adapter (`app/services/storage.py`)

### Phase 2 — Core MVP
- Create-outfit endpoint (`POST /outfits` — multipart upload + clothing items)
- Follow/unfollow endpoints (`POST /users/{id}/follow`, `DELETE /users/{id}/follow`)
- `link_url` field on clothing items (nullable, migration + schema update)
- User profile endpoints (`GET /users/{username}` — public profile with follower/following counts)
- Vault endpoints (`GET /outfits/me`, `GET /users/{username}/outfits` — cursor-paginated)
- Feed endpoint (`GET /outfits/feed` — outfits from followed users, cursor-paginated)
- Explore endpoint (`GET /outfits/explore`)
- Likes and comments endpoints (like/unlike, paginated comments, add/delete)
- Vault search endpoint (`GET /outfits/search?q=...` — full-text search)
- User search endpoint
- Outfit delete endpoint (direct SQL DELETE so Postgres CASCADE handles children)

### Phase 3 — Boards
- Boards schema migration (`boards`, `board_memberships`, `board_outfits` tables)
- Board CRUD endpoints (`POST`, `GET`, `PATCH`, `DELETE /boards/{id}`)
- Board outfit upload endpoint (`POST /boards/{id}/outfits`)
- Board creator moderation endpoints (delete outfit, remove member)
- Board expiry system (`expires_at = event_date + 30 days`)
- Board outfit author field added to board outfit responses

### Phase 3 — Story Card & AI
- Vibe check AI — Claude integration, witty blurb + tone tag stored on outfit
- Vibe check runs synchronously on `POST /outfits` and is included in the 201 response
- Story card image generation (`GET /outfits/{id}/story-card` — 1080×1920 PNG, Pillow)

### Pre-launch Fixes
- Railway deployment wiring (port, healthcheck, Dockerfile, Alembic on startup)
- S3 image proxy through Next.js for share card canvas CORS
- Auth cookie `SameSite=None` for cross-origin Railway/Vercel setup
- Direct SQL DELETE for outfit FK cascade fix

### Phase 5 — Performance (PRs #167–171, all merged 2026-05-11)
- **PR #167** — N+1 fix: `get_by_ids()` bulk author fetch + `selectinload(Outfit.clothing_items)` on all paginated queries. Feed/explore went from 41 queries → 3 for 20 outfits.
- **PR #168** — Auth bootstrap collapse: `POST /auth/refresh` now returns `user` alongside `access_token`; frontend skips second `GET /auth/me` call.
- **PR #169** — Request duration logging middleware: logs `METHOD /path STATUS Xms`; WARNING level for requests > 500ms.
- **PR #170** — `next/image` in outfit cards: `remotePatterns` for `*.amazonaws.com` and `localhost:8000`, AVIF/WebP output, `fill` layout with accurate `sizes`.
- **PR #171** — Vibe check in immediate response: runs synchronously before DB write so 201 includes populated `vibe_check_text` and `vibe_check_tone`.

## Up Next

### Performance — remaining plan items
- Thumbnail generation at upload time (400px thumb, 900px medium, original preserved)
- HTTP cache headers on public outfit/profile endpoints
- Cached story card PNGs (currently regenerated on every request)

### Server-side rendering
- Convert explore and public outfit detail to Next.js Server Component shells
- Add `loading.tsx` for major routes
- Stream below-fold content with `Suspense`

### Infrastructure
- Confirm Railway API + Postgres are in same region (target `us-east-1` if US-based)
- CloudFront in front of S3 for image delivery

### Security (plan in `docs/security-plan.md`)
- Rate limiting on auth endpoints
- Password complexity validation
- Other items per security plan
