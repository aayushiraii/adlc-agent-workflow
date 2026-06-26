# Implementation Plan — Issue #7
# Implement Frontend User Registration and Login Screens

---

## Issue Summary

| Field | Details |
|---|---|
| **Issue Number** | #7 |
| **Title** | Implement Frontend User Registration and Login Screens |
| **Priority** | High |
| **ADLC Phase** | Development |
| **Labels** | `development`, `frontend`, `authentication`, `high-priority` |
| **Dependencies** | #5 — Design UX Flows and UI Wireframes for All App Screens, #6 — Implement Backend User Authentication Service (Register, Login, OAuth) |
| **State** | Open |

---

## Objective

This issue aims to build the complete **frontend authentication experience** for the food delivery platform — covering user registration, login, social OAuth (Google), and password reset/forgot password flows. The implementation includes pixel-accurate screen rendering per approved Figma designs, robust client-side form validation with inline error feedback, secure auth token storage and transmission, and a protected route system that redirects unauthenticated users to the login screen.

---

## Phase 1 — Requirement Analysis

### Functional Requirements

**Registration Screen**
- Fields: Full name, email address, phone number, password, confirm password.
- Terms & Conditions checkbox — required before submission.
- Submit CTA triggers API call to `POST /api/v1/auth/register`.
- On success: redirect to email/OTP verification screen or directly to home (to be confirmed).
- On failure: display server-returned error message inline (e.g., "Email already in use").

**Login Screen**
- Fields: Email address, password.
- "Forgot Password?" link navigates to the forgot password flow.
- Submit CTA triggers API call to `POST /api/v1/auth/login`.
- On success: store auth tokens securely, redirect to home screen.
- On failure: display inline error message (e.g., "Invalid credentials").
- Social login button(s) — at minimum Google OAuth; Apple TBC.

**Forgot Password Screen**
- Field: Email address.
- Submit CTA triggers API call to send password reset link/OTP.
- On success: display confirmation message ("Check your inbox").
- On failure: display inline error (e.g., "Email not registered").

**Reset Password Screen**
- Fields: New password, confirm new password.
- Accessible via reset link/token received by email.
- Submit CTA triggers API call with reset token and new password.
- On success: redirect to login screen with success toast.
- On failure: display inline error (e.g., "Reset link expired").

**OTP / Email Verification Screen**
- 6-digit OTP input.
- Resend OTP button with countdown timer (e.g., 30 seconds cooldown).
- Submit CTA triggers API call to verify OTP.
- On success: redirect to home screen.
- On failure: display inline error (e.g., "Invalid or expired OTP").

**OAuth — Google Login**
- Google login button initiates OAuth redirect or popup flow.
- On successful Google callback: receive token, store securely, redirect to home.
- On OAuth failure/cancellation: display user-friendly error message.

**Protected Route Management**
- All routes except login, register, forgot password, and reset password must be protected.
- Unauthenticated users accessing protected routes must be redirected to the login screen.
- After login, user must be redirected back to the originally requested route (redirect-after-login pattern).
- Auth state must be initialized on app load by validating the stored token.

**Token Management**
- Access tokens must be stored in **httpOnly cookies** (web) or **secure storage** (React Native mobile).
- Access token must be attached to all authenticated API requests via an HTTP interceptor.
- On 401 response: attempt silent token refresh via `POST /api/v1/auth/refresh`.
- On refresh failure: clear tokens, redirect user to login screen.

### Business Rules
- Passwords must meet a minimum strength requirement — to be confirmed (e.g., minimum 8 characters, at least one uppercase, one number, one special character).
- Email addresses must be validated in standard format (RFC 5322).
- Phone numbers must be validated for format (national or international — format to be confirmed).
- The Terms & Conditions checkbox must be checked before the registration form can be submitted.
- All form fields must show **inline validation errors** on blur (field exit) and on form submit attempt.
- Auth tokens must never be stored in `localStorage` or `sessionStorage` on web (XSS vulnerability).

### Constraints
- Implementation must follow the approved Figma designs from **Issue #5** pixel-accurately.
- Backend API contracts from **Issue #6** must be finalized and available before frontend integration.
- Token storage strategy is pre-decided: **httpOnly cookies** for web, **secure storage** for React Native mobile.
- The implementation must cover both **React (web)** and **React Native (mobile)** platforms unless explicitly scoped to one.
- No custom auth logic should be implemented — all authentication operations must go through the backend Auth Service from Issue #6.

