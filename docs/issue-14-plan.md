# Implementation Plan — Issue #14

---

## 1. Issue Summary

| Field | Details |
|---|---|
| **Issue Number** | #14 |
| **Title** | Write and Execute Backend Unit and Integration Tests |
| **Priority** | 🔴 High |
| **ADLC Phase** | Testing |
| **Labels** | `testing`, `high-priority`, `backend` |
| **Dependencies** | #6 — Implement Backend User Authentication Service · #8 — Implement Backend Restaurant and Menu APIs · #10 — Implement Backend Cart Management, Order Placement, and Payment Integration · #12 — Implement Backend Real-Time Order Tracking and Order Cancellation |
| **Assigned Agent** | QA Testing Agent |

---

## 2. Objective

Establish comprehensive, automated test coverage across all backend services — authentication, restaurant and menu APIs, cart management, order placement, payment integration, and real-time order tracking and cancellation. This encompasses unit tests for all service-layer business logic, API integration tests for all endpoints covering happy paths and edge cases, Stripe payment flow tests in test mode, and cancellation boundary condition tests. The outcome must achieve a minimum of **80% code coverage** across all backend services and deliver a fully passing test suite integrated into the CI pipeline.

---

## 3. Phase 1 — Requirement Analysis

### Functional Requirements

**Test Scope — Domains**

| Domain | Source Issue | Services / Modules to Test |
|---|---|---|
| Authentication | #6 | `AuthService`, `JwtService`, `OAuthService`, `UserService` |
| Restaurant & Menu | #8 | `RestaurantService`, `MenuService`, `CategoryService` |
| Cart Management | #10 | `CartService`, `PriceCalculator`, `CouponService` |
| Order Placement | #10 | `OrderService`, `StripeService.createPaymentIntent` |
| Payment Webhooks | #10 | `WebhookHandler`, `StripeService` |
| Order Tracking | #12 | `OrderQueryService`, `OrderEventsService`, `OrderGateway` |
| Order Cancellation | #12 | `OrderCancellationService`, `StripeService.createRefund` |

**Test Types Required**
- **Unit Tests** — Test service-layer business logic in isolation using mocked dependencies.
- **Integration Tests** — Test complete API request-response cycles using a real test database and Supertest.
- **API Contract Tests** — Validate that all endpoints return the correct HTTP status codes, response shapes, and error formats.
- **Stripe Payment Tests** — Test payment intent creation, webhook event handling, and refund initiation using Stripe test mode and Stripe CLI.

**Coverage Requirement**
- Minimum **80% code coverage** across all backend services — statements, branches, functions, and lines.
- Coverage report must be generated and published in CI for every pipeline run.

### Business Rules
- Tests must use a **dedicated test database** — never run integration tests against a staging or production database.
- Stripe interactions must use **Stripe test mode** exclusively — no live Stripe keys in any test environment.
- Webhook tests must use **Stripe CLI** (`stripe trigger`) or pre-recorded Stripe event payloads to simulate webhook delivery.
- All tests must be **idempotent** — each test must set up its own state and clean up after itself.
- Unit tests must mock all **external dependencies** (database, Stripe SDK, mailer, etc.) — no real I/O in unit tests.
- Tests must be **deterministic** — no flakiness caused by timing, network calls, or shared mutable state.

### Constraints
- Test framework: **Jest** (unit and integration tests).
- HTTP testing: **Supertest**.
- Payment testing: **Stripe test mode** with Stripe test card numbers.
- CI pipeline integration is a hard acceptance criterion — all tests must pass in CI.
- Test suite must complete in a **reasonable execution time** — use parallelisation where possible.

---

## 4. Phase 2 — Design

### Architecture Decisions

- Organise tests into **co-located test files** alongside source files (`*.spec.ts` / `*.test.ts`) for unit tests, and a dedicated `test/` or `e2e/` directory for integration tests.
- Use **Jest projects** or separate Jest config files to run unit and integration test suites independently (unit: in-memory mocks; integration: test DB).
- Set up a **test database** using the same ORM/migration system as production — run migrations on test DB before the integration suite; truncate tables between tests.
- Use **Jest `beforeEach` / `afterEach`** hooks for per-test state setup and teardown; use **`beforeAll` / `afterAll`** for database seeding and teardown at suite level.
- Mock the **Stripe SDK** in unit tests using `jest.mock('stripe')`; use **Stripe test mode** with real Stripe test API keys in integration tests.
- Use **Stripe CLI** (`stripe listen --forward-to localhost:PORT/webhooks/stripe`) or pre-recorded event JSON payloads to test webhook handling in integration tests.
- Generate **Jest coverage reports** in `lcov` and `text-summary` formats; publish to CI artefacts and optionally to a coverage reporting service (e.g., Codecov).
- Use **factory functions or fixtures** to generate consistent, reusable test data (users, restaurants, menu items, carts, orders).

