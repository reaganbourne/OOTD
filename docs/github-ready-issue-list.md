# OOTD GitHub-Ready Issue List

This document turns the founder roadmap into a practical GitHub backlog for the `reaganbourne/OOTD` repository.

## Assignee Conventions

- `@otthomas`: frontend + database ownership
- `@reaganbourne`: backend ownership

Update these if either of you wants to route a specific ticket differently, but this should be the default split.

## Suggested Labels

- `phase-1`, `phase-2`, `phase-3`, `phase-4`, `phase-5`
- `frontend`, `backend`, `database`, `infra`, `testing`, `ai`, `docs`
- `priority:high`, `priority:medium`
- `needs-contract`, `blocked`

## Phase 1: Foundation and Auth

### 1. Set up monorepo structure
- Assignee: `@otthomas`
- Labels: `phase-1`, `infra`, `priority:high`
- Description: Create the initial repo layout for `apps/web`, `services/api`, `packages/db`, `packages/contracts`, `docs`, and shared root config files.
- Acceptance criteria:
  - Root project structure is committed
  - `.gitignore`, `.editorconfig`, and `.env.example` exist
  - A short root README explains repo layout
  - Team can point future work to clear directories

### 2. Create Docker Compose local stack
- Assignee: `@reaganbourne`
- Labels: `phase-1`, `infra`, `backend`, `priority:high`
- Description: Add a local development stack for API, Postgres, and optional worker so both developers run the same environment.
- Acceptance criteria:
  - `docker compose up` starts required services
  - Postgres is reachable from the API service
  - Environment variables are read from `.env`
  - Health checks are defined for core services

### 3. Design v1 database schema
- Assignee: `@otthomas`
- Labels: `phase-1`, `database`, `priority:high`, `needs-contract`
- Description: Define the first-pass schema for users, sessions, outfits, clothing items, follows, likes, and comments.
- Acceptance criteria:
  - ERD or schema doc is added to `docs`
  - Primary keys and foreign keys are defined
  - Initial index plan is documented
  - Backend lead reviews and approves the shape before migration work starts

### 4. Add Alembic baseline and initial migrations
- Assignee: `@otthomas`
- Labels: `phase-1`, `database`, `priority:high`
- Description: Set up migrations and add the initial schema migration for the auth and social core tables.
- Acceptance criteria:
  - Alembic is configured
  - Initial migration is committed
  - Fresh database bootstraps from migrations only
  - Local downgrade works for development use

### 5. Scaffold FastAPI service
- Assignee: `@reaganbourne`
- Labels: `phase-1`, `backend`, `priority:high`
- Description: Create the FastAPI app skeleton with app startup, config loading, shared dependencies, and router organization.
- Acceptance criteria:
  - `/health` endpoint returns success
  - App loads config from environment
  - Router layout for auth and outfits exists
  - Project structure is ready for tests

### 6. Define auth API contract
- Assignee: `@reaganbourne`
- Labels: `phase-1`, `backend`, `docs`, `needs-contract`
- Description: Lock request and response shapes for register, login, refresh, logout, and current-user endpoints.
- Acceptance criteria:
  - Endpoints appear in OpenAPI docs
  - Error response shape is consistent
  - Example request and response payloads are documented
  - Frontend and backend both sign off before implementation continues

### 7. Build login and signup screens
- Assignee: `@otthomas`
- Labels: `phase-1`, `frontend`, `priority:high`
- Description: Create mobile-first login and signup pages with validation, loading, and error states.
- Acceptance criteria:
  - Login screen renders cleanly on mobile and desktop
  - Signup screen renders cleanly on mobile and desktop
  - Form validation is visible and usable
  - Error and loading states are styled

### 8. Implement JWT auth flow
- Assignee: `@reaganbourne`
- Labels: `phase-1`, `backend`, `priority:high`
- Description: Implement register, login, refresh, logout, password hashing, and protected route support.
- Acceptance criteria:
  - Passwords are securely hashed
  - Access and refresh tokens work end to end
  - Protected route dependency or middleware is in place
  - Logout invalidates the refresh path

