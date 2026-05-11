# App performance plan

> **Status as of 2026-05-11:** Phase 1 and Phase 3 are complete. Phase 2 is partially done (next/image shipped; thumbnail generation pending). Phases 4 and 5 are pending.


This write-up focuses on making the app feel faster for real users. The current stack is a Next.js web app on Vercel, a FastAPI service on Railway, Postgres on Railway, and images in S3. Deployment matters, but the biggest gains will likely come from shortening the first-screen request chain, optimizing images, and removing backend query work that grows with feed size.

## Current performance hypothesis

The app is doing too much after the browser loads:

1. Browser downloads and hydrates client-side Next.js pages.
2. Auth bootstraps in the browser, sometimes with `/auth/refresh` and then `/auth/me`.
3. The page fetches data from the public Railway API URL.
4. The API queries Postgres and often does additional per-row lookups.
5. The browser downloads outfit/profile images directly from S3.

Any one of those can be okay. Together, they make the app feel slower than it needs to, especially on mobile networks.

## What to measure first

Do this before changing infrastructure so we can prove which fixes actually help.

### Frontend metrics

Add lightweight route timing in the web app:

- Time to first page shell.
- Time from route mount to first API request.
- Time from route mount to first outfit cards visible.
- API duration per endpoint from the browser's perspective.
- Image load time for outfit cards.

Recommended tools:

- Vercel Speed Insights for field-level web vitals.
- Browser Performance tab for local reproduction.
- Simple `performance.mark()` instrumentation around feed/explore/profile loads.

### API metrics

Add request duration logging middleware in FastAPI:

- Method, path, status, duration.
- Slow request warning threshold, for example `>500ms`.
- DB query count per request if possible.

Start with the endpoints users feel most:

- `GET /outfits/feed`
- `GET /outfits/explore`
- `GET /outfits/me`
- `GET /users/me`
- `POST /outfits`
- `GET /boards`
- `GET /boards/{id}/outfits`

### Deployment checks

Confirm these in production:

- Vercel project region.
- Railway API region.
- Railway Postgres region.
- S3 bucket region.
- Whether API and Postgres are in the same Railway project/environment.

The deployment guide currently points S3 at `us-east-2`. Railway supports deploy regions including US East/Virginia and US West/California. Vercel Functions can also be configured to run close to data sources. Aligning compute and data region is one of the easiest infrastructure wins.

## Highest-impact fixes

### 1. Optimize images and generate thumbnails

This is likely the biggest user-visible win because the app is image-heavy.

Current issue:

- The app uses raw `<img>` tags in many core screens.
- Uploaded outfit images may be served as large originals.
- Browsers may download more pixels than the card actually needs.

Recommended fix:

- Generate multiple image sizes at upload time:
  - `thumb`: around 400px wide for feed cards.
  - `medium`: around 900px wide for detail pages.
  - `original`: preserved for downloads or future processing.
- Store dimensions and thumbnail URLs on the outfit record.
- Use thumbnails in feed/explore/boards/profile grids.
- Use medium image on detail pages.
- Keep originals out of the critical browsing path.

Next.js option:

- Use `next/image` for remote images where layout dimensions are stable.
- Configure `images.remotePatterns` in `apps/web/next.config.ts` for the exact S3/CloudFront host.
- Use `sizes` accurately so mobile does not download desktop-sized images.

Infrastructure option:

- Put CloudFront in front of S3 for image delivery.
- Consider S3 Transfer Acceleration only for uploads from far-away users. It helps long-distance uploads into S3, but it is not a replacement for thumbnails/CDN delivery.

Why this matters:

- Next.js image optimization can serve correctly sized images and modern formats, but it needs remote image configuration and explicit dimensions for remote images.
- Thumbnails reduce bytes before they ever reach the browser or Next image optimizer.

### 2. Remove feed/explore N+1 queries

Current issue:

- `GET /outfits/feed` and `GET /outfits/explore` fetch outfits, then loop through results and call `user_crud.get_by_id()` for each unique author.
- `OutfitOut.model_validate(outfit)` can also touch `clothing_items`, which may trigger lazy relationship loads.
- Comments do per-comment author lookups.

Recommended fix:

- Fetch authors in one bulk query by user IDs.
- Use SQLAlchemy eager loading for relationships needed in response models.
- For outfit lists, avoid returning full clothing item detail unless the UI needs it on the card.
- Add tests that assert response shape stays stable.

Implementation direction:

- Add a `user_crud.get_by_ids(db, ids)` helper.
- In feed/explore, build `author_by_id` once.
- Use `selectinload(Outfit.clothing_items)` where clothing items are required.
- Consider a separate `FeedOutfitSummary` schema that excludes `clothing_items` for card lists.

Why this matters:

- SQLAlchemy lazy loading emits extra SELECT statements when a relationship is accessed after the parent query. `selectinload()` batches related rows into a small number of queries.

### 3. Shorten auth bootstrap

Current issue:

