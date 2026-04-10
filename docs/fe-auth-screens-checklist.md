# feature-fe-auth-screens Checklist

Branch: `feature-fe-auth-screens`
Owner: `@otthomas`
Status: in progress

This checklist tracks the low-level completion state for the auth screen milestone.

## Milestone 1: Frontend Foundation

- [x] Create `feature-fe-auth-screens` branch from updated `main`
- [x] Add a minimal web app package scaffold in `apps/web`
- [x] Add Next-style app router structure
- [x] Add Tailwind and PostCSS config files
- [x] Add global brand tokens and shared auth styling

## Milestone 2: Screen Structure

- [x] Add root landing page that links into auth review flows
- [x] Add dedicated `/login` page
- [x] Add dedicated `/signup` page
- [x] Add a reusable auth shell layout component
- [x] Add a reusable auth form component

## Milestone 3: Form Behavior

- [x] Add client-side validation for email and password
- [x] Add username and confirm-password validation for sign-up
- [x] Add loading state during submit
- [x] Add error state messaging
- [x] Add success state messaging
- [x] Add mocked request and response behavior for manual review

## Milestone 4: Review Support

- [x] Add QA notes for mocked success and failure paths
- [x] Add docs index entry for this checklist
- [x] Keep implementation scoped to frontend-only auth work

## Remaining Before Merge

- [ ] Install frontend dependencies
- [ ] Run the web app locally and inspect the auth screens in browser
- [ ] Capture screenshots or reviewer notes from live runtime verification
- [ ] Align mocked payload expectations with Reagan's auth API contract
