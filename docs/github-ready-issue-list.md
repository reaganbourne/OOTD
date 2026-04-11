# OOTD GitHub-Ready Issue List

This document turns the founder roadmap into a practical GitHub backlog for the `reaganbourne/OOTD` repository.

## Assignee Conventions

- `@otthomas`: frontend ownership (`apps/web/`)
- `@reaganbourne`: backend and database ownership (`services/api/`, `packages/db/`)

## Suggested Labels

- `phase-1`, `phase-2`, `phase-3`, `phase-4`, `phase-5`
- `frontend`, `backend`, `database`, `infra`, `testing`, `ai`, `docs`
- `priority:high`, `priority:medium`
- `needs-contract`, `blocked`

## Phase 1: Foundation and Auth

### 1. Set up monorepo structure
- Assignee: `@otthomas`
- Labels: `phase-1`, `infra`, `priority:high`
- Status: Done
- Description: Create the initial repo layout for `apps/web`, `services/api`, `packages/db`, `packages/contracts`, `docs`, and shared root config files.

### 2. Create Docker Compose local stack
- Assignee: `@reaganbourne`
- Labels: `phase-1`, `infra`, `backend`, `priority:high`
- Description: Add a local development stack for API, Postgres, and web so both developers run the same environment.
- Acceptance criteria:
  - `docker compose up` starts required services
  - Postgres is reachable from the API service
  - Environment variables are read from `.env`
  - Health checks are defined for core services

### 3. Design v1 database schema
- Assignee: `@otthomas`
- Labels: `phase-1`, `database`, `priority:high`
- Status: Done
- Description: Define the first-pass schema for users, sessions, outfits, clothing items, follows, likes, and comments.

### 4. Add Alembic baseline and initial migrations
- Assignee: `@reaganbourne`
- Labels: `phase-1`, `database`, `priority:high`
- Description: Configure Alembic and add the initial migration for all v1 tables using SQLAlchemy models.
- Note: Reassigned from `@otthomas` — Reagan owns all DB work.
- Acceptance criteria:
  - SQLAlchemy models exist for all v1 tables
  - Alembic is configured and reads from app config
  - Initial migration is committed
  - Fresh database bootstraps from `alembic upgrade head`
  - `alembic downgrade base` works

### 5. Scaffold FastAPI service
- Assignee: `@reaganbourne`
- Labels: `phase-1`, `backend`, `priority:high`
- Description: Create the FastAPI app skeleton with app startup, config loading, SQLAlchemy session wiring, and router organization.
- Acceptance criteria:
  - `/health` endpoint returns `{ "status": "ok" }`
  - App loads config from environment via pydantic-settings
  - Router layout for auth and outfits exists as stubs
  - SQLAlchemy session dependency is wired
  - Alembic config exists and points to models

### 6. Define auth API contract
- Assignee: `@reaganbourne`
- Labels: `phase-1`, `backend`, `docs`, `needs-contract`
- Description: Formally document request and response shapes for register, login, refresh, logout, and current-user endpoints in `packages/contracts/`.
- Note: Contract shape is decided (see `docs/reagan-workboard.md`). This branch publishes it for `@otthomas` to build the typed API client against.
- Acceptance criteria:
  - Contract doc is in `packages/contracts/`
  - All five endpoints are documented with example payloads
  - Error shape is documented
  - `@otthomas` has reviewed and can proceed with Issue 9

### 7. Build login and signup screens
- Assignee: `@otthomas`
- Labels: `phase-1`, `frontend`, `priority:high`
- Status: Done

### 8. Implement JWT auth flow
- Assignee: `@reaganbourne`
- Labels: `phase-1`, `backend`, `priority:high`
- Description: Implement register, login, refresh, logout, and current-user endpoints with bcrypt password hashing and httpOnly refresh cookies.
- Acceptance criteria:
  - Passwords are hashed with bcrypt
  - Access token is a 15-minute JWT returned as `{ access_token, token_type: "bearer" }`
  - Refresh token is stored in httpOnly cookie and tracked in `refresh_sessions`
  - Logout revokes the session record and clears the cookie
  - `get_current_user` dependency guards protected routes

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
- Description: Add auth integration tests and a CI job that runs them on pull requests.
- Acceptance criteria:
  - Register, login, refresh, logout, and protected route are tested
  - CI runs automatically on PRs
  - Test failures block merge to `main`

## Phase 2: Core Outfit Loop

### 11. Add outfit and clothing item schema
- Assignee: `@reaganbourne`
- Labels: `phase-2`, `database`, `priority:high`
- Description: Add SQLAlchemy models and Alembic migration for outfits, clothing items, and tagging metadata.
- Acceptance criteria:
  - Migration creates outfit and item tables
  - Referential integrity is enforced
  - Feed and vault indexes are included

