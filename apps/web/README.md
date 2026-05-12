# Web App

This directory will contain the Next.js frontend for OOTD.

Current status:

- Next-style app scaffold added for the auth-screen milestone
- login and sign-up screens exist under `app/login` and `app/signup`
- the shared auth client now reads the live contract from `packages/contracts/auth-contract.md`
- browser API requests now go through the Next.js proxy route at `/backend`
- local success still depends on the backend auth endpoints being available locally, usually at `http://localhost:8000`

Planned responsibilities:

- auth screens
- feed and vault UI
- event board screens
- story-card export
- shared API client and frontend state flows
