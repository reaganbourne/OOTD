# checkd

A social outfit logging app. Log your daily looks, follow friends, get AI vibe checks, share to Instagram Stories, and get a monthly recap of your style.

## Repo structure

```
apps/
  web/            Next.js frontend (Vercel)
services/
  api/            FastAPI backend (Railway)
packages/
  contracts/      API request/response contracts
docs/             Engineering docs
```

## Local development

### Backend

```bash
docker compose up
```

Starts Postgres and the FastAPI service with hot reload at `http://localhost:8000`.  
API docs: `http://localhost:8000/docs`

### Frontend

```bash
cd apps/web
npm install
npm run dev
```

Frontend: `http://localhost:3000`

### Backend tests

```bash
# Create the test database once
docker compose exec db createdb -U ootd ootd_test

# Run the suite
cd services/api
pip install -r requirements.txt -r requirements-dev.txt
pytest -v
```

### Migrations

```bash
# Apply all migrations
docker compose exec api alembic upgrade head

# Generate a new migration after changing a model
docker compose exec api alembic revision --autogenerate -m "describe change"
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string |
| `SECRET_KEY` | ✅ | JWT signing secret — `openssl rand -hex 32` |
| `ENVIRONMENT` | | `development` or `production` |
| `S3_BUCKET` | For uploads | AWS S3 bucket name |
| `AWS_ACCESS_KEY_ID` | For uploads | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | For uploads | AWS IAM secret key |
| `AWS_REGION` | For uploads | AWS region |
| `ANTHROPIC_API_KEY` | For vibe check | Anthropic API key |
| `RESEND_API_KEY` | For email | Resend API key |
| `FROM_EMAIL` | For email | Sender address (e.g. `noreply@checkdd.com`) |
| `PUBLIC_BASE_URL` | For email links | App base URL (e.g. `https://www.checkdd.com`) |

## Deployment

See `DEPLOY.md`.