### 9. Build typed API client for web
- Assignee: `@otthomas`
- Labels: `phase-1`, `frontend`
- Description: Add a reusable API client with auth handling, request helpers, and normalized error parsing.
- Acceptance criteria:
  - Auth screens use the shared client
  - 401 refresh behavior is supported
  - Client can be reused for later features
  - Error handling is consistent across screens

### 10. Add auth smoke tests and CI hook
- Assignee: `@reaganbourne`
- Labels: `phase-1`, `testing`, `backend`
- Description: Add auth smoke coverage and a CI job that runs the tests on pull requests.
- Acceptance criteria:
  - Register, login, refresh, and protected route are tested
  - CI runs automatically on PRs
  - Test failures block merge to `main`
  - Basic testing instructions are documented

## Phase 2: Core Outfit Loop

### 11. Add outfit and clothing item schema
- Assignee: `@otthomas`
- Labels: `phase-2`, `database`, `priority:high`
- Description: Extend the schema for outfits, media references, clothing items, and tagging metadata.
- Acceptance criteria:
  - Migration creates outfit and item tables
  - Referential integrity is enforced
  - Feed and vault indexes are included
  - Schema supports future event association

### 12. Implement image storage adapter
- Assignee: `@reaganbourne`
- Labels: `phase-2`, `backend`, `infra`, `priority:high`
- Description: Build an abstraction for local file storage now and cloud object storage later.
- Acceptance criteria:
  - Multipart upload path works
  - File metadata is stored
  - Local development storage works reliably
  - Storage layer can be swapped later

### 13. Build upload flow UI
- Assignee: `@otthomas`
- Labels: `phase-2`, `frontend`, `priority:high`
- Description: Create a multi-step outfit upload flow with photo selection, tagging, and posting.
- Acceptance criteria:
  - User can select a photo
  - User can add and edit item tags
  - Step transitions are clear
  - Incomplete submissions are blocked with useful messaging

### 14. Implement create-outfit endpoint
- Assignee: `@reaganbourne`
- Labels: `phase-2`, `backend`, `priority:high`
- Description: Add the authenticated endpoint for creating outfit records with attached media.
- Acceptance criteria:
  - Endpoint accepts multipart input
  - Outfit and image reference are persisted
  - Invalid file types are rejected
  - Response payload is normalized for frontend use

### 15. Implement clothing item tagging endpoint
- Assignee: `@reaganbourne`
- Labels: `phase-2`, `backend`
- Description: Add an endpoint to attach structured clothing item data to an outfit.
- Acceptance criteria:
  - Supports brand, color, and category fields
  - Validates ownership of the outfit
  - Returns updated item list
  - Handles malformed or duplicate data safely

### 16. Build home feed grid
- Assignee: `@otthomas`
- Labels: `phase-2`, `frontend`
- Description: Build the main feed page with responsive outfit cards and navigation to detail view.
- Acceptance criteria:
  - Mobile uses a 2-column grid
  - Desktop uses a 3-column grid
  - Clicking a card opens outfit detail
  - Loading and empty states are included

### 17. Implement follow and unfollow endpoints
- Assignee: `@reaganbourne`
- Labels: `phase-2`, `backend`
- Description: Add follow relationship management used by the social feed.
- Acceptance criteria:
  - Follow creates a relationship
  - Unfollow removes a relationship
  - Duplicate follow is handled safely
  - Self-follow is blocked

### 18. Build outfit detail screen
- Assignee: `@otthomas`
- Labels: `phase-2`, `frontend`
- Description: Create a detailed outfit view showing photo, tags, date, event link, and social actions.
- Acceptance criteria:
  - Full photo is displayed cleanly
  - Tagged items render as pills
  - Like and comment UI is present
  - Share or export entrypoint is visible