---

## Phase 2 — Design

### Component Architecture

**Page / Screen Components**
- `RegisterScreen` — Full registration form page
- `LoginScreen` — Login form page with social login
- `ForgotPasswordScreen` — Email input for password reset request
- `ResetPasswordScreen` — New password input (accessed via email link with token)
- `OTPVerificationScreen` — OTP input with resend timer

**Reusable UI Components**
- `TextInput` — Generic input with label, value, onChange, error message, and touched state props
- `PasswordInput` — TextInput variant with show/hide toggle
- `PhoneInput` — TextInput variant with country code selector
- `OTPInput` — 6-cell auto-advance OTP input field
- `Button` — Primary, secondary, outline, and loading state variants
- `SocialLoginButton` — Branded Google (and Apple TBC) login button
- `FormErrorMessage` — Inline field-level error display component
- `Toast / SnackBar` — Global success/error notification component
- `ProtectedRoute` — HOC or wrapper component enforcing authentication
- `CountdownTimer` — Resend OTP timer component

### State Management Design
- **Auth State** — Global state slice (e.g., Redux Toolkit or Zustand) storing: `user`, `isAuthenticated`, `isLoading`, `error`.
- **Form State** — Local component state managed via `react-hook-form` or `Formik` with schema-based validation (Yup or Zod).
- **Token State** — Tokens are not stored in JS memory or state; they are managed via httpOnly cookies (web) or secure storage (mobile). Auth state is hydrated on app load by calling a `/auth/me` or token validation endpoint.

### API Integration Design
- **API Client** — Axios instance with base URL configured from environment variable.
- **Auth Interceptor** — Request interceptor attaches CSRF token or cookie credentials; response interceptor handles 401 with silent refresh logic.
- **Auth Service Module** — Abstraction layer with functions: `register()`, `login()`, `logout()`, `refreshToken()`, `forgotPassword()`, `resetPassword()`, `verifyOTP()`, `googleOAuth()`.

### Routing Design (Web — React Router)

```
/register           → RegisterScreen (public)
/login              → LoginScreen (public)
/forgot-password    → ForgotPasswordScreen (public)
/reset-password     → ResetPasswordScreen (public, token in query param)
/verify-otp         → OTPVerificationScreen (public, post-registration)
/                   → HomeScreen (protected)
/restaurants        → RestaurantListingScreen (protected)
/* any protected    → Redirect to /login?redirect=<original-path>
```

### Routing Design (Mobile — React Native Navigation)

```
Auth Stack (unauthenticated):
  LoginScreen
  RegisterScreen
  ForgotPasswordScreen
  ResetPasswordScreen
  OTPVerificationScreen

App Stack (authenticated):
  HomeScreen
  ... (all other protected screens)

Root Navigator:
  Conditionally renders Auth Stack or App Stack based on isAuthenticated state
```

### Form Validation Schema

**Registration Form (Yup / Zod)**
- `fullName` — Required, minimum 2 characters
- `email` — Required, valid email format
- `phone` — Required, valid phone format (pattern TBC)
- `password` — Required, minimum 8 characters, must include uppercase, number, and special character
- `confirmPassword` — Required, must match `password`
- `termsAccepted` — Must be `true`

**Login Form**
- `email` — Required, valid email format
- `password` — Required, minimum 1 character (server validates credentials)

**Forgot Password Form**
- `email` — Required, valid email format

**Reset Password Form**
- `newPassword` — Required, same strength rules as registration
- `confirmNewPassword` — Required, must match `newPassword`

---

## Phase 3 — Implementation

### Setup Tasks
- Set up authentication-related folder structure: `/src/screens/auth/`, `/src/components/auth/`, `/src/services/auth/`, `/src/store/auth/`.
- Install and configure form management library (`react-hook-form` + `yup` or `zod`).
- Install and configure API client (Axios) with base URL from environment variables.
- Configure auth interceptor on the Axios instance for token attachment and 401 handling.
- Set up global auth state slice in the state management store (Redux Toolkit or Zustand).

### Screen Implementation Tasks
- Implement `RegisterScreen` — form fields, validation schema, submit handler, API integration, error display.
- Implement `LoginScreen` — form fields, validation schema, submit handler, API integration, error display, Google OAuth button.
- Implement `ForgotPasswordScreen` — email field, submit handler, success/error states.
- Implement `ResetPasswordScreen` — new password fields, token extraction from URL/deep link, submit handler.
- Implement `OTPVerificationScreen` — OTP input cells, resend countdown timer, submit handler.