- `AuthProvider` runs on the client.
- On cold page load it may call `/auth/refresh`, then `/auth/me`, then the page makes its own data request.
- Because the API is cross-origin, every extra request is noticeable.

Recommended fix:

- Collapse auth bootstrap to one request when possible.
- Make `/auth/refresh` return the user object along with the access token, so refresh does not need to be followed by `/auth/me`.
- Hydrate initial auth state from a server-readable session signal where practical.
- Avoid blocking public pages on auth unless they actually need it.

Possible endpoint change:

- Current: `POST /auth/refresh` -> access token, then `GET /auth/me` -> user.
- Better: `POST /auth/refresh` -> access token + user.

Why this matters:

- Fewer serial requests means the UI can show real content sooner.

### 4. Move first-screen data fetching closer to the server

Current issue:

- Core pages are client components that fetch in `useEffect`.
- That means the browser must load JavaScript and hydrate before data fetching starts.

Recommended fix:

- Convert read-heavy screens to Server Component shells where possible.
- Fetch initial page data on the server, then pass it to client components for interactivity.
- Keep infinite scroll, likes, comments, and uploads client-side.

Best candidates:

- Explore page.
- Public outfit detail page.
- Public profile page.
- Feed initial page, if auth can be handled cleanly on the server.

Why this matters:

- Next.js App Router supports data fetching in Server Components and streaming. Server fetching can start before client hydration, and loading states can be streamed with `loading.tsx` and `Suspense`.

### 5. Align deployment regions

Current issue:

- The browser calls Railway directly from Vercel-served pages.
- If Vercel, Railway API, Railway Postgres, and S3 are spread across regions, every request pays physical latency.

Recommended fix:

- Keep Railway API and Railway Postgres in the same region.
- Pick a region close to the primary user base and S3 bucket.
- Since the S3 bucket appears to be `us-east-2`, prefer East Coast placement unless analytics show otherwise.
- Consider Railway US East for API/Postgres and Vercel `iad1` for server compute.

If moving the frontend backend boundary:

- Option A: Keep Vercel frontend + Railway API, but region-align them and optimize requests.
- Option B: Put the frontend and API behind the same domain using a proxy/rewrite so browser requests avoid extra CORS friction and cookies become simpler.
- Option C: Move API-like read endpoints into Next.js route handlers only if the team wants a larger architecture shift.

Important nuance:

- Vercel static assets are CDN-served globally by default, so deployment geography mostly affects dynamic server code and backend/API calls, not static JS/CSS delivery.

### 6. Make uploads return fast

Current issue:

- `POST /outfits` reads the image, uploads to storage, runs vibe check, writes DB, then returns.
- Vibe check is best-effort but still synchronous when it succeeds.

Recommended fix:

- Create outfit immediately after upload and metadata validation.
- Return the created outfit with `vibe_check_status: "pending"`.
- Run vibe check in a background job.
- Patch the outfit when AI completes.
- Let the UI update when the result is ready.

Implementation levels:

- Simple: FastAPI `BackgroundTasks` for low volume.
- Better: a real queue/worker if this becomes core product behavior.
- Best user experience: optimistic upload UI that shows the outfit immediately.

Why this matters:

- AI calls are variable and should not sit in the user-facing upload critical path.

### 7. Add caching where data is public or slow-changing

Good candidates:

- Public outfit detail.
- Public profile header.
- Open Graph metadata.
- Story card PNGs.
- Explore pages if freshness can be slightly relaxed.

Recommended fix:

- Add HTTP cache headers on public endpoints.
- Cache generated story cards instead of regenerating on every request.
- Use CDN caching for images and public share assets.
- For server-side Next fetches, use `next: { revalidate: ... }` where data can be stale for a short window.

Avoid caching:

- Authenticated feed unless keyed carefully.
- Private boards unless cache policy is explicit and safe.
- Like/comment state unless using short-lived or split cache patterns.

### 8. Improve perceived performance

These do not always reduce raw latency, but they make the app feel faster.

- Keep skeleton cards stable and sized like final content.
- Show cached/previous feed immediately while refreshing.
- Prefetch detail routes when card links enter the viewport.
- Load only the first 6-8 feed images eagerly; lazy-load the rest.
- Avoid blocking the whole app on global auth loading when the route can render a public shell.
- Use optimistic updates for likes, comments, board adds, and uploads.

## Deployment-specific recommendations

### Keep Vercel + Railway for now

Do not migrate hosts as the first move. The current deployment can be fast enough if regions, images, auth, and query patterns are fixed.

### Region alignment checklist

- Railway API: choose US East if most users are US-based and S3 remains `us-east-2`.
- Railway Postgres: keep in the same Railway region as API.
- Vercel Functions: use a region close to Railway/Postgres if server-side rendering or route handlers call the API.
- S3: keep in `us-east-2` for now unless there is a strong reason to move; add CloudFront for delivery.

### Same-domain API path

Consider proxying API calls through the web domain:

