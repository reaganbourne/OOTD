# feature-fe-api-client Checklist

Branch: `feature-fe-api-client`
Owner: `@otthomas`
Status: implementation in progress

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

## Remaining Before Merge

- [x] Run a TypeScript no-emit check for the new client code
- [ ] Run the web app locally after the client changes
- [ ] Verify `/login` and `/signup` still render correctly
- [ ] Verify network failures are surfaced clearly while backend auth is unavailable
- [ ] Verify live register/login against working backend auth endpoints once Issue 12 lands
- [ ] Confirm refresh-and-retry behavior against a real protected endpoint

## Runtime Verification Notes

- [x] TypeScript `--noEmit` check passed for the web app after the API client wiring changes
- [ ] Local Next.js runtime verification is still pending; this environment currently hits `spawn EPERM` when starting `next dev`
- [ ] Live auth-path verification still depends on Reagan finishing Issue 12
