# Deployment Guide — checkd

Stack: **Vercel** (frontend, free) + **Railway** (API + Postgres, ~$5/mo)

---

## 1. S3 — make uploaded images publicly readable

In the AWS console → S3 → your bucket → Permissions:

**Uncheck "Block all public access"** (all 4 checkboxes off), then paste this as the Bucket Policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::ootd-outfits-prod-696360034317-us-east-2-an/*"
    }
  ]
}
```

---

## 2. Railway — deploy the API + Postgres

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Select this repo, set **root directory** to `/` (the `railway.toml` at the root handles everything)
3. Add a **Postgres** plugin inside the project — Railway auto-sets `DATABASE_URL`
4. Set these environment variables in the Railway service:

| Variable | Value |
|----------|-------|
| `SECRET_KEY` | Generate a new value with `openssl rand -hex 32`. Never reuse a value from docs, chat, or local dev. |
| `ANTHROPIC_API_KEY` | *(your key)* |
| `S3_BUCKET` | `ootd-outfits-prod-696360034317-us-east-2-an` |
| `AWS_ACCESS_KEY_ID` | *(from .env)* |
| `AWS_SECRET_ACCESS_KEY` | *(from .env)* |
| `AWS_REGION` | `us-east-2` |
| `ENVIRONMENT` | `production` |
| `CORS_ORIGINS` | *(set after step 3 — your Vercel URL)* |
| `PUBLIC_BASE_URL` | *(set after step 3 — your Vercel URL)* |

5. Deploy — Railway runs `alembic upgrade head` then starts uvicorn automatically
6. Copy the Railway public URL (e.g. `https://ootd-api-production.up.railway.app`)

---

## 3. Vercel — deploy the frontend

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Set **root directory** to `apps/web`
3. Set this environment variable:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | *(your Railway URL from step 2)* |

4. Deploy — Vercel detects Next.js automatically
5. Copy the Vercel URL (e.g. `https://checkd.vercel.app`)

---

## 4. Wire them together

Back in Railway, set the two remaining env vars and redeploy:

```
CORS_ORIGINS=https://checkd.vercel.app
PUBLIC_BASE_URL=https://checkd.vercel.app
```

---

## 5. Custom domain (optional)

- **Vercel**: Project Settings → Domains → add your domain, point DNS to Vercel
- **Railway**: Service Settings → Networking → Custom Domain

---

## Environment variable summary (local .env — do not commit)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
DATABASE_URL=postgresql://ootd:ootd@localhost:5432/ootd
SECRET_KEY=replace-with-output-from-openssl-rand-hex-32
ENVIRONMENT=development
DEBUG=false
ANTHROPIC_API_KEY=<your key>
S3_BUCKET=ootd-outfits-prod-696360034317-us-east-2-an
AWS_ACCESS_KEY_ID=<your key id>
AWS_SECRET_ACCESS_KEY=<your secret>
AWS_REGION=us-east-2
```

## Security launch checklist

Before making the app public:

- Rotate any `SECRET_KEY` that was ever copied from this file or shared in chat, commits, screenshots, or deployment notes.
- Rotate AWS and Anthropic keys if they were ever committed, pasted into support tools, or exposed in logs.
- Use least-privilege AWS IAM credentials: only the exact S3 bucket/actions needed for uploads and reads.
- Keep production secrets only in Railway/Vercel environment variables; do not commit `.env` files.
- Set `CORS_ORIGINS` to the exact Vercel/custom domain only. Do not include localhost or `*` in production.
- Set a long random `ADMIN_SECRET` before enabling admin maintenance endpoints, or leave it empty to keep them disabled.
