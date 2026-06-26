# Implementation Plan — Issue #20: Implement User Login API Endpoint

---

## Issue Summary

| Field         | Details                                              |
|---------------|------------------------------------------------------|
| **Issue #**   | 20                                                   |
| **Title**     | Implement User Login API Endpoint                    |
| **Priority**  | High                                                 |
| **ADLC Phase**| Development                                          |
| **Labels**    | `development`, `high-priority`, `backend`            |
| **Assigned**  | Backend Development Agent                            |
| **Dependencies** | Issue: *Implement User Registration API Endpoint* must be completed first |

---

## Objective

Build a secure `POST /auth/login` endpoint that authenticates users by validating their email and password against the stored hashed password, and returns a signed JWT access token upon successful authentication. Invalid or missing inputs must return appropriate HTTP error responses.

---

## Phase 1 — Requirement Analysis

### Functional Requirements

- Accept `email` and `password` in the request body via `POST /auth/login`.
- Validate that both fields are present and non-empty (return `400 Bad Request` if missing).
- Look up the user record by `email` from the database.
- If the user does not exist, return `401 Unauthorized` with a generic error message.
- Compare the submitted password against the stored hashed password using the **same hashing strategy used during registration** (e.g., bcrypt).
- If the password does not match, return `401 Unauthorized` with a generic error message.
- If credentials are valid, return `200 OK` with a signed JWT access token.

### Business Rules

- **Generic error messages only** for `401` responses — do not distinguish between "user not found" and "wrong password" to prevent user enumeration.
- Refresh tokens are **out of scope** for this issue.
- The hashing algorithm must be consistent with the Registration API (dependency).
- JWT must be signed using a secret key stored securely in environment variables.
- Passwords must **never** be returned or logged.

### Constraints

- Login is **email + password based only** (no OAuth, no phone login).
- The endpoint must return appropriate HTTP status codes (`200`, `400`, `401`).
- JWT token payload must include at minimum: `userId`, `email`, `iat` (issued at), `exp` (expiry).
- User registration must be completed before this endpoint can be tested end-to-end.

---

## Phase 2 — Design

### Architecture Decisions

- **Pattern:** RESTful API following existing project conventions.
- **Authentication Strategy:** Stateless JWT (no session storage).
- **Password Hashing:** Reuse the hashing library and configuration (e.g., bcrypt with same salt rounds) established in the Registration endpoint.
- **JWT Signing:** Use `HS256` or `RS256` algorithm; secret/private key loaded from environment variables.
- **Error Handling:** Centralized error handler middleware for consistent error response structure.

### Data Models

#### Request Body

```json
{
  "email": "user@example.com",
  "password": "plaintextPassword"
}
```

#### Success Response — `200 OK`

```json
{
  "token": "<signed_jwt_token>"
}
```

#### Error Response — `400 Bad Request`

```json
{
  "error": "Validation failed",
  "details": [
    { "field": "email", "message": "Email is required" },
    { "field": "password", "message": "Password is required" }
  ]
}
```

#### Error Response — `401 Unauthorized`

```json
{
  "error": "Invalid email or password"
}
```

### JWT Payload Structure

```json
{
  "userId": "abc123",
  "email": "user@example.com",
  "iat": 1719396000,
  "exp": 1719482400
}
```

### API Endpoint

| Method | Path          | Auth Required | Description              |
|--------|---------------|---------------|--------------------------|
| POST   | `/auth/login` | No            | Authenticate user, return JWT |

### Components

- **Route:** `POST /auth/login`
- **Controller:** `AuthController.login`
- **Service:** `AuthService.loginUser`
- **Repository/Query:** `UserRepository.findByEmail`
- **Utility:** `PasswordHelper.compare` (reused from registration)
- **Utility:** `JwtHelper.sign`
- **Validator:** `LoginRequestValidator` (email format + required fields)
- **Middleware:** Input validation middleware, error handler middleware

---