### 19. Implement feed endpoint with cursor pagination
- Assignee: `@reaganbourne`
- Labels: `phase-2`, `backend`, `priority:high`
- Description: Create a follows-based feed endpoint with stable cursor pagination.
- Acceptance criteria:
  - Cursor pagination is implemented
  - Ordering is stable and deterministic
  - Payload contains all feed card fields
  - Endpoint requires auth

### 20. Build personal vault page
- Assignee: `@otthomas`
- Labels: `phase-2`, `frontend`
- Description: Create the user vault page with grid layout, filters, and simple stats.
- Acceptance criteria:
  - User outfits render in a grid
  - Date, color, and event filters exist
  - Stats bar is shown
  - Empty state is designed

### 21. Add phase 2 integration tests
- Assignee: `@reaganbourne`
- Labels: `phase-2`, `testing`, `backend`
- Description: Add end-to-end API coverage for upload, tagging, follow, and feed behavior.
- Acceptance criteria:
  - Upload flow is tested
  - Tagging flow is tested
  - Feed pagination is tested
  - Ownership and auth failures are tested

## Phase 3: Event Boards

### 22. Add event board schema
- Assignee: `@otthomas`
- Labels: `phase-3`, `database`, `priority:high`
- Description: Add tables for event boards, memberships, and outfit submissions.
- Acceptance criteria:
  - Board, membership, and submission tables exist
  - Ownership and membership relations are explicit
  - Uniqueness rules are defined
  - Migration runs cleanly on a fresh database

### 23. Implement board CRUD endpoints
- Assignee: `@reaganbourne`
- Labels: `phase-3`, `backend`, `priority:high`
- Description: Build create, read, update, and list endpoints for event boards.
- Acceptance criteria:
  - Board creator can create and update
  - Read endpoint returns board details and membership summary
  - Permissions are enforced
  - OpenAPI docs are updated

### 24. Build create-board form
- Assignee: `@otthomas`
- Labels: `phase-3`, `frontend`
- Description: Create the form for event name, date, dress code, and theme input.
- Acceptance criteria:
  - Fields validate correctly
  - Submission state is handled
  - Errors are visible
  - Mobile layout is polished

### 25. Implement invite token and join flow
- Assignee: `@reaganbourne`
- Labels: `phase-3`, `backend`
- Description: Generate invite links and allow users to join boards securely.
- Acceptance criteria:
  - Join token is unique
  - Join endpoint validates the token
  - Membership is created once only
  - Invalid token returns a clear error

### 26. Build invite and join pages
- Assignee: `@otthomas`
- Labels: `phase-3`, `frontend`
- Description: Add the UI for sharing invite links and consuming join tokens.
- Acceptance criteria:
  - Invite action is accessible from the board view
  - Join route consumes the token
  - Success redirects to board detail
  - Invalid token state is handled gracefully

### 27. Implement outfit submission to board
- Assignee: `@reaganbourne`
- Labels: `phase-3`, `backend`
- Description: Allow members to submit an outfit to a board and persist the relationship.
- Acceptance criteria:
  - Only board members can submit
  - Duplicate submission rules are enforced
  - Response returns updated board state
  - Permission failures are explicit

### 28. Build board detail page
- Assignee: `@otthomas`
- Labels: `phase-3`, `frontend`, `priority:high`
- Description: Create the main board page with event metadata, vibe area, and member submission grid.
- Acceptance criteria:
  - Event metadata is visible
  - Submitted outfits render in a grid
  - Pending members are shown
  - Invite link action is accessible

### 29. Add notification persistence
- Assignee: `@otthomas`
- Labels: `phase-3`, `database`
- Description: Add data support for notifications such as invites, likes, comments, follows, and overlap alerts.
- Acceptance criteria:
  - Notification records can be stored
  - Notification type is normalized
  - Recipient targeting is clear
  - Read or unread state is supported or stubbed

