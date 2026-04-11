# Database Package

SQLAlchemy models, Alembic migrations, and database tooling for OOTD.

> **Note:** Models and migrations live in `services/api/` (colocated with the FastAPI service).
> This package is reserved for shared seed scripts, fixture data, and query helpers
> that may be useful outside the API service context.

## Ownership

`@reaganbourne` owns all database work.

## What lives here (future)

- Seed scripts for local development and demos
- Fixture payloads for testing
- Shared query helpers if needed across services
