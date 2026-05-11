# Public launch security plan

This plan focuses on password and API key vulnerabilities first, then the surrounding controls that keep those two areas from becoming production incidents.

## Immediate risk inventory

### Critical

1. A concrete JWT `SECRET_KEY` was present in `DEPLOY.md`.
   - Impact: anyone with that value can forge valid access tokens for production if the same value is deployed.
   - Fix in this PR: removed the hardcoded value from deployment docs and added production config validation that rejects weak/placeholder secrets.
   - Required operational action: rotate production `SECRET_KEY` before public launch if this value was ever deployed or copied.

2. API keys and cloud credentials depend on human handling discipline.
   - Impact: leaked AWS or Anthropic keys can lead to data exposure, account abuse, and unexpected billing.
   - Fix in this PR: added explicit launch checklist guidance for rotation, least privilege, and env-only storage.
   - Required operational action: rotate any key that has appeared in local files, chat, support tools, screenshots, or logs.

3. Login endpoints had no brute-force protection.
   - Impact: public login can be attacked with credential stuffing or password spraying.
   - Fix in this PR: added dependency-free rate limiting on login/register attempts by IP and login email.
   - Required operational action: add provider/edge or Redis-backed rate limiting for multi-instance production.

### High

4. Password minimum was too low for a public app without MFA.
   - Impact: weak passwords are easier to guess and more likely to appear in credential stuffing lists.
   - Fix in this PR: raised signup password minimum to 12 characters in frontend and backend.
   - Recommended next step: add optional MFA before wider launch, then revisit password policy and recovery flows.

5. Bcrypt password truncation was not explicitly handled.
   - Impact: bcrypt only uses the first 72 bytes; users could create passwords that appear different but verify the same after byte 72.
   - Fix in this PR: reject passwords longer than 72 bytes and fail verification for oversized login inputs.

6. Production startup did not reject unsafe security config.
   - Impact: a deploy can accidentally go public with placeholder secrets, wildcard/localhost CORS, or short admin secrets.
   - Fix in this PR: production config validation now rejects weak `SECRET_KEY`, wildcard/localhost CORS origins, too-short `ADMIN_SECRET`, and incomplete S3 credential config.

### Medium

7. Refresh cookie deletion did not mirror production cookie attributes.
   - Impact: logout can fail to clear a production cross-site refresh cookie in some browsers.
   - Fix in this PR: cookie deletion now uses matching `SameSite` and `Secure` settings for the current environment.

8. Refresh tokens are SHA-256 hashed without a server-side pepper.
   - Current status: acceptable because refresh tokens are high entropy, random, and rotated.
   - Recommended next step: consider HMAC-SHA-256 with a separate server secret for refresh token hashes.

9. Auth tokens are returned to client JavaScript.
   - Current status: access tokens are short-lived and stored in memory/sessionStorage.
   - Risk: XSS can steal access tokens from sessionStorage.
   - Recommended next step: add strict Content Security Policy and consider moving access-token handling to an httpOnly same-site pattern if frontend/API are unified under one domain.

10. Password recovery UI exists, but a secure reset flow needs a dedicated review.
    - Risk: reset-token leakage or account takeover if implemented casually.
    - Required before launch: single-use reset tokens, short expiry, hashed token storage, generic responses, rate limiting, and email verification.

## Fixes made in this PR

- Removed hardcoded JWT secret from `DEPLOY.md`.
- Added production config validation for:
  - random `SECRET_KEY` length/placeholder checks,
  - exact production `CORS_ORIGINS`,
  - minimum `ADMIN_SECRET` length when enabled,
  - complete AWS credential config when S3 is configured.
- Raised signup password minimum from 8 to 12 characters.
- Added 72-byte password maximum to prevent bcrypt truncation ambiguity.
- Added login/register rate limiting.
- Made refresh-cookie clearing mirror production cookie attributes.
- Added baseline frontend security headers.
- Tightened the image proxy to HTTPS image responses from allowed hosts with timeout and size limits.
- Updated auth contract and deployment docs.
- Added tests for password byte limit and auth rate limiting.

## Required launch actions outside the repo

1. Rotate production `SECRET_KEY`.
   - Use: `openssl rand -hex 32`
   - Set only in Railway production env vars.
   - This invalidates existing access tokens; users may need to log in again.

2. Rotate exposed or uncertain API keys.
   - AWS access key.
   - Anthropic API key.
   - Any admin/cron secret.

3. Lock down AWS IAM.
   - Use a dedicated IAM user or role for this app only.
   - Scope permissions to the exact S3 bucket.
   - Allow only required actions, for example object put/get/delete/list as needed.
   - Disable console access for app credentials.

4. Verify provider secrets.
   - Railway: backend secrets only.
   - Vercel: frontend public values only, unless using server-side route handlers.
   - Never put private secrets in `NEXT_PUBLIC_*`; those are browser-visible.

5. Add production-grade distributed rate limiting.
   - The in-process limiter is useful but does not coordinate across multiple server instances.
   - Preferred: edge/WAF rate limit, Redis-backed limiter, or managed API gateway limit.

6. Add secret scanning in GitHub.
   - Enable GitHub secret scanning and push protection.
   - Add a CI job using a scanner such as Gitleaks or TruffleHog.

7. Add security headers.
   - Content-Security-Policy.
   - Strict-Transport-Security.
   - X-Content-Type-Options.
   - Referrer-Policy.
   - Permissions-Policy.

8. Run dependency scanning.
   - Dependabot alerts.
   - `npm audit` for the web app.
   - `pip-audit` or equivalent for the API.

## Password policy

Current policy after this PR:

- Signup passwords must be at least 12 characters.
- Passwords must be 72 bytes or fewer because bcrypt truncates beyond 72 bytes.
- Login responses remain generic.
- Password hashes use bcrypt.

Recommended next additions:

- Check new passwords against breached-password corpuses, preferably k-anonymity lookup.
- Add MFA before larger public launch.
- Add email verification before social graph growth.
- Add secure password reset with one-time hashed reset tokens.

## API key policy

Rules:

- Private keys must never use `NEXT_PUBLIC_*`.
- Private keys must live only in provider environment variable stores.
- Keys must be rotated after any suspected exposure.
- Keys must be least-privilege and app-specific.
- Logs must never print key values, signed URLs, bearer tokens, refresh tokens, or cookies.

Rotation cadence:

- Immediate rotation after any exposure.
- Scheduled rotation every 90 days for AWS/admin secrets.
- Anthropic key rotation based on provider support and billing-risk tolerance.

## Sources

- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP Secrets Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- OWASP API Security Top 10 2023: https://owasp.org/API-Security/editions/2023/en/0x11-t10/
