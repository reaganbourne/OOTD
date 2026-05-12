# Deployment Guide - checkd

Stack: Vercel (frontend) + Railway (API + Postgres)

The frontend now sends browser requests to a same-origin Next.js proxy at `/backend`.
That means:

- the browser does not need to call Railway directly
- Vercel still needs the real API origin so the proxy can forward requests
- an old deployed frontend bundle can still show the old `NEXT_PUBLIC_API_URL` error text

## 1. S3

Make uploaded images publicly readable in your S3 bucket.

## 2. Railway

Deploy the API and Postgres on Railway.

Required Railway environment variables:

| Variable | Value |
| --- | --- |
| `SECRET_KEY` | Generate a new random value |
| `ANTHROPIC_API_KEY` | Your key |
| `S3_BUCKET` | Your S3 bucket |
| `AWS_ACCESS_KEY_ID` | Your AWS key id |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret |
| `AWS_REGION` | Your AWS region |
| `ENVIRONMENT` | `production` |
| `CORS_ORIGINS` | Your Vercel URL |
| `PUBLIC_BASE_URL` | Your Vercel URL |

After deploy, copy the Railway public URL, for example:

`https://your-api.up.railway.app`

## 3. Vercel

Deploy the frontend from `apps/web`.

Required Vercel environment variables:

| Variable | Value |
| --- | --- |
| `INTERNAL_API_URL` | Your Railway API URL |
| `NEXT_PUBLIC_API_PROXY_BASE_URL` | `/backend` |

Notes:

- `NEXT_PUBLIC_API_PROXY_BASE_URL` is optional because `/backend` is already the default.
- `NEXT_PUBLIC_API_URL` is no longer required in the browser for production.
- If your deployed site still shows this exact message:

`Unable to reach the API. Make sure the backend is running and NEXT_PUBLIC_API_URL is set.`

that deployment is still serving an older frontend bundle and needs a redeploy.

## 4. Local env example

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_PROXY_BASE_URL=/backend
INTERNAL_API_URL=https://your-api.up.railway.app

DATABASE_URL=postgresql://ootd:ootd@localhost:5432/ootd
SECRET_KEY=replace-with-output-from-openssl-rand-hex-32
ENVIRONMENT=development
DEBUG=false

ANTHROPIC_API_KEY=<your key>
S3_BUCKET=your-s3-name
AWS_ACCESS_KEY_ID=<your key id>
AWS_SECRET_ACCESS_KEY=<your secret>
AWS_REGION=us-east-2
```

## 5. Production checklist

1. Railway API URL works directly.
2. Vercel has `INTERNAL_API_URL` set to that Railway URL.
3. Railway `CORS_ORIGINS` includes your Vercel domain.
4. Vercel has been redeployed after env changes.
5. The deployed browser no longer shows the old `NEXT_PUBLIC_API_URL` error text.