### Test Data Strategy

```ts
// Example factory pattern
UserFactory.create({ email: 'test@example.com', role: 'customer' });
RestaurantFactory.create({ name: 'Test Restaurant', isActive: true });
MenuItemFactory.create({ restaurantId, price: 12.99, isAvailable: true });
CartFactory.create({ userId, items: [{ menuItemId, quantity: 2 }] });
OrderFactory.create({ userId, status: 'confirmed', stripePaymentIntentId: 'pi_test_xxx' });
```

### Jest Configuration

```ts
// jest.config.ts (unit tests)
{
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: { /* path aliases */ },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.module.ts', '!src/main.ts'],
  coverageThreshold: { global: { lines: 80, branches: 80, functions: 80, statements: 80 } }
}

// jest.integration.config.ts (integration tests)
{
  testMatch: ['**/*.integration.spec.ts'],
  globalSetup: './test/setup.ts',      // run DB migrations
  globalTeardown: './test/teardown.ts' // drop test DB
}
```

### CI Pipeline Integration

```yaml
# Example CI steps
- name: Run Unit Tests
  run: npx jest --config jest.config.ts --coverage

- name: Run Integration Tests
  run: npx jest --config jest.integration.config.ts
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
    STRIPE_SECRET_KEY: ${{ secrets.STRIPE_TEST_SECRET_KEY }}
    STRIPE_WEBHOOK_SECRET: ${{ secrets.STRIPE_TEST_WEBHOOK_SECRET }}

- name: Upload Coverage Report
  uses: codecov/codecov-action@v3
```

### Key Test Modules

| Test Module | Type | Tools |
|---|---|---|
| `auth.service.spec.ts` | Unit | Jest, bcrypt mock, JWT mock |
| `auth.integration.spec.ts` | Integration | Supertest, test DB |
| `restaurant.service.spec.ts` | Unit | Jest |
| `restaurant.integration.spec.ts` | Integration | Supertest, test DB |
| `cart.service.spec.ts` | Unit | Jest, DB mock |
| `cart.integration.spec.ts` | Integration | Supertest, test DB |
| `price-calculator.spec.ts` | Unit | Jest |
| `coupon.service.spec.ts` | Unit | Jest |
| `order.service.spec.ts` | Unit | Jest, Stripe mock |
| `order.integration.spec.ts` | Integration | Supertest, test DB, Stripe test mode |
| `stripe.service.spec.ts` | Unit | Jest, Stripe SDK mock |
| `webhook.handler.spec.ts` | Unit | Jest, raw payload fixtures |
| `webhook.handler.integration.spec.ts` | Integration | Supertest, Stripe CLI / fixtures |
| `order-cancellation.service.spec.ts` | Unit | Jest, Stripe mock |
| `order-cancellation.integration.spec.ts` | Integration | Supertest, test DB, Stripe test mode |
| `order-query.service.spec.ts` | Unit | Jest, DB mock |
| `order-events.service.spec.ts` | Unit | Jest, Socket.io mock |
| `order-gateway.spec.ts` | Unit | Jest, Socket.io mock |

---

## 5. Phase 3 — Implementation

### Testing Tasks — Authentication (Issue #6)

**Unit Tests — `AuthService`**
- [ ] `register`: Verify new user is created with hashed password; verify duplicate email returns conflict error.
- [ ] `login`: Verify correct credentials return a signed JWT; verify incorrect password returns unauthorized error.
- [ ] `refreshToken`: Verify valid refresh token returns new access token; verify expired/invalid token returns unauthorized.
- [ ] `logout`: Verify refresh token is invalidated on logout.
- [ ] `validateOAuthUser`: Verify OAuth user is created if not exists; verify existing OAuth user is returned without duplication.

**Integration Tests — Auth Endpoints**
- [ ] `POST /auth/register` — happy path, duplicate email, missing fields, invalid email format.
- [ ] `POST /auth/login` — happy path, wrong password, non-existent user.
- [ ] `POST /auth/refresh` — happy path, expired token, tampered token.
- [ ] `GET /auth/google` — verify OAuth redirect initiates correctly.
- [ ] Protected route access — verify `401` for missing token, `401` for expired token, `200` for valid token.