### Component Implementation Tasks
- Implement `TextInput` component with label, error state, and touched-aware rendering.
- Implement `PasswordInput` component with show/hide toggle.
- Implement `OTPInput` component with auto-advance and backspace handling across cells.
- Implement `SocialLoginButton` for Google (and Apple if confirmed).
- Implement `ProtectedRoute` component/wrapper with redirect-after-login logic.
- Implement `CountdownTimer` component for OTP resend cooldown.
- Implement global `Toast / SnackBar` for success and error notifications.

### Auth Service Integration Tasks
- Implement `authService.register()` — calls `POST /api/v1/auth/register`.
- Implement `authService.login()` — calls `POST /api/v1/auth/login`, stores token.
- Implement `authService.logout()` — calls `POST /api/v1/auth/logout`, clears token state.
- Implement `authService.refreshToken()` — calls `POST /api/v1/auth/refresh`, updates stored token.
- Implement `authService.forgotPassword()` — calls forgot password endpoint.
- Implement `authService.resetPassword()` — calls reset password endpoint with token.
- Implement `authService.verifyOTP()` — calls OTP verification endpoint.
- Implement `authService.googleOAuth()` — initiates Google OAuth redirect or popup and handles callback token exchange.

### Token & Session Management Tasks
- Configure Axios to send cookies with every request (`withCredentials: true`) for httpOnly cookie-based auth.
- Implement app-load auth initialization — call `/auth/me` or token validate endpoint on startup; set `isAuthenticated` state accordingly.
- Implement silent token refresh in the Axios 401 response interceptor.
- Implement secure storage integration for React Native (e.g., `react-native-keychain` or `expo-secure-store`).

### Protected Route Tasks
- Implement `ProtectedRoute` wrapper for React web — wraps routes requiring authentication.
- Implement root navigator auth-state-based stack switching for React Native.
- Implement redirect-after-login — store `redirect` query param on redirect to login, restore after successful auth.

---

## Phase 4 — Testing

### Unit Tests
- Test registration form validation — empty fields, invalid email, weak password, mismatched passwords, unchecked T&C.
- Test login form validation — empty email, empty password, invalid email format.
- Test forgot password form — empty email, invalid email format.
- Test reset password form — weak password, mismatched passwords.
- Test OTP input — single cell input, auto-advance, backspace navigation.
- Test `CountdownTimer` — countdown from 30 to 0, resend button disabled during countdown, enabled after.
- Test `ProtectedRoute` — renders children when authenticated, redirects to login when unauthenticated.
- Test auth state slice — login action sets user and isAuthenticated, logout action clears state.

### Integration Tests
- Test full registration flow — fill form, submit, mock API success, verify redirect to OTP screen.
- Test full login flow — fill form, submit, mock API success, verify token stored and redirect to home.
- Test login failure — mock API 401 response, verify inline error message displayed.
- Test Google OAuth flow — click button, mock OAuth callback, verify token stored and redirect to home.
- Test forgot password flow — submit email, mock API success, verify success message displayed.
- Test reset password flow — submit new password, mock API success, verify redirect to login.
- Test OTP verification — submit OTP, mock API success, verify redirect to home.
- Test token refresh — mock 401 response, verify silent refresh called, verify original request retried.
- Test refresh failure — mock refresh 401, verify tokens cleared and redirect to login.

### Validation Scenarios
- User submits the registration form with all fields empty — all required field errors display inline.
- User enters a mismatched confirm password — error appears on blur of the confirm password field.
- User enters a weak password — strength requirement error is shown inline.
- User successfully registers — redirected to OTP/verification screen (or home, per confirmed flow).
- User logs in with valid credentials — redirected to home screen; subsequent API calls include auth token.
- User logs in with invalid credentials — error displayed inline, no redirect occurs.
- Unauthenticated user navigates to a protected route — redirected to `/login?redirect=<original-path>`.
- User logs in after being redirected — returned to the originally requested protected route.
- User's access token expires mid-session — silent refresh occurs transparently, user is not logged out.
- User's refresh token is expired/invalid — user is redirected to login screen with session-expired message.
- Google OAuth button clicked — Google login prompt opens; on success, user is authenticated and redirected to home.

---

## Risks

