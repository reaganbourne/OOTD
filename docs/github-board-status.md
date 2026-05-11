# GitHub Board Status

Last synced: 2026-05-11

## Ownership

- `@otthomas` — frontend (`apps/web/`)
- `@reaganbourne` — backend + database (`services/api/`, models, migrations)

## Merged to Main

| PR | Title | Owner |
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
| #17 | Outfit + clothing item schema | reaganbourne |
| #18 | S3 image storage adapter | reaganbourne |
| #19 | Outfit upload flow UI | otthomas |
| #20 | Create-outfit endpoint | reaganbourne |
| #21 | Home feed grid | otthomas |
| #22 | Feed endpoint with cursor pagination | reaganbourne |
| #23 | Follow/unfollow endpoints | reaganbourne |
| #39 | `link_url` on clothing items | reaganbourne |
| #40 | User profile + vault endpoints | reaganbourne |
| #41 | Profile page UI | otthomas |
| #42 | Feed tabs UI | otthomas |
| #50 | Board creation and join UI | otthomas |
| #51 | Board outfit upload UI | otthomas |
| #52 | Vibe check AI endpoint | reaganbourne |
| #53 | Story card image generation | reaganbourne |
| #54 | Story card share UI | otthomas |
| #55 | Likes and comments endpoints | reaganbourne |
| #56 | Vault search endpoint | reaganbourne |
| #57 | Likes, comments, and search UI | otthomas |
| #72 | App navigation shell | otthomas |
| #73 | Onboarding flow UI | otthomas |
| #78 | Explore page UI | otthomas |
| #79 | User search UI | otthomas |
| #84 | Edit profile UI | otthomas |
| #129–143 | Design system, checkd v2, frontend polish | otthomas |
| #140 | Board outfit author field + explore endpoint | reaganbourne |
| #144–166 | Pre-launch QA fixes, auth persistence, story card polish | both |
| #167 | N+1 fix: bulk author fetch + selectinload | reaganbourne |
| #168 | Auth bootstrap: refresh returns user | both |
| #169 | Request duration logging middleware | reaganbourne |
| #170 | next/image in outfit cards + remotePatterns | both |
| #171 | Vibe check in immediate POST response | reaganbourne |

## Open — Performance Remaining

| Item | Owner | Notes |
|---|---|---|
| Thumbnail generation at upload (400px/900px/original) | reaganbourne | Currently serving originals via next/image optimizer |
| HTTP cache headers on public endpoints | reaganbourne | Explore, public outfit detail, public profiles |
| Cached story card PNGs | reaganbourne | Currently regenerated per request |
| Frontend timing marks (`performance.mark()`) | otthomas | Feed/explore/profile load instrumentation |
| Prefetch card detail routes | otthomas | On viewport entry |

## Open — Server-Side Rendering

| Item | Owner | Notes |
|---|---|---|
| Server Component shell for explore page | otthomas | Good candidate — public, no auth required |
| Server Component shell for public outfit detail | otthomas | OG metadata + streaming |
| `loading.tsx` for major routes | otthomas | Feed, vault, profile |
| Lazy-load images below first viewport | otthomas | Only first 6–8 cards should be eager |

## Open — Infrastructure

| Item | Owner | Notes |
|---|---|---|
| Confirm Railway API + Postgres region match | reaganbourne | Target us-east-1 if US user base |
| CloudFront in front of S3 | reaganbourne | Image delivery CDN + long cache headers |

## Open — Monthly Fits Wrapped

| Item | Owner | Notes |
|---|---|---|
| Wrapped API endpoint | reaganbourne | `GET /users/me/wrapped?month=2026-04` |
| Wrapped UI | otthomas | Blocked on backend |

## Open — Security (see `docs/security-plan.md`)

| Item | Owner | Notes |
|---|---|---|
| Rate limiting on auth endpoints | reaganbourne | Branch exists, not merged |
| Password complexity validation | reaganbourne | Branch exists, not merged |

## CI Status

GitHub Actions runs `pytest` on every push and PR to `services/api/`. Playwright smoke tests run on every push and PR to `apps/web/`. All tests passing on main as of 2026-05-11.