---

### Testing Tasks — Restaurant & Menu APIs (Issue #8)

**Unit Tests — `RestaurantService` / `MenuService`**
- [ ] `getRestaurants`: Verify list is filtered by active status, location radius, and category.
- [ ] `getRestaurantById`: Verify correct restaurant is returned; verify `404` for non-existent ID.
- [ ] `getMenuByRestaurant`: Verify menu items are grouped by category; verify unavailable items are excluded.
- [ ] `getMenuItemById`: Verify correct item is returned; verify `404` for non-existent item.

**Integration Tests — Restaurant & Menu Endpoints**
- [ ] `GET /restaurants` — happy path with filters, empty result set, invalid filter params.
- [ ] `GET /restaurants/:id` — happy path, non-existent ID.
- [ ] `GET /restaurants/:id/menu` — happy path, restaurant with no menu items.
- [ ] `GET /menu/:id` — happy path, non-existent item ID.

---

### Testing Tasks — Cart Management (Issue #10)

**Unit Tests — `CartService` / `PriceCalculator` / `CouponService`**
- [ ] `PriceCalculator.compute`: Verify subtotal, tax, delivery fee, and total for various cart configurations including zero-item cart, single item, multiple items, and with/without coupon.
- [ ] `CartService.addItem`: Verify item is added; verify new cart is created if none exists; verify menu item existence is validated.
- [ ] `CartService.updateItem`: Verify quantity is updated; verify item is removed when quantity reaches 0.
- [ ] `CartService.removeItem`: Verify item is removed; verify `403` when attempting to remove another user's item.
- [ ] `CartService.applyCoupon`: Verify valid coupon applies correct discount; verify expired coupon is rejected; verify invalid code returns error.
- [ ] `CartService.getCart`: Verify cart is returned with recomputed totals.

**Integration Tests — Cart Endpoints**
- [ ] `POST /cart/add` — happy path, invalid menu item ID, unauthenticated request.
- [ ] `PUT /cart/update` — happy path, quantity = 0 (auto-remove), non-existent cart item.
- [ ] `DELETE /cart/item/:id` — happy path, cross-user item deletion attempt (`403`).
- [ ] `GET /cart` — happy path, empty cart.
- [ ] `POST /cart/coupon` — valid coupon, expired coupon, invalid code.

---

### Testing Tasks — Order Placement & Payment (Issue #10)

**Unit Tests — `OrderService` / `StripeService`**
- [ ] `OrderService.createOrder`: Verify order is created with correct status (`pending`); verify price snapshot is taken at order time; verify cart is not cleared before payment confirmation; verify empty cart returns error.
- [ ] `StripeService.createPaymentIntent`: Verify correct amount, currency, and metadata are passed to Stripe SDK (mocked); verify error is thrown on Stripe failure.

**Unit Tests — `WebhookHandler`**
- [ ] `payment_intent.succeeded`: Verify order status updated to `confirmed`; verify cart is cleared.
- [ ] `payment_intent.payment_failed`: Verify order remains in `pending` state.
- [ ] `payment_intent.canceled`: Verify order remains in `pending` state.
- [ ] Invalid signature: Verify `400` is returned; verify order status is not changed.
- [ ] Duplicate webhook event (idempotency): Verify re-delivery of a `succeeded` event does not double-confirm the order.

**Integration Tests — Order & Payment Endpoints**
- [ ] `POST /orders` — happy path (order created, `clientSecret` returned), empty cart, unauthenticated request.
- [ ] `POST /webhooks/stripe` (`payment_intent.succeeded`) — using Stripe CLI or pre-recorded payload; verify order status update and cart clearance.
- [ ] `POST /webhooks/stripe` (`payment_intent.payment_failed`) — verify order remains in `pending`.
- [ ] `POST /webhooks/stripe` (invalid signature) — verify `400` response and no state change.

**Stripe Test Mode Scenarios**
- [ ] Use Stripe test card `4242 4242 4242 4242` — verify payment success flow end-to-end.
- [ ] Use Stripe test card `4000 0000 0000 0002` (declined) — verify payment failure flow.
- [ ] Use Stripe CLI to trigger `payment_intent.succeeded` webhook — verify order confirmation.

---

### Testing Tasks — Order Tracking & Cancellation (Issue #12)