- Browser calls `/api/backend/outfits/feed`.
- Vercel rewrites or a route handler forwards to Railway.
- Cookies and CORS become easier.

Tradeoff:

- This can add a Vercel hop if done naively.
- It is most useful when paired with server-side rendering, auth simplification, or same-domain cookie benefits.

## Suggested implementation order

### Phase 1: Measure and quick wins

- ✅ Add FastAPI request duration logging. *(PR #169 — logs `METHOD /path STATUS Xms`, WARNING > 500ms)*
- ❌ Add frontend timing marks for feed/explore/profile.
- ❌ Confirm production regions.
- ❌ Add CloudFront or at least set long-lived cache headers for S3 images.
- ✅ Reduce auth bootstrap from two requests to one after refresh. *(PR #168 — `POST /auth/refresh` now returns `user`)*

### Phase 2: Image performance

- ❌ Generate thumbnail and medium image variants on upload. *(Serving originals via next/image optimizer for now)*
- ❌ Store image dimensions and variant URLs.
- ❌ Use feed thumbnails everywhere card-size images are rendered.
- ✅ Configure `next/image` remote patterns and use it on stable card/profile images. *(PR #170 — `*.amazonaws.com` + `localhost:8000`, AVIF/WebP output, `fill` layout with accurate `sizes`)*

### Phase 3: API query performance

- ✅ Bulk load authors in feed/explore/comments. *(PR #167 — `user_crud.get_by_ids()`, feed went from 41 → 3 queries for 20 outfits)*
- ✅ Add eager loading for clothing items only where needed. *(PR #167 — `selectinload(Outfit.clothing_items)` on all paginated queries)*
- ❌ Create summary schemas for list endpoints.
- ❌ Add indexes based on real query plans.

### Phase 4: Render path improvements

- Convert explore and public outfit detail to Server Component shells.
- Add `loading.tsx` for major routes.
- Stream slow sections below the first viewport.
- Prefetch high-probability navigations.

### Phase 5: Background work

- ✅ Vibe check timing resolved. *(PR #171 — runs synchronously; 201 response includes populated `vibe_check_text`/`vibe_check_tone`. Async approach was tried and reverted — user wants the result in the immediate response.)*
- ❌ Cache generated story cards.
- ❌ Add a worker/queue if background tasks need reliability.

## Concrete code hotspots

- `apps/web/lib/auth-context.tsx`: auth bootstrap currently controls app loading.
- `apps/web/lib/api-client.ts`: all browser API calls hit `NEXT_PUBLIC_API_URL`.
- `apps/web/app/feed/page.tsx`: client-rendered feed fetches after hydration.
- `apps/web/app/explore/page.tsx`: good candidate for server-side initial data.
- `apps/web/components/outfits/outfit-card.tsx`: important image rendering path.
- `services/api/app/routers/outfits.py`: feed/explore author lookup and synchronous upload flow.
- `services/api/app/crud/outfit.py`: feed/explore query shape and relationship loading.
- `services/api/app/db.py`: add pool sizing/logging options if API traffic grows.

## Success targets

Set concrete goals so speed work does not become vibes-only:

- Feed first content visible: under 1.5s on good mobile connection.
- Feed API p95: under 300ms without image transfer.
- Explore API p95: under 250ms.
- Auth bootstrap p95: under 250ms when cached, under 500ms cold.
- Upload response: under 2s after file upload reaches backend, with AI finishing async.
- Card image bytes: under 150KB for feed thumbnails in common cases.

## Research notes

- Next.js recommends Server Components for server-side data fetching and supports streaming with `Suspense` and `loading.js`.
- Next.js `<Image>` can serve remote images in appropriate sizes and formats, but remote hosts need `images.remotePatterns` and remote images need explicit dimensions or `fill`.
- Vercel serves static assets through its CDN by default; dynamic function latency depends on where the function runs relative to data sources.
- Railway supports multiple deploy regions and private networking between services in the same project/environment.
- SQLAlchemy lazy relationships can emit additional SELECT statements when accessed; `selectinload()` and `joinedload()` are the usual tools to batch related data.
- S3 Transfer Acceleration can improve long-distance uploads by routing through CloudFront edge locations, but CloudFront/CDN plus thumbnails is the stronger read-path optimization for this app.

Sources:

- Next.js data fetching docs: https://nextjs.org/docs/app/getting-started/fetching-data
- Next.js image optimization docs: https://nextjs.org/docs/15/app/getting-started/images
- Vercel function regions docs: https://vercel.com/docs/functions/configuring-functions/region
- Vercel regions docs: https://vercel.com/docs/regions
- Railway regions docs: https://docs.railway.com/deployments/regions
- Railway private networking docs: https://docs.railway.com/private-networking
- SQLAlchemy relationship loading docs: https://docs.sqlalchemy.org/20/orm/queryguide/relationships.html
- AWS S3 Transfer Acceleration docs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/transfer-acceleration-getting-started.html
