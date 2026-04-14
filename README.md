# OOTD

OOTD is a social outfit logging app. Users build a personal vault of their daily looks, follow friends to see their fits in a feed, share outfits to Instagram Stories with an AI-generated vibe check, collaborate on event boards, and get a monthly Wrapped-style recap of their style.

## Features

- **Vault** — log your OOTD every day with a photo, caption, date worn, and tagged clothing items (brand, category, color, purchase link)
- **Feed** — two tabs: outfit posts from people you follow, and activity from boards you've joined
- **Boards** — create an event board (e.g. "Mia's Birthday Dinner"), share the invite link over text, anyone with the link can join and post their outfit; boards auto-expire 30 days after the event
- **Vibe Check** — AI-generated blurb for your outfit ("it's giving summer I turned pretty x coastal grandmother"), powered by Claude
- **Story Card** — server-side Instagram Story card generation (1080×1920 PNG) with your photo, vibe check text, and OOTD branding — download and post directly
- **Monthly Fits Wrapped** — monthly recap of your style stats: top colors, brands, most active day, vibe of the month, longest streak
- **Social** — follow/unfollow, likes, comments, search your vault

## Repo Structure

```text
apps/
  web/            Next.js frontend
services/
  api/            FastAPI backend
packages/
  contracts/      Shared API contracts and request/response examples
docs/             Product, planning, and engineering docs
```

## Ownership

- `@otthomas` — frontend (`apps/web/`)
- `@reaganbourne` — backend + database (`services/api/`, models, migrations)

## Working Model

1. Open an issue first.
2. Agree on API shape before writing cross-layer features — see `packages/contracts/`.
3. Create a short-lived branch from `main`.
4. Open a PR early.
5. Merge back to `main` with squash merge after review.

## Local Development

### 1. Clone and set up env

```bash
git clone https://github.com/reaganbourne/OOTD.git
cd OOTD
cp .env.example .env
```

Open `.env` and fill in the required values — at minimum `SECRET_KEY`. S3 and Twilio values can be left blank during local development (image uploads will fail without them).

### 2. Start the backend

```bash
docker compose up
```

This starts Postgres and the FastAPI service. On first run it:
- Pulls the Postgres image and builds the API container
- Runs `alembic upgrade head` to create all tables
- Starts the API with hot reload at `http://localhost:8000`

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

Then run the suite:

```bash
cd services/api
pip install -r requirements.txt -r requirements-dev.txt
pytest -v
```

CI runs the same suite automatically on every push and pull request that touches `services/api/`.

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

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string |
| `SECRET_KEY` | ✅ | JWT signing secret — generate with `openssl rand -hex 32` |
| `ENVIRONMENT` | | `development` or `production` (default: `development`) |
| `S3_BUCKET` | For uploads | AWS S3 bucket name |
| `AWS_ACCESS_KEY_ID` | For uploads | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | For uploads | AWS IAM secret key |
| `AWS_REGION` | For uploads | AWS region (default: `us-east-1`) |
| `ANTHROPIC_API_KEY` | For vibe check | Claude API key |
| `TWILIO_ACCOUNT_SID` | For SMS | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | For SMS | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | For SMS | Twilio sending number |

## API Contracts

See `packages/contracts/` for request/response shapes agreed between frontend and backend:
- `auth-contract.md` — register, login, refresh, logout, /me
- `outfit-contract.md` — create outfit (multipart upload)
