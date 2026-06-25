# Issue Plan

## Issue Number

**#1 — Define Requirements for User Registration and Login**

- **Repository:** `aayushiraii/adlc-agent-workflow`
- **ADLC Phase:** Requirement Analysis
- **Assigned Agent:** Requirements Analyst Agent
- **Labels:** `requirement-analysis` · `authentication` · `high-priority`
- **Sprint:** Sprint 1 (Week 1)
- **Story Points:** 3 SP
- **Priority:** 🔴 High
- **GitHub Issue:** https://github.com/aayushiraii/adlc-agent-workflow/issues/1

---

## Objective

Analyze and produce a comprehensive, stakeholder-approved requirements document covering every aspect of the **User Registration and Login** module for the Food Delivery Platform.

This document will serve as the **single source of truth** for the Backend Authentication Service (#6), the Frontend Auth Screens (#7), and all downstream security and session-management decisions across the platform.

---

## Scope

### ✅ In Scope

| Area | Details |
|------|---------|
| **Registration Flow** | Email/password sign-up, profile field collection, email verification |
| **Login Flow** | Email/password login, remember-me, session handling |
| **Social OAuth** | Google OAuth (MVP); Facebook OAuth (stretch goal) |
| **Password Management** | Forgot password, reset-password via email link |
| **Session & Token Strategy** | JWT access token + refresh token rotation |
| **Field Validation Rules** | Client-side and server-side validation for all input fields |
| **Security Constraints** | Rate limiting, account lockout, brute-force protection |
| **Edge Cases** | Duplicate email, expired token, unverified account login attempt |
| **Non-Functional Requirements** | Latency, availability, and compliance notes for auth endpoints |

### ❌ Out of Scope

- Two-factor authentication (2FA) — deferred post-MVP
- Biometric authentication — deferred post-MVP
- Enterprise SSO / SAML — not required
- Admin/restaurant-owner auth flows — separate issue

---

## Tasks

### Phase 1 — Discovery & Research *(Day 1)*

| # | Task | Description | Owner |
|---|------|-------------|-------|
| 1.1 | Stakeholder interview prep | Prepare a questionnaire covering auth methods, field requirements, session policy, and security constraints | Requirements Analyst Agent |
| 1.2 | Review industry standards | Reference OWASP Authentication Cheat Sheet and NIST SP 800-63B for password and session guidelines | Requirements Analyst Agent |
| 1.3 | Review OAuth provider docs | Review Google Identity Platform and Facebook Login API scopes and callback requirements | Requirements Analyst Agent |

---

### Phase 2 — Requirements Drafting *(Day 2–3)*

| # | Task | Description | Owner |
|---|------|-------------|-------|
| 2.1 | Document user profile fields | Define all required and optional fields: name, email, phone, password, profile photo | Requirements Analyst Agent |
| 2.2 | Document registration flow | Step-by-step flow from sign-up form submission to account activation | Requirements Analyst Agent |
| 2.3 | Document login flow | Email/password login, session issuance, remember-me toggle behavior | Requirements Analyst Agent |
| 2.4 | Document OAuth flow | Google OAuth consent → callback → user record creation or linking | Requirements Analyst Agent |
| 2.5 | Document password reset flow | Forgot-password → email link → token validation → new password → confirmation | Requirements Analyst Agent |
| 2.6 | Define password policy | Minimum length, character classes, blacklisted common passwords | Requirements Analyst Agent |
| 2.7 | Define session & token strategy | JWT access token TTL, refresh token TTL, rotation policy, storage recommendation | Requirements Analyst Agent |
| 2.8 | Define validation rules | Per-field validation: format, length, required/optional, regex patterns | Requirements Analyst Agent |
| 2.9 | Capture security constraints | Rate limiting thresholds, lockout rules, HTTPS enforcement, CORS policy | Requirements Analyst Agent |
| 2.10 | Capture edge cases | Duplicate email, unverified login, expired reset link, OAuth email collision | Requirements Analyst Agent |

---

### Phase 3 — Review & Sign-Off *(Day 4–5)*

| # | Task | Description | Owner |
|---|------|-------------|-------|
| 3.1 | Internal review | Technical lead reviews document for completeness and accuracy | Tech Lead |
| 3.2 | Stakeholder review session | Present requirements doc to stakeholders; collect and incorporate feedback | Requirements Analyst Agent |
| 3.3 | Final revision | Address all review comments and produce the final approved document | Requirements Analyst Agent |
| 3.4 | Stakeholder sign-off | Obtain written/digital approval from stakeholders | Product Owner |
| 3.5 | Publish to repository | Commit final requirements document to `docs/` in the repository | Requirements Analyst Agent |

---

## Detailed Requirements Specification

### 1. User Profile Fields

| Field | Type | Required | Validation Rules |
|-------|------|:--------:|-----------------|
| `first_name` | String | ✅ | 2–50 characters, letters only |
| `last_name` | String | ✅ | 2–50 characters, letters only |
| `email` | String | ✅ | Valid email format (RFC 5322); must be unique |
| `phone_number` | String | ⚠️ Optional | E.164 format (e.g., +1XXXXXXXXXX) |
| `password` | String | ✅ (email/password only) | See Password Policy below |
| `profile_photo` | URL | ❌ Optional | JPEG/PNG, max 5 MB |
| `date_of_birth` | Date | ❌ Optional | YYYY-MM-DD; user must be ≥ 13 years old |

---

### 2. Authentication Methods

| Method | MVP | Notes |
|--------|:---:|-------|
| Email + Password | ✅ | Primary auth method |
| Google OAuth 2.0 | ✅ | Scopes: `openid`, `profile`, `email` |
| Facebook OAuth | ⚠️ | Stretch goal; deferred post-MVP |
| Phone OTP | ❌ | Post-MVP |
| Two-Factor Authentication (2FA) | ❌ | Post-MVP |

---

### 3. Registration Flow

```
User submits registration form
        │
        ▼
Server validates all input fields
        │
        ├── Validation fails ──► Return 400 with field-level errors
        │
        ▼
Check for duplicate email in database
        │
        ├── Duplicate found ──► Return 409 Conflict
        │
        ▼
Hash password with bcrypt (cost factor ≥ 12)
        │
        ▼
Create user record (status: UNVERIFIED)
        │
        ▼
Send email verification link (expires in 24 hours)
        │
        ▼
Return 201 Created + prompt user to verify email
        │
        ▼
User clicks verification link
        │
        ▼
Token validated → User status updated to VERIFIED
        │
        ▼
Redirect to login screen with success message
```

---

### 4. Login Flow

```
User submits login form (email + password)
        │
        ▼
Validate input fields
        │
        ├── Validation fails ──► Return 400
        │
        ▼
Look up user record by email
        │
        ├── Not found ──► Return 401 (generic "Invalid credentials")
        │
        ▼
Check account lockout status
        │
        ├── Locked ──► Return 423 + lockout expiry time
        │
        ▼
Compare submitted password with stored bcrypt hash
        │
        ├── Mismatch ──► Increment failed attempt counter
        │              ├── < 5 attempts: Return 401
        │              └── ≥ 5 attempts: Lock account for 15 minutes
        │
        ▼
Check email verification status
        │
        ├── Unverified ──► Return 403 + resend verification option
        │
        ▼
Reset failed attempt counter
        │
        ▼
Issue JWT access token (TTL: 15 minutes)
Issue refresh token (TTL: 7 days, stored in httpOnly cookie)
        │
        ▼
Return 200 + access token in response body
```

---

### 5. Google OAuth Flow

```
User clicks "Continue with Google"
        │
        ▼
Redirect to Google OAuth consent screen
        │
        ▼
User grants permission
        │
        ▼
Google redirects to /auth/google/callback with auth code
        │
        ▼
Server exchanges auth code for Google ID token
        │
        ▼
Decode ID token → extract email, name, profile photo
        │
        ▼
Look up user by email in database
        │
        ├── User exists (email/password account)
        │       └── Link Google OAuth to existing account → Issue tokens
        │
        └── New user
                └── Create user record (status: VERIFIED — email trusted from Google)
                        └── Issue tokens → Redirect to home
```

---

### 6. Password Reset Flow

```
User submits "Forgot Password" form with email
        │
        ▼
Look up email in database
        │
        ├── Not found ──► Return 200 (do NOT reveal whether email exists)
        │
        ▼
Generate signed reset token (expires in 1 hour)
        │
        ▼
Send password reset email with link: /auth/reset-password?token=<token>
        │
        ▼
User clicks link → Frontend renders new-password form
        │
        ▼
User submits new password
        │
        ▼
Server validates token (not expired, not already used)
        │
        ├── Invalid/expired ──► Return 400 + prompt to request new link
        │
        ▼
Validate new password against password policy
        │
        ▼
Hash new password and update user record
        │
        ▼
Invalidate all existing refresh tokens for this user
        │
        ▼
Return 200 + redirect to login screen with success message
```

---

### 7. Password Policy

| Rule | Requirement |
|------|-------------|
| Minimum length | 8 characters |
| Maximum length | 128 characters |
| Required character classes | At least 1 uppercase, 1 lowercase, 1 digit, 1 special character (`!@#$%^&*`) |
| Blacklisted passwords | Block top 10,000 common passwords (e.g., `password123`, `qwerty`) |
| Password hashing algorithm | bcrypt with cost factor ≥ 12 |
| Password reuse | New password must not match the last 3 passwords |

---

### 8. Session & Token Strategy

| Token | TTL | Storage | Rotation |
|-------|-----|---------|----------|
| JWT Access Token | 15 minutes | Response body (memory/state) | Issued on every login and refresh |
| Refresh Token | 7 days | `httpOnly`, `Secure`, `SameSite=Strict` cookie | Rotated on every use (refresh token rotation) |
| Email Verification Token | 24 hours | Database (hashed) | Single-use |
| Password Reset Token | 1 hour | Database (hashed) | Single-use |

---

### 9. Security Constraints

| Constraint | Specification |
|------------|--------------|
| Rate limiting (auth endpoints) | Max 10 requests/minute per IP on `/auth/login`, `/auth/register`, `/auth/forgot-password` |
| Account lockout | Lock account for 15 minutes after 5 consecutive failed login attempts |
| HTTPS enforcement | All auth endpoints must be served over HTTPS only |
| CORS policy | Restrict to known frontend origins; reject wildcard `*` for auth routes |
| Token invalidation on logout | Refresh token must be revoked and blacklisted on `POST /auth/logout` |
| Secure headers | `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options` must be set |

---

### 10. Edge Cases

| Edge Case | Expected Behavior |
|-----------|------------------|
| Duplicate email on registration | Return `409 Conflict` with message: "An account with this email already exists." |
| Login attempt on unverified account | Return `403 Forbidden` with a link to resend verification email |
| Expired email verification link | Prompt user to request a new verification email |
| OAuth login with email already registered via email/password | Link the OAuth identity to the existing account; do not create duplicate |
| Password reset link already used | Return `400 Bad Request`: "This reset link has already been used." |
| Expired password reset token | Return `400 Bad Request`: "This reset link has expired. Please request a new one." |
| Account locked due to failed attempts | Return `423 Locked` with remaining lockout time in the response |
| Refresh token used after logout | Return `401 Unauthorized`: "Token has been revoked." |
| Concurrent logins from multiple devices | Allow; each device holds its own refresh token |

---

## Dependencies

| Dependency | Type | Notes |
|------------|------|-------|
| None | — | This issue has **no blocking dependencies** and can begin immediately on Day 1 of Sprint 1 |

### Issues Blocked by This Issue

| Issue | Title | Blocked Until |
|-------|-------|--------------|
| #4 | Design System Architecture and Database Schema | #1, #2, #3 all complete |
| #6 | Implement Backend User Authentication Service | #4 complete |
| #7 | Implement Frontend User Registration and Login Screens | #5, #6 complete |

---

## Risks

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|:----------:|:------:|---------------------|
| Stakeholder unavailability for sign-off delays sprint | 🟡 Medium | 🔴 High | Schedule sign-off meeting on Day 1; get a calendar block confirmed before work begins |
| Scope creep — requests to add 2FA or phone OTP mid-sprint | 🟡 Medium | 🟡 Medium | Document as post-MVP; defer to a future issue explicitly; update backlog |
| Ambiguity on OAuth scope — Google only vs. Google + Facebook | 🟢 Low | 🟡 Medium | Resolve in stakeholder interview on Day 1; default to Google-only for MVP |
| Security policy disagreement (token TTL, lockout thresholds) | 🟢 Low | 🟡 Medium | Reference OWASP and NIST guidelines as the baseline; let stakeholders override with justification |
| Requirements document not specific enough for dev team | 🟢 Low | 🔴 High | Use the field tables, flow diagrams, and edge-case tables in this plan as the required level of detail |

---

## Story Points

**Estimate: 3 Story Points**

| Factor | Assessment |
|--------|-----------|
| Complexity | Low — well-understood domain (auth/registration) with clear industry standards |
| Effort | Medium — requires structured documentation, stakeholder alignment, and edge-case analysis |
| Risk | Low — no external integrations or technical unknowns at the requirements phase |
| Uncertainty | Low — assumptions are clearly defined (JWT, bcrypt, Google OAuth) |

---

## Acceptance Criteria

- [ ] All required user data fields are documented with type, required/optional status, and validation rules.
- [ ] Both auth methods (email/password and Google OAuth) are fully specified with step-by-step flows.
- [ ] Password policy is defined (length, complexity, hashing algorithm, reuse rules).
- [ ] Session and token strategy is documented (JWT access token TTL, refresh token TTL, storage, rotation).
- [ ] Security constraints are specified (rate limiting, lockout, HTTPS, CORS, secure headers).
- [ ] All edge cases are captured with expected system behaviors.
- [ ] Non-functional requirements (latency, availability) for auth endpoints are noted.
- [ ] Document is reviewed by the technical lead.
- [ ] Stakeholder sign-off is obtained and recorded.

---

## Questions for Approval

The following questions must be resolved before or during Day 1 of Sprint 1:

| # | Question | Impact if Unresolved |
|---|----------|----------------------|
| Q1 | Is **Facebook OAuth** in scope for MVP, or is Google-only the MVP target? | Scope of #6 (Backend Auth) and #7 (Frontend Auth) |
| Q2 | Is **phone number** a mandatory registration field or optional? | User model schema in #4; validation logic in #6 |
| Q3 | What are the desired **JWT access token** and **refresh token TTL** values? (Defaults proposed: 15 min / 7 days) | Security posture and UX (session length) |
| Q4 | Should **email verification** be mandatory before the first login, or can users log in immediately after registration? | Registration and login flow logic in #6 |
| Q5 | What is the **account lockout policy**? (Default proposed: 5 failed attempts → 15-minute lock) | Security and UX tradeoff |
| Q6 | Is **2FA (two-factor authentication)** required for MVP, or deferred post-launch? | Scope; if required, story points increase significantly |
| Q7 | Are there any **compliance requirements** (e.g., GDPR, CCPA) affecting user data collection or storage? | Privacy policy, data retention, and right-to-erasure requirements |

---

## Final Recommendation

✅ **Proceed with Issue #1 in Sprint 1, Week 1 — starting Day 1.**

### Rationale

- Issue #1 has **no dependencies** and is immediately actionable.
- It sits on the **critical path** — its completion, along with #2 and #3, directly unblocks the system architecture and database schema work in #4, which in turn gates the entire development phase.
- The requirements domain (user auth) is **well-understood**, making this a low-risk, high-value deliverable.
- A 3 SP estimate is appropriate given the scope — the bulk of effort is structured documentation and stakeholder alignment, not technical implementation.

### Execution Recommendation

| Action | Detail |
|--------|--------|
| Start Date | Day 1 of Sprint 1 (2026-06-25) |
| Target Completion | Day 5 of Sprint 1 (2026-06-29) |
| Parallel Execution | Run concurrently with #2 and #3 |
| Sign-off Deadline | End of Day 5 — must not slip to Week 2 |
| Output Artifact | `docs/requirements-auth.md` committed to repository |

---

*Generated by Sprint Planning Agent on 2026-06-25 · Issue #1 · Repository: `aayushiraii/adlc-agent-workflow`*
