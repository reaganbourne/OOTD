# Web App

Next.js frontend for checkd, deployed on Vercel.

## Local development

```bash
npm install
npm run dev
```

Runs at `http://localhost:3000`. Requires the backend running at `http://localhost:8000`.

Browser requests go through the Next.js proxy at `/backend` — no direct Railway calls from the browser.

## Key directories

```
app/              Pages and routes (App Router)
components/       Shared UI components
lib/              API client, auth context, utilities
```
