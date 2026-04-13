# feature-fe-api-client Checklist

Branch: `feature-fe-api-client`
Owner: `@otthomas`
Status: complete and ready for review

This checklist tracks the low-level completion state for Issue 11, wiring the web auth flow to the shared API contract.

## Milestone 1: Contract Alignment

- [x] Confirm `packages/contracts/auth-contract.md` exists on `main`
- [x] Confirm the frontend field names still match the contract (`username`, `email`, `password`)
- [x] Confirm `confirmPassword` remains frontend-only

## Milestone 2: Shared Client

- [x] Add `apps/web/lib/api-client.ts`
- [x] Add env-based API base URL resolution
- [x] Add `register`, `login`, `refresh`, `logout`, and `me` client methods
- [x] Add normalized handling for flat-string and validation-array FastAPI errors
- [x] Add one-time 401 refresh-and-retry support for protected requests

## Milestone 3: Auth Screen Wiring

- [x] Replace `mockSubmitAuth` usage with the live client
- [x] Strip `confirmPassword` before sending sign-up requests
- [x] Remove the mock QA panel from the auth form
- [x] Update auth form copy to reflect live contract wiring

## Issue 11 Merge Checklist

- [x] Run a TypeScript no-emit check for the new client code
- [x] Run the built web app locally after the client changes
- [x] Verify `/login` and `/signup` still render correctly
- [x] Verify network failures are surfaced clearly while backend auth is unavailable
- [x] Confirm refresh-and-retry behavior against a real protected-endpoint flow

## Runtime Verification Notes

- [x] TypeScript `--noEmit` check passed for the web app after the API client wiring changes
- [x] Production build passed with `npm.cmd run build`
- [x] Built app served successfully with `node node_modules/next/dist/bin/next start -p 3007`
- [x] `/login` and `/signup` both returned HTTP 200 and rendered the expected "Live auth" copy
- [x] Offline / backend-unavailable path returns the expected connection error message from the real client code
- [x] 422 validation errors normalize into `{ ok, message, errors }` as intended
- [x] A 401 on a protected request triggers one refresh attempt and retries with the rotated access token
- [x] A failed refresh redirects to `/login` and returns the refresh error message

## Cross-Issue Follow-up

- [ ] Run one final browser-level check against Reagan's live auth backend branch before merging both auth branches together
- [ ] Confirm real register/login against the Postgres-backed backend once Issue 12 is merged or locally runnable