## Phase 3 — Implementation

### Backend Tasks

- [ ] **BT-1:** Create or update the route file to register `POST /auth/login`.
- [ ] **BT-2:** Implement `AuthController.login` method to handle request/response lifecycle.
- [ ] **BT-3:** Implement `AuthService.loginUser` business logic:
  - Fetch user by email from the database.
  - Compare submitted password against stored hash using `PasswordHelper.compare`.
  - Generate and return a signed JWT using `JwtHelper.sign`.
- [ ] **BT-4:** Implement `LoginRequestValidator` to validate:
  - `email` is present and a valid email format.
  - `password` is present and non-empty.
- [ ] **BT-5:** Ensure `JwtHelper.sign` reads secret/private key from environment variables.
- [ ] **BT-6:** Ensure generic `401` error message (do not expose whether email or password failed).
- [ ] **BT-7:** Add structured error responses for `400` (validation) and `401` (auth failure).
- [ ] **BT-8:** Confirm `PasswordHelper.compare` uses the same bcrypt configuration as registration.

### Database Tasks

- [ ] **DB-1:** No schema changes required — this endpoint reads from the existing `users` table created during registration.
- [ ] **DB-2:** Confirm that the `users` table contains:
  - `id` (primary key)
  - `email` (unique, indexed)
  - `password_hash` (hashed password string)
- [ ] **DB-3:** Ensure an **index on `email`** exists for efficient lookup (validate from migration files).

### Integration Tasks

- [ ] **INT-1:** Integrate with the User Registration flow to confirm user records are retrievable.
- [ ] **INT-2:** Validate that JWT tokens generated here are accepted by any downstream protected routes.
- [ ] **INT-3:** Confirm environment variables for JWT secret and token expiry are present in `.env.example` and deployment configuration.

---

## Phase 4 — Testing

### Unit Tests

- [ ] **UT-1:** `AuthService.loginUser` — returns JWT when valid credentials are provided.
- [ ] **UT-2:** `AuthService.loginUser` — returns `401` error when email does not exist.
- [ ] **UT-3:** `AuthService.loginUser` — returns `401` error when password does not match hash.
- [ ] **UT-4:** `LoginRequestValidator` — returns `400` with validation details when `email` is missing.
- [ ] **UT-5:** `LoginRequestValidator` — returns `400` with validation details when `password` is missing.
- [ ] **UT-6:** `LoginRequestValidator` — returns `400` when `email` format is invalid.
- [ ] **UT-7:** `JwtHelper.sign` — generates a token with correct payload fields (`userId`, `email`, `iat`, `exp`).
- [ ] **UT-8:** `PasswordHelper.compare` — correctly validates matching and non-matching passwords.

### Integration Tests

- [ ] **IT-1:** `POST /auth/login` — valid credentials → `200 OK` with JWT token in response.
- [ ] **IT-2:** `POST /auth/login` — wrong password → `401 Unauthorized` with generic message.
- [ ] **IT-3:** `POST /auth/login` — non-existent email → `401 Unauthorized` with generic message.
- [ ] **IT-4:** `POST /auth/login` — missing `email` field → `400 Bad Request` with validation details.
- [ ] **IT-5:** `POST /auth/login` — missing `password` field → `400 Bad Request` with validation details.
- [ ] **IT-6:** `POST /auth/login` — both fields missing → `400 Bad Request` with validation details for both fields.
- [ ] **IT-7:** `POST /auth/login` — invalid email format → `400 Bad Request`.

### Validation Scenarios

- [ ] **VS-1:** JWT token is decodable and contains expected payload fields.
- [ ] **VS-2:** JWT token expiry is set correctly per environment configuration.
- [ ] **VS-3:** `401` response does **not** reveal whether the email or password was the incorrect field.
- [ ] **VS-4:** Passwords are never returned or logged in any response or server log.
- [ ] **VS-5:** Password hashing strategy matches the one used in the Registration API.

---

## Risks

