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

- `@otthomas`: frontend (`apps/web/`)
- `@reaganbourne`: backend + database (`services/api/`, models, migrations)

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

## Local development

### 1. Clone and set up env

```bash
git clone https://github.com/reaganbourne/OOTD.git
cd OOTD
cp .env.example .env
```

Open `.env` and set a real value for `SECRET_KEY`. Everything else works as-is.

### 2. Start the backend

```bash
docker compose up
```

This starts Postgres and the FastAPI service. On first run it:
- Pulls the Postgres image and builds the API container
- Runs `alembic upgrade head` to create all tables
- Starts the API with hot reload

API: `http://localhost:8000`
Interactive docs: `http://localhost:8000/docs`

### 3. Start the frontend

```bash
cd apps/web
npm install
npm run dev
```

Frontend: `http://localhost:3000`

### Running tests

Tests run against a real Postgres database (`ootd_test`). Create it once:

```bash
docker compose exec db createdb -U ootd ootd_test
```

Then run the suite from `services/api/`:

```bash
cd services/api
pip install -r requirements.txt -r requirements-dev.txt
pytest -v
```

The test client overrides the database dependency to use `ootd_test` and wipes all rows between every test so tests are fully isolated. CI runs the same suite automatically on every push and pull request that touches `services/api/`.

### Useful commands

```bash
# View logs
docker compose logs -f api
docker compose logs -f db

# Stop everything
docker compose down

# Stop and wipe the database (full reset)
docker compose down -v

# Generate a new migration after changing a model
docker compose exec api alembic revision --autogenerate -m "describe change"
docker compose exec api alembic upgrade head

# Open a Postgres shell
docker compose exec db psql -U ootd -d ootd
```