### 30. Add board API integration tests
- Assignee: `@reaganbourne`
- Labels: `phase-3`, `testing`, `backend`
- Description: Add API coverage for board create, join, permission, and submission flows.
- Acceptance criteria:
  - Board creation is tested
  - Join by token is tested
  - Submission is tested
  - Permission failures are tested

## Phase 4: AI Vibe Layer and Story Card

### 31. Add AI run tracking tables
- Assignee: `@otthomas`
- Labels: `phase-4`, `database`, `ai`
- Description: Persist AI request metadata, outputs, statuses, and links to outfits or boards.
- Acceptance criteria:
  - AI run state is stored
  - Outputs can be linked to the right entity
  - Failure state can be recorded
  - Data model supports basic auditability

### 32. Implement LLM provider adapter
- Assignee: `@reaganbourne`
- Labels: `phase-4`, `backend`, `ai`, `priority:high`
- Description: Create the provider abstraction and prompt plumbing for vibe checks, captions, and board vibe generation.
- Acceptance criteria:
  - Provider adapter is reusable
  - Prompt templates are configurable
  - Errors and timeouts are handled
  - Responses are normalized for the app

### 33. Build vibe check UI
- Assignee: `@otthomas`
- Labels: `phase-4`, `frontend`, `ai`
- Description: Add the Hype, Honest, and Chaotic selector with inline result display.
- Acceptance criteria:
  - Tone selector exists
  - User can trigger vibe check
  - Result is displayed inline
  - Retry and loading states are present

### 34. Implement vibe check endpoint
- Assignee: `@reaganbourne`
- Labels: `phase-4`, `backend`, `ai`, `priority:high`
- Description: Generate and persist a tone-specific vibe check for an outfit.
- Acceptance criteria:
  - Endpoint is authenticated
  - Tone is validated
  - Result is saved or returned consistently
  - Failure path is graceful

### 35. Implement caption generator endpoint
- Assignee: `@reaganbourne`
- Labels: `phase-4`, `backend`, `ai`
- Description: Generate a shareable caption from outfit data and optional event context.
- Acceptance criteria:
  - Input supports event context
  - Output is concise and usable
  - Result structure is consistent
  - Errors are normalized

### 36. Build suggested-tags UI
- Assignee: `@otthomas`
- Labels: `phase-4`, `frontend`, `ai`
- Description: Surface AI-generated tag suggestions for user review, editing, and acceptance.
- Acceptance criteria:
  - Suggestions are easy to review
  - User can edit before saving
  - Accepted tags map correctly to schema
  - Failure does not block upload

### 37. Implement tag suggestion endpoint
- Assignee: `@reaganbourne`
- Labels: `phase-4`, `backend`, `ai`
- Description: Infer likely clothing categories and dominant colors from an uploaded outfit image.
- Acceptance criteria:
  - Accepts an image reference or upload reference
  - Returns structured suggestions
  - Handles timeout and provider failure safely
  - Contract supports future model swaps

### 38. Build story card export screen
- Assignee: `@otthomas`
- Labels: `phase-4`, `frontend`, `priority:high`
- Description: Create the export preview with layout variants such as editorial, minimal, and bold.
- Acceptance criteria:
  - Preview renders correctly
  - User can switch variants
  - Outfit metadata is included
  - Mobile-first layout feels polished

### 39. Implement story card rendering and download
- Assignee: `@otthomas`
- Labels: `phase-4`, `frontend`
- Description: Add the actual rendering and export behavior for story-ready images.
- Acceptance criteria:
  - Export produces the intended aspect ratio
  - Download works on desktop
  - Share path works on supported mobile environments
  - Repeated exports are stable

### 40. Add AI rate limiting and timeouts
- Assignee: `@reaganbourne`
- Labels: `phase-4`, `backend`, `ai`, `testing`
- Description: Protect AI endpoints with rate limits, timeout policies, and safe failure behavior.
- Acceptance criteria:
  - Rate limiting exists on AI endpoints
  - Timeout configuration is applied
  - User-facing errors are safe and useful
  - Tests cover protected behavior

## Phase 5: Polish, Discovery, and Launch Readiness