### Technical Risks

| Risk | Description | Mitigation |
|------|-------------|------------|
| **Hashing mismatch** | If `PasswordHelper.compare` uses different bcrypt rounds or algorithm than registration, all logins will fail. | Confirm and share a single hashing config/utility module between registration and login. |
| **JWT secret misconfiguration** | Hardcoded or missing JWT secret in environments will break token generation/validation. | Load from environment variables; add validation on server startup. |
| **Token expiry not configured** | Tokens with no expiry are a security risk. | Always set `exp` claim; default to short-lived (e.g., 1 hour). |
| **Timing attacks on password comparison** | Using non-constant-time comparison could leak timing information. | Use bcrypt's built-in `compare` function, which is constant-time. |

### Dependency Risks

| Risk | Description | Mitigation |
|------|-------------|------------|
| **Registration not complete** | Login cannot be tested end-to-end without registered users. | Block end-to-end testing until Issue (Registration API) is merged; unit tests can use seeded/mocked data. |
| **Users table schema change** | If registration changes the schema (e.g., renames `password_hash`), login will break. | Coordinate schema changes across both issues. |

### Requirement Gaps

| Gap | Description |
|-----|-------------|
| **Token expiry duration** | No expiry duration specified. Requires confirmation. |
| **Rate limiting** | No mention of brute-force protection or rate limiting on the login endpoint. |
| **Account lockout** | No specification for locking accounts after N failed attempts. |
| **Logging/auditing** | No mention of logging successful/failed login attempts for security auditing. |

---

## Approval Questions

1. **Token Expiry:** What should the JWT access token expiry duration be? (e.g., 15 minutes, 1 hour, 24 hours?)
2. **Rate Limiting:** Should the `POST /auth/login` endpoint have rate limiting to prevent brute-force attacks?
3. **Account Lockout:** Should accounts be temporarily locked after a number of consecutive failed login attempts?
4. **Audit Logging:** Should successful and failed login attempts be logged for security auditing purposes?
5. **JWT Algorithm:** Should the JWT be signed with `HS256` (symmetric, shared secret) or `RS256` (asymmetric, public/private key pair)?
6. **Response Envelope:** Should the success response only return `{ token }`, or should it also include user details (e.g., `userId`, `email`, `role`)?

---

## Definition of Done

- [ ] `POST /auth/login` endpoint is implemented and registered in the router.
- [ ] Valid credentials return `200 OK` with a signed JWT access token.
- [ ] Invalid credentials (wrong password or non-existent email) return `401 Unauthorized` with a **generic** error message.
- [ ] Missing fields return `400 Bad Request` with per-field validation details.
- [ ] Password comparison uses the **same hashing strategy** as the Registration API.
- [ ] JWT payload includes at minimum: `userId`, `email`, `iat`, `exp`.
- [ ] JWT secret is loaded from environment variables (not hardcoded).
- [ ] All unit tests pass (≥ 8 unit test cases).
- [ ] All integration tests pass (≥ 7 integration test cases).
- [ ] No passwords appear in any API response or server log.
- [ ] `401` response does not distinguish between "email not found" and "wrong password".
- [ ] Code reviewed and approved.
- [ ] Plan file saved at `docs/issue-20-plan.md`.
- [ ] Issue #20 labelled as **Ready for Development**.

---

## Final Recommendation

> ⚠️ **Requires Clarification before full implementation.**

The core implementation can begin (route, controller, service, validation), but the following must be confirmed before finalizing:

- JWT token expiry duration.
- Whether rate limiting is required.
- Success response payload shape (token only vs. token + user info).

The endpoint is otherwise **well-defined** and unblocked at the code level once the Registration API dependency is confirmed merged.

---

*Plan generated on: 2026-06-26*
*Repository: aayushiraii/adlc-agent-workflow*
*Issue: [#20 — Implement User Login API Endpoint](https://github.com/aayushiraii/adlc-agent-workflow/issues/20)*
