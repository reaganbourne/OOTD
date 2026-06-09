# Testing Policy

Test at the layer where failure would actually hurt.

## Rules

1. Every PR needs a verification step before merge.
2. Backend behavior is proven with integration tests, not unit tests.
3. Frontend work requires manual QA; add tests only for non-trivial logic.
4. A ticket is done when the acceptance criteria are met and the change is verified.

## By branch type

**Backend (`feature-be-*`, `fix/*` touching API)**
- Integration tests for the happy path
- Tests for auth/permission rules where relevant
- Tests for invalid input and expected error shapes
- Manual smoke check when practical

**Frontend (`feature-fe-*`, `fix/*` touching web)**
- Mobile and desktop manual QA
- Check loading, error, and empty states
- Screenshots or short notes in the PR for visible UI changes
- Add targeted tests only for real logic (form validation, state transitions, data mapping)

**Database / migrations**
- Migration applies on a fresh database
- Foreign keys and unique constraints behave correctly
- Rollback considered when practical

**Docs / chore**
- Content is accurate and another person can follow it without guessing

## PR checklist

Every PR should answer:
- What changed?
- How was it tested?
- If UI changed, what should the reviewer look at?
- If the API changed, what request/response shape changed?

## CI

Backend tests run on every push and PR that touches `services/api/`. Keep the suite passing.