### 41. Add search and trending query support
- Assignee: `@otthomas`
- Labels: `phase-5`, `database`
- Description: Add indexes and query design for people search, outfit search, event search, and trending data.
- Acceptance criteria:
  - Searchable columns are indexed appropriately
  - Trending query path is documented
  - Query performance is reviewed
  - Migration is committed cleanly

### 42. Implement search and discover endpoints
- Assignee: `@reaganbourne`
- Labels: `phase-5`, `backend`
- Description: Build APIs for people, outfits, events, and trending discovery.
- Acceptance criteria:
  - Each tab has backend support
  - Query params are validated
  - Ranking is deterministic enough for MVP
  - Empty results are handled cleanly

### 43. Build search and discover screens
- Assignee: `@otthomas`
- Labels: `phase-5`, `frontend`
- Description: Create the search UI with People, Outfits, and Events tabs plus trending results.
- Acceptance criteria:
  - All three tabs exist
  - Trending outfits render
  - Search works on mobile
  - Empty and loading states are designed

### 44. Build notifications screen
- Assignee: `@otthomas`
- Labels: `phase-5`, `frontend`
- Description: Create the notifications UI for followers, likes, comments, invites, and overlap alerts.
- Acceptance criteria:
  - Notifications are grouped sensibly
  - Deep links work
  - Empty state exists
  - Small-screen readability is good

### 45. Standardize API error responses
- Assignee: `@reaganbourne`
- Labels: `phase-5`, `backend`, `docs`, `priority:high`
- Description: Audit routes so the frontend can rely on consistent validation and error shapes.
- Acceptance criteria:
  - Shared error format exists
  - Validation failures are predictable
  - Common auth, storage, and AI errors are normalized
  - Docs reflect the final format

### 46. Add responsive polish and skeleton states
- Assignee: `@otthomas`
- Labels: `phase-5`, `frontend`, `priority:high`
- Description: Finish responsive edge cases, loading skeletons, and empty states across the app.
- Acceptance criteria:
  - App works from small mobile to desktop
  - No blank loading states remain
  - Layout shift is minimized
  - Core flows feel demo-ready

### 47. Expand backend test coverage
- Assignee: `@reaganbourne`
- Labels: `phase-5`, `testing`, `backend`, `priority:high`
- Description: Raise backend coverage on auth, outfit loop, boards, and AI endpoints.
- Acceptance criteria:
  - Core routes are covered
  - Permission rules are covered
  - Upload and AI failure cases are covered
  - Coverage report is available in CI

### 48. Create seed data and demo fixtures
- Assignee: `@otthomas`
- Labels: `phase-5`, `database`, `frontend`, `docs`
- Description: Create realistic seed data so demos and screenshots never start from an empty product.
- Acceptance criteria:
  - Seed script exists
  - Demo users and outfits are included
  - Boards and notifications have sample data
  - Reset instructions are documented

### 49. Document setup, architecture, and env vars
- Assignee: `@reaganbourne`
- Labels: `phase-5`, `docs`
- Description: Write the contributor-facing setup docs and architecture notes for the MVP.
- Acceptance criteria:
  - Local setup is documented
  - Env vars are listed
  - Architecture overview is written
  - API usage examples exist

### 50. Set up CI/CD and deployment pipeline
- Assignee: `@reaganbourne`
- Labels: `phase-5`, `infra`, `backend`, `priority:high`
- Description: Configure automated checks and deployment workflow for web and API.
- Acceptance criteria:
  - PR checks run automatically
  - `main` has a clear deploy path
  - Secrets and environment guidance are documented
  - Deployment can be repeated reliably

## Recommended First Issues to Create Immediately

If you only create the first batch today, start with these:

1. Set up monorepo structure
2. Create Docker Compose local stack
3. Design v1 database schema
4. Scaffold FastAPI service
5. Define auth API contract
6. Build login and signup screens

These six are enough to get both of you working in parallel without waiting on each other too long.