### Technical Risks
- **httpOnly cookie CORS configuration** — Requires precise CORS settings on the backend (`withCredentials`, `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials`). Misconfiguration leads to auth failures that are difficult to debug.
- **OAuth redirect handling on mobile** — Deep linking for OAuth callbacks on React Native requires platform-specific configuration (Android intent filters, iOS URL schemes) and can be fragile across OS versions.
- **Silent refresh race condition** — If multiple API calls fail with 401 simultaneously, multiple refresh requests may be dispatched. The interceptor must implement a queue/locking mechanism to prevent this.
- **Form library conflicts** — Mixing `react-hook-form` or `Formik` with custom components requires careful integration to avoid uncontrolled/controlled component warnings and validation trigger inconsistencies.
- **OTP input cross-platform behavior** — Building a multi-cell OTP input that handles auto-advance, backspace, and paste consistently across iOS, Android, and web requires platform-specific handling.

### Dependency Risks
- **Issue #5 (Designs)** — If the Figma designs are not fully approved or are revised after frontend implementation begins, screen components may need significant rework.
- **Issue #6 (Backend Auth Service)** — Frontend API integration cannot be finalized until backend endpoints (`/register`, `/login`, `/refresh`, `/oauth/google`, `/verify-otp`) are deployed and accessible. Development must proceed with mocked API responses if the backend is not ready.
- **Google OAuth credentials** — Google Cloud Console OAuth client ID and redirect URIs must be configured and provided before the OAuth integration can be tested in any environment.

### Requirement Gaps
- **Apple Sign-In** — It is not confirmed whether Apple OAuth is required. Apple mandates Sign In with Apple for iOS apps that offer any other social login, making this a compliance risk.
- **Password strength rules** — Exact password requirements (character types, minimum length) have not been defined; this affects validation schema and error messaging.
- **Phone number format** — Whether phone validation should support international format or a specific national format is not specified.
- **Post-registration flow** — It is unclear whether successful registration should redirect the user to OTP verification, or directly to the home screen without verification.
- **Session expiry UX** — The exact user-facing experience when a session expires (e.g., a modal, a toast, or a silent redirect) has not been defined.
- **"Remember me" functionality** — Whether a "remember me" option affecting token expiry is required is not mentioned.

---

## Approval Questions

1. **Apple Sign-In** — Is Sign In with Apple required? Apple's App Store guidelines mandate it for any iOS app offering third-party social login.
2. **Post-Registration Flow** — After successful registration, should the user be directed to an OTP/email verification screen, or can they proceed directly to the home screen?
3. **Password Rules** — What are the exact password strength requirements? (e.g., minimum 8 characters, at least one uppercase letter, one number, one special character)
4. **Phone Number Validation** — Should phone number validation support international format (e.g., +1-555-000-0000) or a specific national format?
5. **"Remember Me"** — Is a "Remember Me" option needed on the login screen that affects token/session duration?
6. **Session Expiry UX** — When a user's session expires mid-use, what should happen — a modal prompt to re-login, a silent redirect to the login page, or a toast notification?
7. **Platform Scope** — Is this issue scoped to **React web only**, **React Native mobile only**, or **both platforms** simultaneously?
8. **Google OAuth Flow Type** — Should Google login use a **redirect flow** (full-page redirect to Google) or a **popup flow** (modal window) on web?
9. **Backend Availability** — Is the backend Auth Service from Issue #6 expected to be available for integration testing, or should the frontend be developed against mock/stub API responses?
10. **Design Availability** — Have the auth screen designs from Issue #5 been fully approved and are they ready for developer handoff?

---

## Final Recommendation

> **Status: Blocked by Dependencies**

This issue has two direct dependencies that must be resolved before full implementation can begin:

- **Issue #5** (Figma designs) — Auth screen designs must be approved and handed off before pixel-accurate implementation can start.
- **Issue #6** (Backend Auth Service) — API endpoints must be deployed or mocked with accurate contracts before frontend integration and end-to-end testing can occur.

Additionally, several **requirement gaps** — particularly around Apple Sign-In compliance, post-registration flow, password strength rules, and platform scope — must be clarified to avoid rework. Once both dependencies are resolved and the approval questions above are answered, this issue will be fully **Ready for Development**.

---

*Plan approved and generated on 2026-06-26 by Sprint Planning Agent.*
*Approved by: Raj Sanghvi (hello@bitcot.ai)*
