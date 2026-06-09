# API Service

FastAPI backend for checkd, deployed on Railway.

## Stack

- **FastAPI** — web framework
- **SQLAlchemy** — ORM
- **Alembic** — migrations
- **psycopg2** — Postgres driver

## Local setup

```bash
cd services/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# fill in DATABASE_URL, SECRET_KEY, etc.

uvicorn app.main:app --reload
```

API: `http://localhost:8000`  
Docs: `http://localhost:8000/docs`

## Tests

```bash
pytest -v
```

Requires a `ootd_test` Postgres database. See the root README for setup.

## Migrations

```bash
alembic upgrade head
alembic revision --autogenerate -m "describe change"
```