**Unit Tests — `OrderQueryService`**
- [ ] `getOrderById`: Verify correct order is returned for the owner; verify `403` for non-owner; verify `404` for non-existent ID.
- [ ] `getOrders`: Verify paginated history is returned for the authenticated user; verify `status` filter returns correct subset; verify sort order is `createdAt` descending.

**Unit Tests — `OrderCancellationService`**
- [ ] **Boundary conditions**:
  - Verify cancellation **succeeds** when status is `confirmed`.
  - Verify cancellation **fails** with `422` when status is `preparing`.
  - Verify cancellation **fails** with `422` when status is `out_for_delivery`.
  - Verify cancellation **fails** with `422` when status is `delivered`.
  - Verify cancellation **fails** with `422` when status is `cancelled` (already cancelled).
- [ ] Verify `StripeService.createRefund` is called with the correct `paymentIntentId` on successful cancellation.
- [ ] Verify order status is **rolled back** if `StripeService.createRefund` throws an error.
- [ ] Verify `403` is returned when a non-owner attempts cancellation.

**Unit Tests — `OrderEventsService` / `OrderGateway`**
- [ ] `OrderEventsService.emitStatusUpdate`: Verify correct event is broadcast to the correct Socket.io room with the correct payload.
- [ ] `OrderGateway`: Verify unauthenticated connections are rejected at handshake; verify a user cannot subscribe to an order they do not own.

**Integration Tests — Order Tracking & Cancellation Endpoints**
- [ ] `GET /orders/:id` — happy path, non-owner access (`403`), non-existent order (`404`).
- [ ] `GET /orders` — happy path with pagination, status filter, empty result.
- [ ] `POST /orders/:id/cancel` — cancellation from `confirmed` status (success + refund), cancellation from `preparing` status (`422`), non-owner cancellation (`403`).
- [ ] Real-time event integration: Verify `order:status_updated` Socket.io event is emitted to the correct room when order status changes.

### Database & Environment Tasks
- [ ] Create and configure a **test database** with the same schema as production (run all migrations).
- [ ] Implement **table truncation** between integration test runs to ensure isolation.
- [ ] Create **test data factories** for: User, Restaurant, MenuItem, Cart, CartItem, Order, OrderItem, Coupon.
- [ ] Store Stripe test keys in **CI environment secrets** — never in source code.
- [ ] Configure **Jest coverage thresholds** to fail the build if coverage drops below 80%.
- [ ] Set up **CI pipeline jobs** for unit and integration test suites as separate stages.

---

## 6. Phase 4 — Testing

*This issue IS the testing phase. The following defines quality gates and execution validation.*

### Coverage Gates
- [ ] Overall line, branch, function, and statement coverage ≥ **80%** — enforced via `coverageThreshold` in Jest config.
- [ ] Coverage report generated in `lcov` format and published as a CI artefact on every run.
- [ ] Coverage delta must not decrease between pull request builds — enforce via Codecov or equivalent.

### Test Execution Validation
- [ ] All **unit tests** pass with zero failures in CI.
- [ ] All **integration tests** pass with zero failures in CI.
- [ ] No tests are **skipped** (`it.skip`, `xit`) without an accompanying GitHub issue reference.
- [ ] No tests are **marked as flaky** without a documented tracking issue.
- [ ] Integration test suite runs against the **test database only** — verified by CI environment variable configuration.
- [ ] Stripe webhook tests use **test mode signatures** only — no live Stripe keys in any CI job.

