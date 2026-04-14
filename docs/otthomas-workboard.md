# otthomas Workboard

Owned areas: frontend only in `apps/web/`

Last synced: 2026-04-13

## Done (merged to main)

- Typed API client for web (GH #11)
- Auth screens (login, register)
- Auth state management (GH #14)
- Next.js route protection middleware (GH #15)
- Landing page (GH #16)

## Phase 2 — Unblocked now

### GH #58 — Figma design system
- Color palette, typography, spacing tokens
- Core components: buttons, cards, inputs, modals, bottom sheets
- Screen designs: feed, profile/vault, board detail, story card, upload flow
- Export tokens for Tailwind
- Tools: Figma + v0.dev
- **Start here — everything else benefits from having designs first**

## Phase 2 — Blocked on backend

### GH #19 — Build outfit upload flow UI
- Blocked by: GH #20 (done ✅) and GH #39 (link_url field — Reagan's next)
- Multipart upload flow: photo picker → clothing item tags (category, brand, color, link_url) → metadata (caption, event, date) → review → submit
- Mobile-first, loading + error states

### GH #21 — Build home feed grid
- Blocked by: GH #22 (feed endpoint — Reagan's queue)
- Two-tab layout: Vault Feed + Boards Activity
- Outfit card component, board activity card, infinite scroll

### GH #41 — Build profile page UI
- Blocked by: GH #40 (profile endpoints — Reagan's queue)
- Profile header (avatar, name, bio, follower/following counts, follow button)
- Vault grid with infinite scroll
- Own vs other profile view

### GH #42 — Build feed tabs UI
- Blocked by: GH #22 (feed) and boards backend
- Tab switcher (Vault Feed / Boards)
- Outfit card + board activity card components

## Phase 3 — Boards

### GH #50 — Build board creation and join UI
- Create board form (name, description, event date, Pinterest URL)
- Shareable link screen, join landing page, board detail page
- Pinterest embed rendering, member avatars

### GH #51 — Build board outfit upload UI
- Camera/gallery picker in board context, caption field
- Simpler than vault upload — no clothing item tags required

## Phase 3 — Story Card

### GH #54 — Build story card share UI
- "Generate vibe check" button on outfit detail
- Full-screen 9:16 story card preview
- Download + native share sheet, fallback when no vibe check exists

## Phase 3 — Monthly Fits Wrapped

### GH #TBD — Monthly Fits Wrapped UI
- Animated presentation (Spotify Wrapped-style)
- Cards for: total outfits, top colors, top brands, most active day, vibe of the month, top outfit, longest streak
- Shareable summary card (downloadable image)

## Phase 4

### GH #57 — Likes, comments, and search UI
- Like button with count on cards and detail page
- Comments modal on outfit detail
- Search bar + results grid on vault/profile

### GH #59 — UI polish and redesign pass
- Redesign: landing, feed, upload flow, profile, outfit detail
- Depends on GH #58 Figma design system
- Tools: v0.dev for generation → Next.js

## Recommended Order

1. #58 Figma design system (start now, no blockers)
2. #19 outfit upload flow (once #39 lands)
3. #41 profile page (once #40 lands)
4. #21 + #42 feed + tabs (once #22 lands)
5. #50 board creation + join UI
6. #51 board outfit upload UI
7. #54 story card share UI
8. Wrapped UI
9. #57 likes, comments, search UI
10. #59 redesign pass
