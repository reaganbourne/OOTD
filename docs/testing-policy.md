# OOTD Testing Policy

This document defines how OOTD should be verified during development.

The goal is not to write tests for everything. The goal is to prove that the app works at the right layer for the risk involved.

## Core Rules

1. Every branch must include a verification step before merge.
2. Test at the layer where failure would actually hurt.
3. Backend behavior should be proven mostly with integration tests, not route-by-route unit tests.
4. Database work should be proven with migrations, constraints, and real inserts or queries.
5. Frontend work should always include manual QA, with targeted tests only where logic is non-trivial.
6. Critical user journeys should eventually have end-to-end coverage.

## What Counts As Done

A ticket is not done when code exists. A ticket is done when:

- the acceptance criteria are met
- the change was verified at the correct layer
- the PR explains how it was tested
- another person can pull it and understand how to validate it

## Verification By Branch Type

### `chore/*`

Use smoke verification, not formal test suites.

Examples:

- repo structure exists
- config files are correct
- commands run successfully
- the project boots or installs as expected

Required before merge:

- manual smoke check
- PR note describing what was verified

### `feature-db-*`

Use schema and migration verification.

Required before merge:

- schema reviewed against the feature requirements
- constraints and indexes checked
- migration runs successfully on a fresh database
- migration rollback works locally when practical
- at least one realistic insert or query path is validated

Good examples:

- create database from scratch
- apply migration
- inspect generated tables
- verify unique constraints and foreign keys

### `feature-be-*`

Use backend integration tests as the default.

Required before merge:

- integration tests for happy path
- tests for auth and permissions where relevant
- tests for invalid input and expected error shapes
- manual smoke check of the endpoint when practical

Use unit tests only for pure logic such as:

- token utilities
- pagination helpers
- overlap detection logic
- AI prompt builders or response parsers

Do not rely mostly on unit tests for route behavior.

### `feature-fe-*`

Use manual UI verification first, then add focused tests where logic is real.

Required before merge:

- mobile and desktop manual QA
- validation states checked
- loading states checked
- error states checked
- screenshots or short notes in PR for visible UI changes

Add targeted frontend tests when there is real logic, such as:

- form validation rules
- state transitions
- data mapping
- conditional rendering driven by behavior, not just styling

Do not write tests for every visual wrapper or static component.

### `docs/*`

Use review-based verification.

Required before merge:

- document is accurate
- references match the current repo or product plan
- another teammate can follow it without guessing

## Verification By Owner

### `@otthomas`

Default verification expectations:

- database branches: migration and schema verification
- frontend branches: manual QA plus targeted tests only when logic is non-trivial
- always include screenshots or concise UI notes for frontend PRs

### `@reaganbourne`

Default verification expectations:

- backend branches: integration tests are the standard
- auth, validation, and permission cases should be covered whenever relevant
- document endpoint examples and error shapes in the PR when they change

## Phase-Based Testing Strategy

### Phase 1: Foundation and Auth

Focus:

- smoke checks for repo and Docker setup
- migration verification for DB baseline
- backend integration tests for auth
- manual QA for auth screens

Minimum bar:

- auth endpoints tested
- login and signup UI manually verified
- schema and migration can boot from scratch

### Phase 2: Core Outfit Loop

Focus:

- file upload verification
- outfit creation and tagging integration tests
- feed pagination tests
- manual QA for upload flow, feed, and vault

Minimum bar:

- upload works end to end
- tagging works end to end
- feed and vault render real data

### Phase 3: Event Boards

Focus:

- permissions and membership tests
- join token validation
- board submission tests
- manual QA for board creation, join, and board detail flows

Minimum bar:

- users cannot join or submit incorrectly
- board creation and joining work from clean state

### Phase 4: AI Vibe Layer and Story Card

Focus:

- timeout and failure-path tests for AI routes
- prompt and response normalization tests where useful
- manual QA for tone selection, AI result display, and story export

Minimum bar:

- AI failures do not break the user flow
- story export works in the supported environment

### Phase 5: Polish and Launch Readiness

Focus:

- regression testing across the core flows
- responsive checks
- search and discovery checks
- a small set of end-to-end tests for the most important user journeys

Minimum bar:

- core demo flow is reliable
- main screens work from small mobile to desktop
- CI catches major regressions

## End-to-End Test Strategy

Do not start with broad E2E coverage. Add it once core flows exist.

Target only the highest-value flows first:

1. sign up and log in
2. upload an outfit
3. create or join a board
4. request a vibe check

If you use Playwright later, keep the suite small and stable.

## PR Verification Checklist

Every PR should answer these:

- What changed?
- How was it tested?
- What assumptions or limitations still exist?
- If UI changed, what should the reviewer look at?
- If API changed, what request or response shape changed?

## Manual QA Checklist For Frontend Work

Use this before merging frontend tickets:

- view works on mobile width
- view works on desktop width
- happy path works
- loading state appears correctly
- empty state appears correctly if relevant
- error state appears correctly
- keyboard and basic accessibility interactions work
- no obvious visual breakage or layout shift

## Database Verification Checklist

Use this before merging database tickets:

- schema matches the document
- migration applies on fresh database
- migration order is correct
- foreign keys and unique constraints behave correctly
- indexes exist for expected query paths
- rollback was considered and tested when practical

## Backend Verification Checklist

Use this before merging backend tickets:

- happy path integration test exists
- auth and permission rules are tested where relevant
- invalid input returns expected status and shape
- edge cases are covered where the logic is risky
- endpoint contract matches shared docs

## Frontend Test Guidance

Good candidates for targeted frontend tests:

- auth form validation
- upload-step transitions
- tone selector state
- data formatting helpers

Bad candidates for targeted frontend tests:

- static layout wrappers
- purely visual spacing changes
- one-off presentational components with no behavior

## CI Expectations Over Time

Early phases:

- run backend tests
- run lint or format checks once available

Later phases:

- keep backend integration tests in CI
- add any stable frontend tests
- add a very small E2E suite if it becomes reliable enough

## Default Rule For Disagreements

If you are unsure how to test something, use the lightest test that still gives real confidence:

- smoke check for setup
- migration check for DB
- integration test for backend
- manual QA for frontend
- E2E only for the most critical cross-layer flows