### Validation Scenarios
- [ ] `POST /orders` with an empty cart returns `400` — verified by integration test.
- [ ] Webhook with invalid Stripe signature returns `400` and does not mutate order state — verified by unit and integration tests.
- [ ] Order cancellation from `confirmed` status initiates Stripe refund and emits real-time event — verified end-to-end in integration test.
- [ ] `GET /orders` with `status=delivered` filter returns only delivered orders — verified by integration test.
- [ ] Duplicate webhook delivery (`payment_intent.succeeded`) does not double-confirm an already `confirmed` order — verified by idempotency unit test.
- [ ] Unauthenticated access to any protected endpoint returns `401` — verified across all integration test suites.
- [ ] Cross-user data access (one user accessing another user's cart, order, or cancellation) returns `403` — verified per domain.

---

## 7. Risks

| Risk | Type | Mitigation |
|---|---|---|
| One or more dependency issues (#6, #8, #10, #12) not fully implemented blocks corresponding test suites | Dependency Risk | Prioritise testing after each issue is merged; write unit tests with mocks immediately; hold integration tests until implementation is stable |
| Test database state leakage between tests causes intermittent failures | Technical Risk | Enforce table truncation or transaction rollback in `afterEach` hooks; use isolated test schemas per suite if needed |
| Stripe test mode rate limits or API instability causing flaky integration tests | Technical Risk | Cache Stripe test responses where possible; use pre-recorded Stripe event payloads for webhook tests instead of live Stripe CLI |
| Coverage threshold of 80% not met if certain modules have low testability (e.g., deeply coupled services) | Technical Risk | Identify low-coverage modules early; refactor for testability (dependency injection, interface-based mocking) before writing tests |
| Webhook integration tests require a running Stripe CLI or public URL — not available in all CI environments | Technical Risk | Use pre-recorded Stripe event JSON payloads as fixture files; invoke webhook endpoint directly with Stripe signature computed via test webhook secret |
| Test execution time grows excessively as coverage expands — slow CI feedback loop | Technical Risk | Parallelise unit and integration test suites as separate CI jobs; use Jest `--runInBand` only for integration tests needing serial DB access |
| Shared test data factories not agreed upon across the team — inconsistent test state | Requirement Gap | Define and document factory function contracts before test implementation begins; store in a shared `test/factories/` directory |
| `OrderCancellationService` boundary conditions not fully specified (time-based window) — gaps in test coverage | Requirement Gap | Confirm exact cancellation business rules from Issue #12 before writing boundary tests; document assumptions inline in test files |
| OAuth integration tests require real OAuth provider credentials — not suitable for CI | Technical Risk | Mock OAuth token exchange in integration tests; test only the `validateOAuthUser` service logic with mocked OAuth token payload |

---

## 8. Approval Questions

1. **Coverage Tool** — Should coverage reports be published to **Codecov**, **SonarQube**, or stored only as CI artefacts? Is there a coverage reporting service already in use?
2. **Coverage Scope Exclusions** — Should any files be **excluded from coverage** (e.g., `*.module.ts`, `main.ts`, `*.dto.ts`, migration files, configuration files)?
3. **Test Database Strategy** — Should integration tests use a **dedicated persistent test database**, a **Docker-based ephemeral database** spun up per CI run, or an **in-memory SQLite database**?
4. **Stripe Webhook Testing** — Should webhook tests use **Stripe CLI** (`stripe listen`) in CI, or should they use **pre-recorded Stripe event JSON fixtures** with a computed test signature?
5. **OAuth Testing** — Should OAuth flows (`/auth/google`) be **integration-tested against a real OAuth provider** (with test credentials), or **mocked at the token exchange layer**?
6. **Flaky Test Policy** — What is the team's policy for flaky tests? Should they be **quarantined immediately**, **retried automatically** (e.g., `jest-circus` retry), or **failed and tracked**?
7. **Test Execution Order** — Should unit and integration tests run as **separate CI pipeline stages** (sequential) or as **parallel jobs** (faster but requires more CI runners)?
8. **Contract Testing** — Is **API contract testing** (e.g., Pact.js consumer-driven contracts) required in addition to integration tests, or are Supertest integration tests sufficient?
9. **Performance / Load Testing** — Is **performance or load testing** (e.g., k6, Artillery) in scope for this issue, or is it a separate ticket?
10. **Test Reporting** — Should test results be published in a **human-readable HTML report** (e.g., `jest-html-reporter`) in addition to CI console output?

---

## 9. Final Recommendation

> ⚠️ **Requires Clarification**

Issue #14 is well-scoped with a clear domain breakdown, defined tooling (Jest, Supertest, Stripe test mode), and a measurable acceptance criterion (≥80% coverage, all tests pass in CI). The plan is comprehensive and executable.

However, **four dependency issues (#6, #8, #10, #12) must all be in a stable, merged state** before the full integration test suite can be executed. Unit tests can begin immediately with mocked dependencies as soon as service interfaces are defined.

Key clarifications needed before implementation begins:
- **Test database provisioning strategy** in CI.
- **Stripe webhook testing approach** (Stripe CLI vs. pre-recorded fixtures).
- **Coverage exclusion list** to ensure the 80% threshold is meaningful.

**Once the approval questions are answered**, this issue is ready for active QA implementation.

---

*Plan approved and generated on 2026-06-26 by Sprint Planning Agent.*
