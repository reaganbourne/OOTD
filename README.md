# OOTD

OOTD is a startup MVP for a social outfit logging platform with a personal vault, social feed, event boards, AI vibe checks, and story-card export.

## Repo Structure

```text
apps/
  web/            Next.js frontend
services/
  api/            FastAPI backend
packages/
  db/             Database models, migrations, and query layer
  contracts/      Shared request/response contracts and API examples
docs/             Product, planning, and engineering docs
```

## Ownership Split

- `@otthomas`: frontend + database
- `@reaganbourne`: backend

## Working Model

1. Open an issue first.
2. Agree on schema and API shape before writing cross-layer features.
3. Create a short-lived branch from `main`.
4. Open a PR early.
5. Merge back to `main` with squash merge after review.

## Initial Focus

- Scaffold repo structure
- Define v1 schema
- Scaffold FastAPI service
- Lock auth API contract
- Build auth screens

## Local Setup

The app stack is not wired yet. This scaffold establishes the repo layout so each area can be built in parallel.
