# Issue Plan

## Issue Number

**#6 — Implement Backend User Authentication Service (Register, Login, OAuth)**

- **Repository:** `aayushiraii/adlc-agent-workflow`
- **ADLC Phase:** Development
- **Assigned Agent:** Backend Development Agent
- **Labels:** `development` · `authentication` · `high-priority` · `backend`
- **Sprint:** Sprint 2 (Week 1–2)
- **Story Points:** 8 SP
- **Priority:** 🔴 High
- **GitHub Issue:** https://github.com/aayushiraii/adlc-agent-workflow/issues/6

---

## Objective

Design, implement, and deliver a **secure, production-ready backend authentication service** for the Food Delivery Platform.

This service covers the full authentication lifecycle — user registration, email/password login, logout, JWT access and refresh token management, refresh token rotation, Google OAuth 2.0 integration, and password reset via email. It forms the **security foundation** of the entire platform and directly unblocks the Frontend Auth Screens (#7) and all protected API routes across every other service.

---

## Scope

### ✅ In Scope

| Area | Details |
|------|---------|
| **User Registration** | `POST /auth/register` — field validation, bcrypt hashing, user creation, email verification trigger |
| **User Login** | `POST /auth/login` — credential validation, account lockout check, JWT + refresh token issuance |
| **Logout** | `POST /auth/logout` — refresh token invalidation and blacklisting |
| **Token Refresh** | `POST /auth/refresh` — validate refresh token, issue new access token, rotate refresh token |
| **Forgot Password** | `POST /auth/forgot-password` — generate signed reset token, send email |
| **Reset Password** | `POST /auth/reset-password` — validate token, update password, invalidate all sessions |
| **Google OAuth 2.0** | `GET /auth/google` + `GET /auth/google/callback` — OAuth consent, callback, user linking |
| **Password Hashing** | bcrypt with cost factor ≥ 12 |
| **JWT Strategy** | Access token (15 min TTL) + Refresh token (7 days TTL, httpOnly cookie) |
| **Refresh Token Rotation** | Each refresh invalidates the old token and issues a new one |
| **Rate Limiting** | Max 10 req/min per IP on all auth endpoints |
| **Input Validation** | Server-side validation on all request bodies |
| **Security Headers** | `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options` |

### ❌ Out of Scope

- Two-factor authentication (2FA) — post-MVP
- Facebook / Apple OAuth — post-MVP
- Admin or restaurant-owner authentication — separate service
- Frontend implementation — Issue #7
- Email template design — handled by Notification Service

---

## Tasks

### Phase 1 — Project Setup & Configuration *(Day 1)*

| # | Task | Description |
|---|------|-------------|
| 1.1 | Initialize auth service module | Create `src/modules/auth/` directory structure with controllers, services, routes, middleware, and utilities |
| 1.2 | Install dependencies | `bcrypt`, `jsonwebtoken`, `passport`, `passport-google-oauth20`, `express-rate-limit`, `nodemailer` (or SDK), `zod` (validation), `uuid` |
| 1.3 | Configure environment variables | Define `.env` schema: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `BCRYPT_COST_FACTOR` |
| 1.4 | Set up database connection | Configure PostgreSQL connection using the schema defined in #4; ensure `users` and `refresh_tokens` tables are migrated |
| 1.5 | Set up Redis connection | Configure Redis for refresh token blacklisting and rate-limit tracking |
| 1.6 | Configure Passport.js | Initialize Passport with `LocalStrategy` and `GoogleStrategy`; wire into Express middleware stack |

---

### Phase 2 — Core Service Implementation *(Day 2–5)*

#### 2A — Utility Layer

| # | Task | Description |
|---|------|-------------|
| 2.1 | JWT utility module | `signAccessToken(userId)`, `signRefreshToken(userId)`, `verifyAccessToken(token)`, `verifyRefreshToken(token)` |
| 2.2 | bcrypt utility module | `hashPassword(plain)`, `comparePassword(plain, hash)` with configurable cost factor |
| 2.3 | Token blacklist utility | `blacklistToken(token)` (write to Redis with TTL), `isBlacklisted(token)` (read from Redis) |
| 2.4 | Email utility module | `sendVerificationEmail(to, token)`, `sendPasswordResetEmail(to, token)` using configured email provider |
| 2.5 | Input validation schemas | Define Zod schemas for all request bodies: register, login, forgot-password, reset-password |

#### 2B — Endpoint Implementation

| # | Endpoint | Method | Task Description |
|---|----------|--------|-----------------|
| 2.6 | `/auth/register` | POST | Validate body → check duplicate email → hash password → create user (status: UNVERIFIED) → send verification email → return 201 |
| 2.7 | `/auth/verify-email` | GET | Validate token from query param → mark user VERIFIED → return 200 |
| 2.8 | `/auth/login` | POST | Validate body → find user → check lockout → compare bcrypt hash → check verified status → reset fail counter → issue access + refresh tokens → return 200 |
| 2.9 | `/auth/logout` | POST | Extract refresh token from cookie → blacklist in Redis → clear cookie → return 200 |
| 2.10 | `/auth/refresh` | POST | Extract refresh token from cookie → verify signature → check blacklist → blacklist old token → issue new access + refresh tokens → return 200 |
| 2.11 | `/auth/forgot-password` | POST | Find user by email (silent if not found) → generate UUID reset token → store hashed token in DB with 1-hr expiry → send reset email → return 200 |
| 2.12 | `/auth/reset-password` | POST | Validate token param + new password body → find token in DB → check expiry + used status → hash new password → update user → mark token used → blacklist all refresh tokens for user → return 200 |
| 2.13 | `/auth/google` | GET | Redirect to Google OAuth consent screen with scopes: `openid profile email` |
| 2.14 | `/auth/google/callback` | GET | Receive auth code → exchange for ID token → decode email/name/photo → find or create user → issue tokens → redirect to frontend |

---

### Phase 3 — Security & Middleware Hardening *(Day 6–7)*

| # | Task | Description |
|---|------|-------------|
| 3.1 | Rate limiting middleware | Apply `express-rate-limit` to all `/auth/*` routes: 10 requests/minute/IP; return `429 Too Many Requests` on breach |
| 3.2 | Account lockout logic | After 5 consecutive failed login attempts: set `locked_until = now + 15 min` on user record; return `423 Locked` with expiry time |
| 3.3 | Auth middleware (JWT guard) | `authenticateJWT` middleware: extract Bearer token from `Authorization` header → verify → attach `req.user`; used to protect all non-auth routes |
| 3.4 | Secure HTTP headers | Apply `helmet.js` for `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy` |
| 3.5 | CORS configuration | Allow only whitelisted frontend origins; block wildcard `*` on auth routes |
| 3.6 | Refresh token cookie config | Set `httpOnly: true`, `secure: true`, `sameSite: 'strict'`, `maxAge: 7 * 24 * 60 * 60 * 1000` |

---

### Phase 4 — Testing *(Day 8–9)*

| # | Task | Description |
|---|------|-------------|
| 4.1 | Unit tests — JWT utils | Test `sign`, `verify`, and expiry behavior for access and refresh tokens |
| 4.2 | Unit tests — bcrypt utils | Test `hashPassword` and `comparePassword` with valid, invalid, and edge-case inputs |
| 4.3 | Unit tests — auth service | Test all business logic: registration, login, lockout, token rotation, password reset |
| 4.4 | Integration tests — register | Happy path + duplicate email + validation errors |
| 4.5 | Integration tests — login | Happy path + wrong password + locked account + unverified account |
| 4.6 | Integration tests — logout | Valid logout + already-blacklisted token |
| 4.7 | Integration tests — refresh | Valid rotation + expired token + blacklisted token |
| 4.8 | Integration tests — password reset | Full reset flow + expired token + already-used token |
| 4.9 | Integration tests — Google OAuth | Mock OAuth flow; test user creation and user linking |
| 4.10 | Integration tests — rate limiting | Verify 429 response after threshold breach |
| 4.11 | Test coverage check | Ensure ≥ 80% coverage across the auth module; fail CI if below threshold |

---

### Phase 5 — Review & Documentation *(Day 10)*

| # | Task | Description |
|---|------|-------------|
| 5.1 | API documentation | Document all endpoints in Swagger/OpenAPI spec with request bodies, response shapes, and error codes |
| 5.2 | Code review | Submit PR; address all review comments; ensure OWASP Top 10 checklist is cleared for auth module |
| 5.3 | Environment setup guide | Document all required env vars and their expected values in `docs/auth-service-setup.md` |
| 5.4 | PR merge & CI validation | Confirm all tests pass in CI pipeline before merge |

---

## API Contract Reference

### `POST /auth/register`

**Request Body:**
```json
{
  "first_name": "string (required)",
  "last_name": "string (required)",
  "email": "string (required, unique)",
  "password": "string (required, min 8 chars)",
  "phone_number": "string (optional, E.164)"
}
```

**Responses:**

| Status | Description |
|--------|-------------|
| `201 Created` | User created; verification email sent |
| `400 Bad Request` | Validation errors (field-level) |
| `409 Conflict` | Email already registered |
| `429 Too Many Requests` | Rate limit exceeded |

---

### `POST /auth/login`

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Responses:**

| Status | Description |
|--------|-------------|
| `200 OK` | Returns `{ access_token }` + sets `refresh_token` httpOnly cookie |
| `400 Bad Request` | Validation errors |
| `401 Unauthorized` | Invalid credentials |
| `403 Forbidden` | Email not verified |
| `423 Locked` | Account locked; includes `locked_until` timestamp |
| `429 Too Many Requests` | Rate limit exceeded |

---

### `POST /auth/logout`

**Auth:** Refresh token cookie (required)

**Responses:**

| Status | Description |
|--------|-------------|
| `200 OK` | Refresh token blacklisted; cookie cleared |
| `401 Unauthorized` | Missing or invalid refresh token |

---

### `POST /auth/refresh`

**Auth:** Refresh token cookie (required)

**Responses:**

| Status | Description |
|--------|-------------|
| `200 OK` | Returns new `{ access_token }` + rotated `refresh_token` cookie |
| `401 Unauthorized` | Expired, invalid, or blacklisted refresh token |

---

### `POST /auth/forgot-password`

**Request Body:**
```json
{
  "email": "string (required)"
}
```

**Responses:**

| Status | Description |
|--------|-------------|
| `200 OK` | Always returns 200 (email existence not revealed) |
| `429 Too Many Requests` | Rate limit exceeded |

---

### `POST /auth/reset-password`

**Request Body:**
```json
{
  "token": "string (required)",
  "new_password": "string (required, min 8 chars)"
}
```

**Responses:**

| Status | Description |
|--------|-------------|
| `200 OK` | Password updated; all sessions invalidated |
| `400 Bad Request` | Invalid, expired, or already-used token |
| `422 Unprocessable Entity` | Password does not meet policy |

---

### `GET /auth/google`

Redirects to Google OAuth consent screen.

---

### `GET /auth/google/callback`

Handles Google OAuth callback; issues tokens; redirects to frontend home.

---

## Database Schema Reference

### `users` Table

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, default gen_random_uuid() |
| `first_name` | VARCHAR(50) | NOT NULL |
| `last_name` | VARCHAR(50) | NOT NULL |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE |
| `password_hash` | VARCHAR(255) | NULLABLE (null for OAuth-only users) |
| `phone_number` | VARCHAR(20) | NULLABLE |
| `status` | ENUM('UNVERIFIED', 'VERIFIED', 'SUSPENDED') | NOT NULL, DEFAULT 'UNVERIFIED' |
| `failed_login_attempts` | INTEGER | NOT NULL, DEFAULT 0 |
| `locked_until` | TIMESTAMP | NULLABLE |
| `google_id` | VARCHAR(255) | NULLABLE, UNIQUE |
| `profile_photo_url` | TEXT | NULLABLE |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() |

### `refresh_tokens` Table

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users.id, ON DELETE CASCADE |
| `token_hash` | VARCHAR(255) | NOT NULL, UNIQUE |
| `expires_at` | TIMESTAMP | NOT NULL |
| `revoked` | BOOLEAN | NOT NULL, DEFAULT false |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() |

### `password_reset_tokens` Table

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users.id, ON DELETE CASCADE |
| `token_hash` | VARCHAR(255) | NOT NULL, UNIQUE |
| `expires_at` | TIMESTAMP | NOT NULL |
| `used` | BOOLEAN | NOT NULL, DEFAULT false |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() |

---

## Dependencies

### Blocking Dependencies (Must Be Complete Before Starting)

| Issue | Title | Status | Why Needed |
|-------|-------|--------|------------|
| **#4** | Design System Architecture and Database Schema | 🔴 Must be complete | Defines `users`, `refresh_tokens`, and `password_reset_tokens` table schemas; finalizes tech stack (Node.js, PostgreSQL, Redis) |

### Issues Unblocked by This Issue

| Issue | Title | Blocked Until |
|-------|-------|--------------|
| **#7** | Implement Frontend User Registration and Login Screens | #6 complete |
| **#14** | Write and Execute Backend Unit and Integration Tests | #6, #8, #10, #12 complete |

---

## Risks

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|:----------:|:------:|---------------------|
| `JWT_SECRET` or `JWT_REFRESH_SECRET` not secured in production environment | 🟡 Medium | 🔴 High | Store secrets in AWS Secrets Manager or equivalent; never commit to repository; validate on service startup |
| Refresh token rotation race condition (two concurrent refresh requests) | 🟡 Medium | 🟡 Medium | Implement optimistic locking or Redis-based mutex on token rotation; treat second request as reuse attack and revoke all tokens for user |
| Google OAuth callback URL mismatch in production | 🟡 Medium | 🟡 Medium | Register both dev and production callback URLs in Google Cloud Console before development begins |
| bcrypt cost factor too high causing login latency spikes | 🟢 Low | 🟡 Medium | Benchmark cost factor 12 vs. 14 under load; target < 300ms hash time; adjust accordingly |
| Email delivery failure blocking password reset | 🟡 Medium | 🟡 Medium | Implement retry logic; log failed sends; consider fallback email provider |
| Scope creep — requests to add 2FA or phone OTP during sprint | 🟢 Low | 🟡 Medium | Defer explicitly to post-MVP issue; document in backlog |
| DB migration from #4 not ready when development begins | 🟡 Medium | 🔴 High | Coordinate with Solution Design Agent; confirm #4 is merged and migrations are run before Sprint 2 Day 1 |

---

## Story Points

**Estimate: 8 Story Points**

| Factor | Assessment |
|--------|-----------|
| Complexity | High — multiple endpoints, JWT strategy, OAuth flow, bcrypt, Redis, rate limiting, lockout logic |
| Effort | High — full backend service implementation with security hardening and comprehensive test coverage |
| Risk | Medium — well-understood patterns but security-critical; errors have high impact |
| Uncertainty | Low — requirements fully defined in #1; architecture finalized in #4 |

---

## Acceptance Criteria

- [ ] `POST /auth/register` creates a user record and returns a `201` with a prompt to verify email.
- [ ] `POST /auth/login` authenticates a verified user and returns a JWT access token + sets httpOnly refresh token cookie.
- [ ] `POST /auth/logout` blacklists the refresh token and clears the cookie.
- [ ] `POST /auth/refresh` rotates the refresh token and returns a new access token.
- [ ] `POST /auth/forgot-password` sends a password reset email without revealing email existence.
- [ ] `POST /auth/reset-password` updates the password and invalidates all active sessions.
- [ ] Google OAuth login flow is functional; new users are created and existing accounts are linked.
- [ ] All passwords are hashed with bcrypt (cost factor ≥ 12); plaintext passwords are never stored or logged.
- [ ] All tokens are signed with RS256 or HS256 and validated on every protected request.
- [ ] Rate limiting (10 req/min/IP) is enforced on all `/auth/*` endpoints.
- [ ] Account lockout (5 failed attempts → 15-min lock) is implemented and tested.
- [ ] Test coverage is ≥ 80% across the auth module.
- [ ] All tests pass in the CI pipeline.
- [ ] Swagger/OpenAPI documentation is complete for all auth endpoints.

---

## Questions for Approval

| # | Question | Impact if Unresolved |
|---|----------|----------------------|
| Q1 | Is the backend framework **Express.js** (Node.js)? Or is another framework (Fastify, NestJS) being used? | Affects middleware wiring, Passport.js setup, and folder structure |
| Q2 | Which ORM is being used — **Prisma**, TypeORM, or Sequelize? | Affects how DB schema from #4 is consumed and how migrations are run |
| Q3 | Is **Redis** provisioned and available for token blacklisting and rate limiting? | Without Redis, token blacklisting must fall back to DB (slower; different implementation) |
| Q4 | Which email provider is being used for verification and password reset emails — **SendGrid**, AWS SES, or Nodemailer + SMTP? | Affects email utility implementation |
| Q5 | Are **Google OAuth credentials** (Client ID + Secret) already created in Google Cloud Console? | Without credentials, OAuth cannot be implemented or tested |
| Q6 | Should refresh tokens be persisted in **PostgreSQL** (`refresh_tokens` table) or **Redis** with TTL? | Affects token rotation implementation and revocation strategy |
| Q7 | What is the **frontend callback URL** after successful Google OAuth? (e.g., `https://app.domain.com/auth/callback`) | Required to configure `GOOGLE_CALLBACK_URL` and register in Google Cloud Console |

---

## Final Recommendation

✅ **Proceed with Issue #6 in Sprint 2 — after Issue #4 is fully merged and migrations are confirmed.**

### Rationale

- Issue #6 is the **security foundation** of the entire platform. Every protected API route, every frontend screen, and every user-facing flow depends on this service being correct, secure, and performant.
- The requirements are **fully defined** in Issue #1, and the architecture and DB schema will be **finalized in Issue #4** — making this a well-scoped, low-uncertainty implementation task.
- An **8 SP estimate** reflects the breadth of endpoints, the security criticality, and the testing rigor required — not unusual complexity for a well-defined auth service.

### Execution Recommendation

| Action | Detail |
|--------|--------|
| **Start Date** | Sprint 2, Day 1 — only after #4 is merged and DB migrations confirmed |
| **Target Completion** | Sprint 2, Day 10 (end of 2-week sprint) |
| **Parallel Execution** | Can be developed in parallel with #8 (Restaurant APIs) once #4 is complete |
| **Sign-off Deadline** | End of Sprint 2 — must not slip; #7 (Frontend Auth) is blocked on this |
| **Output Artifacts** | Working auth service · Swagger docs · Unit + integration tests passing in CI |

---

*Generated by Sprint Planning Agent on 2026-06-25 · Issue #6 · Repository: `aayushiraii/adlc-agent-workflow`*
