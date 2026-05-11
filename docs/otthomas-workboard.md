# otthomas Workboard

Owned areas: frontend only in `apps/web/`

Last synced: 2026-05-11

## Done (merged to main)

### Foundation
- Typed API client for web (GH #11)
- Auth screens (login, register, confirm password)
- Auth state management (GH #14)
- Next.js route protection middleware (GH #15)
- Landing page (GH #16)

### Phase 2 — Core MVP
- Outfit upload flow UI — photo picker → clothing item tags → metadata → review → submit (GH #19)
- Home feed grid (GH #21)
- Profile page UI — header, vault grid, follower/following counts, follow button (GH #41)
- Feed tabs UI — Vault Feed + Boards Activity (GH #42)
- Likes, comments, and search UI (GH #57)

### Phase 3 — Boards
- Board creation and join UI (GH #50)
- Board outfit upload UI (GH #51)

### Phase 3 — Story Card
- Story card share UI — full-screen 9:16 preview, download + native share (GH #54)
- Vibe check on story card, one-sentence vibe display (PR #162)

### Phase 3 — Navigation & Onboarding
- App navigation shell — bottom tab bar with upload FAB (GH #72)
- Onboarding flow UI (GH #73)
- Explore page UI (GH #78)
- User search UI (GH #79)
- Edit profile UI (GH #84)

### Design System
- Checkd v2 design implementation applied across the app (PRs #139–143)
- Design token cleanup, desktop nav, typography polish

### Pre-launch Polish (PRs #144–166)
- QA bug sweep (dead buttons, follow API, missing pages, board overlap, member lists)
- Auth session persistence — access token in sessionStorage survives page refreshes
- Auth redirect with `?next=` param, board invite page redesign
- Home font, profile tabs, SameSite=None cookie, follow lists
- Strava-style share card, date picker, outfit delete UI
- Inline comments, auto-join boards, back button improvements
- Story card 9:16 aspect ratio fix, vibe badge roundRect polyfill (iOS < 15.4)
- Smooth page transitions, clean vibe prompt copy
- Mobile/desktop home page unified layout

### Performance (PRs #167–171)
- `next/image` in outfit cards — AVIF/WebP delivery, fill layout with `sizes` (PR #170)
- Auth bootstrap: skip second `GET /auth/me` after refresh, use user from refresh response (PR #168)
- Smoke test updated: image selectors use `alt` attribute; mock URL matches `remotePatterns`

## Up Next

### Performance
- Frontend timing marks (`performance.mark()`) around feed/explore/profile loads
- Prefetch detail routes when card links enter viewport
- Skeleton cards sized to match final content dimensions

### Server-side rendering
- Convert explore and public outfit detail to Server Component shells
- Add `loading.tsx` for major routes
- Lazy-load outfit images below the first viewport

### Monthly Fits Wrapped
- Animated stats presentation (Spotify Wrapped–style)
- Cards: total outfits, top colors/brands, most active day, vibe of the month, top outfit, streak
- Shareable summary card (downloadable image)