### 12. Implement image storage adapter
- Assignee: `@reaganbourne`
- Labels: `phase-2`, `backend`, `infra`, `priority:high`
- Description: Build an S3 storage adapter with a local filesystem fallback for development.
- Note: Production target is AWS S3. Local dev uses filesystem or MinIO.
- Acceptance criteria:
  - Multipart upload path works
  - File metadata is stored
  - Local development storage works reliably
  - Storage backend is swappable via config

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

### 21. Add phase 2 integration tests
- Assignee: `@reaganbourne`
- Labels: `phase-2`, `testing`, `backend`
- Description: Add end-to-end API coverage for upload, tagging, follow, and feed behavior.

## Phase 3: Event Boards

### 22. Add event board schema
- Assignee: `@reaganbourne`
- Labels: `phase-3`, `database`, `priority:high`
- Description: Add SQLAlchemy models and Alembic migration for event boards, memberships, and outfit submissions.

### 23. Implement board CRUD endpoints
- Assignee: `@reaganbourne`
- Labels: `phase-3`, `backend`, `priority:high`
- Description: Build create, read, update, and list endpoints for event boards.

### 24. Build create-board form
- Assignee: `@otthomas`
- Labels: `phase-3`, `frontend`

### 25. Implement invite token and join flow
- Assignee: `@reaganbourne`
- Labels: `phase-3`, `backend`

### 26. Build invite and join pages
- Assignee: `@otthomas`
- Labels: `phase-3`, `frontend`

### 27. Implement outfit submission to board
- Assignee: `@reaganbourne`
- Labels: `phase-3`, `backend`

### 28. Build board detail page
- Assignee: `@otthomas`
- Labels: `phase-3`, `frontend`, `priority:high`

### 29. Add notification persistence
- Assignee: `@reaganbourne`
- Labels: `phase-3`, `database`
- Description: Add SQLAlchemy model and migration for notifications (invites, likes, comments, follows).

### 30. Add board API integration tests
- Assignee: `@reaganbourne`
- Labels: `phase-3`, `testing`, `backend`

## Phase 4: AI Vibe Layer and Story Card

### 31. Add AI run tracking tables
- Assignee: `@reaganbourne`
- Labels: `phase-4`, `database`, `ai`
- Description: Add SQLAlchemy model and migration for AI run state, outputs, and links to outfits or boards.

### 32. Implement LLM provider adapter
- Assignee: `@reaganbourne`
- Labels: `phase-4`, `backend`, `ai`, `priority:high`

### 33. Build vibe check UI
- Assignee: `@otthomas`
- Labels: `phase-4`, `frontend`, `ai`

### 34. Implement vibe check endpoint
- Assignee: `@reaganbourne`
- Labels: `phase-4`, `backend`, `ai`, `priority:high`

### 35. Implement caption generator endpoint
- Assignee: `@reaganbourne`
- Labels: `phase-4`, `backend`, `ai`

### 36. Build suggested-tags UI
- Assignee: `@otthomas`
- Labels: `phase-4`, `frontend`, `ai`

### 37. Implement tag suggestion endpoint
- Assignee: `@reaganbourne`
- Labels: `phase-4`, `backend`, `ai`

### 38. Build story card export screen
- Assignee: `@otthomas`
- Labels: `phase-4`, `frontend`, `priority:high`

### 39. Implement story card rendering and download
- Assignee: `@otthomas`
- Labels: `phase-4`, `frontend`

### 40. Add AI rate limiting and timeouts
- Assignee: `@reaganbourne`
- Labels: `phase-4`, `backend`, `ai`, `testing`

## Phase 5: Polish, Discovery, and Launch Readiness

### 41. Add search and trending query support
- Assignee: `@reaganbourne`
- Labels: `phase-5`, `database`
- Description: Add SQLAlchemy model updates and indexes for search and trending queries.

### 42. Implement search and discover endpoints
- Assignee: `@reaganbourne`
- Labels: `phase-5`, `backend`

### 43. Build search and discover screens
- Assignee: `@otthomas`
- Labels: `phase-5`, `frontend`

### 44. Build notifications screen
- Assignee: `@otthomas`
- Labels: `phase-5`, `frontend`

### 45. Standardize API error responses
- Assignee: `@reaganbourne`
- Labels: `phase-5`, `backend`, `docs`, `priority:high`

### 46. Add responsive polish and skeleton states
- Assignee: `@otthomas`
- Labels: `phase-5`, `frontend`, `priority:high`

### 47. Expand backend test coverage
- Assignee: `@reaganbourne`
- Labels: `phase-5`, `testing`, `backend`, `priority:high`

### 48. Create seed data and demo fixtures
- Assignee: `@reaganbourne`
- Labels: `phase-5`, `database`, `docs`
- Description: Create realistic seed scripts so demos and screenshots never start from an empty product.

### 49. Document setup, architecture, and env vars
- Assignee: `@reaganbourne`
- Labels: `phase-5`, `docs`

### 50. Set up CI/CD and deployment pipeline
- Assignee: `@reaganbourne`
- Labels: `phase-5`, `infra`, `backend`, `priority:high`
- Description: Configure automated checks and Railway deployment workflow for web and API.
