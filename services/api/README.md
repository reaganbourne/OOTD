# API Service

FastAPI backend for OOTD.

## Stack

- **FastAPI** — web framework
- **SQLAlchemy 2.x** — ORM
- **Alembic** — migrations
- **psycopg2** — Postgres driver
- **pydantic-settings** — config from environment

## Structure

```
services/api/
  app/
    main.py          # FastAPI app and router registration
    config.py        # Settings loaded from environment
    db.py            # SQLAlchemy engine and SessionLocal
    dependencies.py  # Shared FastAPI dependencies (get_db)
    models/
      base.py        # DeclarativeBase
    routers/
      health.py      # GET /health
      auth.py        # Auth endpoints (Issue 8)
      outfits.py     # Outfit endpoints (Phase 2)
  alembic/
    env.py           # Alembic config wired to app models
    versions/        # Migration files
  alembic.ini
  requirements.txt
  .env.example
```

## Local setup

```bash
cd services/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# edit .env with your local Postgres credentials

uvicorn app.main:app --reload
```

API will be available at `http://localhost:8000`.  
OpenAPI docs at `http://localhost:8000/docs`.

## Migrations

```bash
# Apply all migrations
alembic upgrade head

# Roll back one migration
alembic downgrade -1

# Generate a new migration after model changes
alembic revision --autogenerate -m "describe the change"
```

## Deployment

- **Compute**: Railway
- **Database**: Railway managed Postgres
- **File storage**: AWS S3

Set `DATABASE_URL`, `SECRET_KEY`, and `ENVIRONMENT=production` in Railway environment variables.

## Responsibilities

- Auth and permissions (`/auth/*`)
- Outfit, feed, and board endpoints
- S3 file storage integration
- AI provider integration (Phase 4)
- Background jobs and integration tests
