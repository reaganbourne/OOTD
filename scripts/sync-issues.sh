#!/bin/bash
# Run from ~/OOTDtest: bash scripts/sync-issues.sh
set -e

echo "=== Closing completed issues ==="
gh issue close 22 --comment "Closed — merged in PR #63 (feat-be-feed-and-social). Endpoint live in prod."
gh issue close 53 --comment "Closed — merged in PR #66 (feat-be-story-card). Endpoint live in prod."

echo ""
echo "=== Phase 2 — Backend gaps ==="

gh issue create \
  --title "Edit profile endpoint" \
  --label "phase 2" \
  --assignee "reaganbourne" \
  --body "## Summary
\`PATCH /users/me\` — let users update their own profile.

## Fields
- \`display_name: str | None\`
- \`bio: str | None\`
- \`username: str | None\` (must be unique, validate format)

## Notes
- Auth required
- Return updated \`PublicProfile\` shape
- 409 if username already taken"

gh issue create \
  --title "Avatar upload endpoint" \
  --label "phase 2" \
  --assignee "reaganbourne" \
  --body "## Summary
\`POST /users/me/avatar\` — upload a profile photo to S3 and store the URL on the user row.

## Notes
- Same validation as outfit images: JPEG/PNG/WebP, max 10 MB
- Reuse the existing \`upload_image\` service — just a different S3 key prefix (\`avatars/{user_id}/\`)
- Store URL in \`users.profile_image_url\`
- Return updated profile"

echo ""
echo "=== Phase 2 — Missing UI tickets ==="

gh issue create \
  --title "Vault page UI — outfit grid" \
  --label "phase 2" \
  --assignee "otthomas" \
  --body "## Summary
Replace the current \`/vault\` placeholder with a real outfit grid.

## Requirements
- Responsive masonry or uniform grid of outfit cards
- Uses \`GET /outfits/me\` with cursor pagination (infinite scroll or load-more)
- Empty state: prompt user to upload their first outfit
- Outfit card: photo thumbnail, caption, worn date, vibe tone badge

## Depends on
Outfit card component (create that first — reused everywhere)"

gh issue create \
  --title "Outfit card component" \
  --label "phase 2" \
  --assignee "otthomas" \
  --body "## Summary
Reusable outfit card component used in the feed, vault, profile, boards, and explore pages.

## Must show
- Outfit photo (cover fit)
- \`@username\` + avatar (for feed context)
- Caption (truncated)
- Vibe tone badge (coloured pill matching the 10 tones)
- Worn date
- Tap → opens outfit detail view

## Notes
- Build this before the feed, vault, and profile pages — they all depend on it
- Should handle missing caption / missing vibe check gracefully"

gh issue create \
  --title "Outfit detail view" \
  --label "phase 2" \
  --assignee "otthomas" \
  --body "## Summary
Full-screen outfit detail — shown when tapping any outfit card.

## Must show
- Full-size outfit photo
- Vibe check text (full sentence) + tone badge
- Clothing items list (category, brand, color, link if present)
- Caption, event name, worn date
- \`@username\` + follow button (if viewing someone else's)
- Share button → opens story card / copy link options

## Notes
- Can be a modal sheet on mobile or a dedicated route
- Story card share: calls \`GET /outfits/{id}/story-card\`, triggers native share sheet"

gh issue create \
  --title "App navigation shell — bottom tab bar" \
  --label "phase 2" \
  --assignee "otthomas" \
  --body "## Summary
The persistent navigation frame that wraps all authenticated pages.

## Tabs
1. **Feed** — home feed from followed users
2. **Upload** — existing upload flow
3. **Vault** — personal outfit grid
4. **Profile** — own profile page

## Notes
- Active tab indicator
- Upload tab should be visually distinct (center button, larger)
- Works alongside the existing route-protection middleware"

gh issue create \
  --title "Onboarding flow UI" \
  --label "phase 2" \
  --assignee "otthomas" \
  --body "## Summary
Post-signup onboarding so new users aren't dropped into an empty app.

## Steps
1. **Welcome screen** — brief product pitch, 'Let's build your vault'
2. **Follow suggestions** — calls \`GET /users/suggested\` (backend ticket), show 5-8 users with follow buttons
3. **First outfit prompt** — 'Upload your first fit to get your vibe check' → links to upload flow

## Notes
- Only shown once (store completion flag in localStorage or cookie)
- Skip button on each step
- Depends on the suggested users endpoint"

echo ""
echo "=== Phase 3 — Sharing & virality ==="

gh issue create \
  --title "Open Graph tags + shareable outfit URL endpoint" \
  --label "phase 3" \
  --assignee "reaganbourne" \
  --body "## Summary
Makes outfit links look great when shared in iMessage, Twitter, Slack, etc.

## Endpoint
\`GET /outfits/{id}/og\` — returns JSON with OG metadata:
\`\`\`json
{
  \"title\": \"@usera's outfit — streetwear\",
  \"description\": \"Effortlessly cool with a streetwear edge.\",
  \"image_url\": \"/outfits/{id}/story-card\",
  \"url\": \"https://ootd.app/outfits/{id}\"
}
\`\`\`

## Notes
- No auth required
- Tomi uses this to populate \`<meta property='og:...'>\` tags on the public outfit page
- image_url points to the story card endpoint (already built)"

gh issue create \
  --title "Public outfit page — no auth required" \
  --label "phase 3" \
  --assignee "otthomas" \
  --body "## Summary
\`/outfits/{id}\` — a shareable web page for any outfit, accessible without an account.

## Must show
- Outfit photo
- \`@username\`, caption, vibe check, clothing items
- Open Graph meta tags (using the OG endpoint — backend ticket)
- 'Download OOTD' CTA — links to App Store / landing page
- Follow button (if logged in) or 'Sign up to follow' (if logged out)

## Notes
- This is the viral entry point — every shared story card should link here
- 404 if outfit not found"

gh issue create \
  --title "User search endpoint" \
  --label "phase 3" \
  --assignee "reaganbourne" \
  --body "## Summary
\`GET /users/search?q=reagan\` — search users by username or display_name.

## Returns
Array of \`PublicProfile\` objects (with follower count + following status).

## Notes
- Case-insensitive prefix match on username and display_name
- Limit to 20 results
- Auth optional — works logged out too (no following status if logged out)"

gh issue create \
  --title "Suggested users to follow endpoint" \
  --label "phase 3" \
  --assignee "reaganbourne" \
  --body "## Summary
\`GET /users/suggested\` — returns users worth following.

## Logic (in priority order)
1. Users followed by people you already follow (friends of friends)
2. Users with the most followers overall (fallback for new users with no follows)

## Returns
Array of \`PublicProfile\` (up to 10), excluding people already followed and yourself.

## Notes
- Auth required
- Used in onboarding flow and 'Who to follow' sidebar"

gh issue create \
  --title "Explore page UI" \
  --label "phase 3" \
  --assignee "otthomas" \
  --body "## Summary
A public grid of recent outfits from everyone on the platform — visible without following anyone.

## Requirements
- Grid of outfit cards (most recent first)
- Uses \`GET /outfits/feed\` when logged in, or a public endpoint TBD for logged-out users
- Search bar at top → links to user search UI
- 'Who to follow' rail (uses \`GET /users/suggested\`)

## Notes
- This solves the empty-feed problem for new users
- Consider a future 'trending' sort based on likes"

gh issue create \
  --title "User search UI" \
  --label "phase 3" \
  --assignee "otthomas" \
  --body "## Summary
Search screen — find other users by name or username.

## Requirements
- Search input with debounce (300ms)
- Results: avatar, display_name, @username, follower count, follow/unfollow button
- Empty state: 'No users found for ...'
- Loading skeleton while fetching

## Depends on
User search endpoint (backend ticket)"

gh issue create \
  --title "AI caption generator endpoint" \
  --label "phase 3" \
  --assignee "reaganbourne" \
  --body "## Summary
\`POST /outfits/{id}/suggest-caption\` — Claude looks at the outfit image and clothing items and suggests 3 caption options.

## Response
\`\`\`json
{
  \"suggestions\": [
    \"sunday best and absolutely built different 🤍\",
    \"the fit is giving — coastal grandmother meets city girl\",
    \"dressed for the life i'm manifesting\"
  ]
}
\`\`\`

## Notes
- Auth required (own outfit only)
- Sends image (base64) + clothing items + existing caption (if any) to Claude
- Tomi shows suggestions as tappable chips in upload step 3 (Context)"

echo ""
echo "=== Phase 4 — Notifications ==="

gh issue create \
  --title "Notification model + endpoints" \
  --label "phase 4" \
  --assignee "reaganbourne" \
  --body "## Summary
In-app notification system — new followers, likes, comments, board activity.

## Schema
\`\`\`
notifications
  id          UUID PK
  user_id     UUID FK → users (recipient)
  actor_id    UUID FK → users (who triggered it)
  type        ENUM: follow | like | comment | board_join | board_outfit
  outfit_id   UUID FK → outfits (nullable)
  board_id    UUID FK → boards (nullable)
  body        String (pre-rendered text, e.g. '@usera liked your outfit')
  seen        Boolean default false
  created_at  DateTime
\`\`\`

## Endpoints
- \`GET /notifications\` — paginated, newest first, auth required
- \`POST /notifications/seen\` — mark all as seen (or specific IDs)
- \`GET /notifications/unseen-count\` — for the bell badge"

gh issue create \
  --title "Notification center UI" \
  --label "phase 4" \
  --assignee "otthomas" \
  --body "## Summary
Bell icon in the nav bar with unseen count badge + notification list screen.

## Requirements
- Bell icon in top nav with red dot when unseen count > 0
- Notification list: avatar, text, timestamp, thumbnail if outfit-related
- Tap notification → navigate to relevant outfit/profile/board
- Mark all as seen on open
- Empty state: 'No notifications yet'

## Depends on
Notification model + endpoints (backend ticket)"

gh issue create \
  --title "Email notifications" \
  --label "phase 4" \
  --assignee "reaganbourne" \
  --body "## Summary
Transactional and digest emails using Resend (or SendGrid).

## Emails to send
1. **Welcome email** — on registration, product intro + link to upload first outfit
2. **New follower** — 'X started following you'
3. **Weekly digest** — 'Here's what you missed this week' (if inactive 7+ days)
4. **Streak reminder** — 'You're on a 4-day streak 🔥 — don't break it'

## Notes
- Add \`email_notifications: bool\` opt-out to user model
- Streak reminder is highest-retention email — prioritise it"

gh issue create \
  --title "Edit profile UI" \
  --label "phase 4" \
  --assignee "otthomas" \
  --body "## Summary
Settings screen for editing own profile.

## Fields
- Avatar (tap to upload — uses avatar upload endpoint)
- Display name
- Username (with availability check)
- Bio (textarea, 160 char limit)

## Notes
- Depends on edit profile endpoint + avatar upload endpoint (backend phase 2 tickets)
- Accessible from own profile page via 'Edit' button"

gh issue create \
  --title "Style profile AI endpoint" \
  --label "phase 4" \
  --assignee "reaganbourne" \
  --body "## Summary
\`GET /users/me/style-profile\` — Claude analyzes the user's last 30 outfits and returns a paragraph describing their dominant aesthetic.

## Response
\`\`\`json
{
  \"summary\": \"Your style is grounded in effortless minimalism with a soft edge — lots of neutral tones, clean silhouettes, and the occasional streetwear statement piece.\",
  \"top_tones\": [\"minimalist\", \"casual\", \"streetwear\"],
  \"updated_at\": \"2026-04-01T00:00:00Z\"
}
\`\`\`

## Notes
- Cache the result and regenerate at most once per week (store in a new \`style_profiles\` table or as a JSON column on users)
- Only available if user has 5+ outfits"

gh issue create \
  --title "Style profile + caption suggestions UI" \
  --label "phase 4" \
  --assignee "otthomas" \
  --body "## Summary
Two UI features powered by the AI endpoints.

## 1. Style profile card on own profile page
- Shown below the vault grid on own profile
- 'Your vibe: ...' paragraph
- Top 3 tone pills
- 'Updated X days ago'

## 2. Caption suggestions in upload flow
- On Step 3 (Context/metadata), after the caption field
- 'Need inspiration?' → fetches suggestions from \`POST /outfits/{id}/suggest-caption\`
- Shows 3 tappable chips — tap to populate the caption field

## Depends on
Style profile endpoint + caption generator endpoint (phase 4 backend tickets)"

echo ""
echo "=== Phase 5 — Mobile ==="

gh issue create \
  --title "React Native / Expo mobile app scaffold" \
  --label "phase 5" \
  --body "## Summary
OOTD is fundamentally a mobile-first experience — camera access, daily habit, share sheet integration. Plan the mobile app scaffold early.

## Scope
- Expo + TypeScript scaffold
- Shared API client from \`packages/contracts\`
- Auth flow (login/register)
- Bottom tab navigator: Feed / Upload / Vault / Profile
- Camera integration for outfit upload
- Native share sheet for story cards (\`GET /outfits/{id}/story-card\`)
- Push notifications via Expo Notifications

## Notes
- Reuse API contracts from packages/contracts
- iOS first, Android later
- No timeline yet — flag for Phase 5 planning"

echo ""
echo "=== All done! ==="
echo "Closed: #22, #53"
echo "Created: all new phase 2-5 tickets"
