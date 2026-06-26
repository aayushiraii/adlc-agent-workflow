# Implementation Plan — Issue #10

---

## 1. Issue Summary

| Field | Details |
|---|---|
| **Issue Number** | #10 |
| **Title** | Implement Backend Cart Management, Order Placement, and Payment Integration |
| **Priority** | 🔴 High |
| **ADLC Phase** | Development |
| **Labels** | `development`, `high-priority`, `cart`, `payments`, `backend` |
| **Dependencies** | #4 — Design System Architecture and Database Schema · #8 — Implement Backend Restaurant and Menu APIs |
| **Assigned Agent** | Backend Development Agent |

---

## 2. Objective

Implement the complete backend for the cart lifecycle and order fulfillment flow. This encompasses server-side cart storage with full CRUD operations, dynamic price computation (subtotal, tax, delivery fee, coupons), order creation from cart, and end-to-end Stripe payment integration — including payment intent creation and webhook-driven order status updates. The implementation must handle success, failure, and cancellation payment scenarios gracefully.

---

## 3. Phase 1 — Requirement Analysis

### Functional Requirements

**Cart Management**
- Authenticated users can **add items** to their server-side cart (`POST /cart/add`).
- Authenticated users can **update item quantities** in their cart (`PUT /cart/update`).
- Authenticated users can **remove individual items** from their cart (`DELETE /cart/item/:id`).
- Authenticated users can **view their current cart** with a computed summary (`GET /cart`).
- Cart must compute and return: **subtotal**, **tax**, and **delivery fee**.

**Coupon Application** *(mentioned in description)*
- The cart should support **coupon code application** that adjusts the total accordingly.

**Order Placement**
- `POST /orders` must atomically create an order from the current cart and return an `orderId`.
- Upon successful order creation, the cart must be **cleared**.
- Failed or cancelled payments must leave the order in a **`pending`** state.

**Payment Integration (Stripe)**
- A **Stripe Payment Intent** must be created and the `clientSecret` returned to the frontend.
- A **Stripe Webhook** endpoint must:
  - Verify the Stripe signature.
  - Handle `payment_intent.succeeded` → update order status to **`confirmed`**.
  - Handle `payment_intent.payment_failed` / `payment_intent.canceled` → leave order in **`pending`**.

### Business Rules
- Cart is **server-side stored per authenticated user** — no anonymous/guest carts.
- An order may only be placed if the cart is **non-empty**.
- Cart must be **cleared only after** confirmed payment — not on order creation alone.
- Stripe webhook is the **source of truth** for payment confirmation; client-side confirmation alone is insufficient.
- Price calculation must be **server-enforced** — never trust client-submitted totals.

### Constraints
- Payment gateway: **Stripe** (fixed, per issue assumptions).
- Authentication is a prerequisite — all cart and order endpoints must be **protected routes**.
- Webhook endpoint must be accessible via a **public URL** (requires tunneling in local dev, e.g., Stripe CLI or ngrok).
- Depends on database schema from Issue #4 and restaurant/menu data from Issue #8.

---

## 4. Phase 2 — Design

### Architecture Decisions
- Organize code into distinct modules: **CartModule**, **OrderModule**, **PaymentModule**.
- Use a **transactional database operation** for order creation + cart clearance to prevent partial state.
- Webhook handler must use the **raw request body** (unparsed) for Stripe signature verification — middleware must be configured accordingly.
- Implement a **Stripe service/adapter** layer to abstract Stripe SDK calls and make it testable.
- Use **database-level locking or optimistic concurrency** when updating cart items to avoid race conditions.

### Data Models

**Cart**
```ts
Cart {
  id: string;
  userId: string;            // FK → User
  items: CartItem[];
  couponCode?: string;
  discountAmount: number;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  updatedAt: DateTime;
}

CartItem {
  id: string;
  cartId: string;            // FK → Cart
  menuItemId: string;        // FK → MenuItem
  restaurantId: string;      // FK → Restaurant
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}
```

**Order**
```ts
Order {
  id: string;
  userId: string;            // FK → User
  restaurantId: string;      // FK → Restaurant
  items: OrderItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  couponCode?: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  stripePaymentIntentId: string;
  createdAt: DateTime;
  updatedAt: DateTime;
}

OrderItem {
  id: string;
  orderId: string;           // FK → Order
  menuItemId: string;
  name: string;              // snapshot at time of order
  unitPrice: number;         // snapshot at time of order
  quantity: number;
  lineTotal: number;
}
```

### API Contracts

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/cart` | ✅ Required | Retrieve current user's cart with computed totals |
| `POST` | `/cart/add` | ✅ Required | Add a menu item to cart |
| `PUT` | `/cart/update` | ✅ Required | Update quantity of a cart item |
| `DELETE` | `/cart/item/:id` | ✅ Required | Remove a specific item from cart |
| `POST` | `/cart/coupon` | ✅ Required | Apply a coupon code to the cart |
| `POST` | `/orders` | ✅ Required | Create order from cart, generate Stripe Payment Intent |
| `POST` | `/webhooks/stripe` | ❌ Public | Stripe webhook receiver for payment events |

### Price Calculation Logic
```
subtotal     = Σ (unitPrice × quantity) for all CartItems
tax          = subtotal × taxRate  (configured per region/platform)
deliveryFee  = fixed or distance-based (confirm with team)
discountAmt  = coupon discount applied to subtotal (if coupon valid)
total        = subtotal + tax + deliveryFee − discountAmount
```

### Key Modules & Services

| Module / Service | Responsibility |
|---|---|
| `CartService` | Cart CRUD operations, total computation, coupon validation |
| `OrderService` | Order creation from cart, atomic cart clearance |
| `StripeService` | Payment Intent creation, webhook signature verification, event handling |
| `CouponService` | Coupon lookup, validation, discount computation |
| `PriceCalculator` | Centralized, testable price computation logic |

---

## 5. Phase 3 — Implementation

### Backend Tasks

**Cart Module**
- [ ] Implement `GET /cart` — fetch cart by authenticated user, return computed totals.
- [ ] Implement `POST /cart/add` — add menu item to cart (validate item exists in Issue #8 menu data); create cart if none exists.
- [ ] Implement `PUT /cart/update` — update quantity of a specific cart item; remove item if quantity reaches 0.
- [ ] Implement `DELETE /cart/item/:id` — remove a specific item; validate ownership before deletion.
- [ ] Implement `POST /cart/coupon` — validate coupon code, apply discount to cart total.
- [ ] Implement `PriceCalculator` service with unit-testable total computation.

**Order Module**
- [ ] Implement `POST /orders`:
  - Validate cart is non-empty.
  - Snapshot menu item names and prices (do not rely on live menu data post-order).
  - Create `Order` and `OrderItem` records.
  - Create Stripe Payment Intent for the computed total.
  - Return `orderId` and Stripe `clientSecret`.
  - Set order status to `pending`.
- [ ] Ensure order creation and cart clearance are wrapped in a **database transaction**.

**Payment Module**
- [ ] Set up Stripe SDK with environment-based API key configuration.
- [ ] Implement `StripeService.createPaymentIntent(amount, currency, metadata)`.
- [ ] Implement `POST /webhooks/stripe`:
  - Parse raw request body (bypass JSON middleware for this route).
  - Verify Stripe webhook signature using `STRIPE_WEBHOOK_SECRET`.
  - Handle `payment_intent.succeeded` → update order status to `confirmed`, clear cart.
  - Handle `payment_intent.payment_failed` → log, leave order as `pending`.
  - Handle `payment_intent.canceled` → log, leave order as `pending`.
  - Return `200 OK` immediately to Stripe to acknowledge receipt.

### Database Tasks
- [ ] Create `carts` table with fields: `id`, `user_id`, `coupon_code`, `discount_amount`, `subtotal`, `tax`, `delivery_fee`, `total`, `updated_at`.
- [ ] Create `cart_items` table with fields: `id`, `cart_id`, `menu_item_id`, `restaurant_id`, `quantity`, `unit_price`, `line_total`.
- [ ] Create `orders` table with fields: `id`, `user_id`, `restaurant_id`, `subtotal`, `tax`, `delivery_fee`, `discount_amount`, `total`, `coupon_code`, `status`, `stripe_payment_intent_id`, `created_at`, `updated_at`.
- [ ] Create `order_items` table with fields: `id`, `order_id`, `menu_item_id`, `name`, `unit_price`, `quantity`, `line_total`.
- [ ] Write and run database migrations for all new tables.
- [ ] Add appropriate **indexes**: `carts.user_id`, `orders.user_id`, `orders.stripe_payment_intent_id`.

### Integration Tasks
- [ ] Integrate with **Issue #8** menu APIs to validate menu item existence and fetch current prices when adding to cart.
- [ ] Integrate **Stripe SDK** (`stripe` npm package or equivalent).
- [ ] Configure **Stripe webhook** in Stripe Dashboard pointing to `/webhooks/stripe`.
- [ ] Secure all cart and order endpoints with the **authentication middleware** from the auth module.
- [ ] Store Stripe API keys and webhook secret in **environment variables** (never hardcoded).

---

## 6. Phase 4 — Testing

### Unit Tests
- `PriceCalculator`: Verify subtotal, tax, delivery fee, and discount computations for various cart configurations.
- `CartService.addItem`: Verify item is added correctly; verify a new cart is created if none exists.
- `CartService.updateItem`: Verify quantity update; verify item removal when quantity = 0.
- `CartService.applyCoupon`: Verify valid coupon applies correct discount; verify invalid coupon is rejected.
- `StripeService.createPaymentIntent`: Verify correct amount and currency are passed to Stripe SDK (mock Stripe).
- `WebhookHandler`: Verify signature verification rejects tampered payloads; verify correct order status transitions per event type.

### Integration Tests
- `POST /cart/add`: Verify item is persisted; verify cart totals are recomputed.
- `PUT /cart/update`: Verify quantity update is reflected in cart totals.
- `DELETE /cart/item/:id`: Verify item is removed; verify ownership check prevents cross-user deletion.
- `GET /cart`: Verify correct totals are returned for a populated cart.
- `POST /orders`: Verify order is created with correct status (`pending`); verify Stripe Payment Intent is created; verify `clientSecret` is returned.
- `POST /webhooks/stripe` (`payment_intent.succeeded`): Verify order status updates to `confirmed`; verify cart is cleared.
- `POST /webhooks/stripe` (`payment_intent.payment_failed`): Verify order remains in `pending` state.

### Validation Scenarios
- [ ] Cart total, tax, and delivery fee are calculated **server-side** and match expected values.
- [ ] Placing an order on an **empty cart** returns a `400 Bad Request`.
- [ ] Unauthenticated requests to cart/order endpoints return `401 Unauthorized`.
- [ ] A user cannot delete or modify **another user's cart items** (returns `403 Forbidden`).
- [ ] Stripe webhook with an **invalid signature** returns `400` and does not update the order.
- [ ] **Duplicate webhook events** (Stripe may retry) are handled idempotently — no double-confirmation.
- [ ] Cart is **not cleared** if order creation succeeds but Stripe Payment Intent creation fails (transaction rollback).
- [ ] Applying an **expired or invalid coupon** returns a descriptive error message.
- [ ] Price snapshot in `OrderItem` reflects the **price at time of order**, not the current menu price.

---

## 7. Risks

| Risk | Type | Mitigation |
|---|---|---|
| Issue #4 (DB schema) not finalized may require schema rework during implementation | Dependency Risk | Validate cart/order schema against Issue #4 ERD before starting migrations |
| Issue #8 (Menu APIs) not ready blocks menu item price validation at cart-add time | Dependency Risk | Use an internal service call or shared DB access as interim; mock for development |
| Stripe webhook not reachable in local dev environment | Technical Risk | Use Stripe CLI (`stripe listen`) or ngrok for local webhook forwarding |
| Race condition when two concurrent requests modify the same cart | Technical Risk | Implement row-level locking or optimistic concurrency on cart updates |
| Duplicate Stripe webhook delivery causing double order confirmation | Technical Risk | Implement idempotency checks using `stripePaymentIntentId` before updating status |
| Tax rate and delivery fee rules not specified in the issue | Requirement Gap | Confirm tax rate source (flat rate, region-based) and delivery fee calculation logic |
| Coupon validation rules and storage not defined | Requirement Gap | Confirm coupon data model, expiry handling, and single-use vs. multi-use behavior |
| Order status transitions beyond `pending`/`confirmed` not specified | Requirement Gap | Confirm full order lifecycle (preparing, out for delivery, delivered, cancelled) |
| Stripe secret keys accidentally committed to source control | Technical Risk | Enforce `.env` usage; add secret scanning to CI pipeline |

---

## 8. Approval Questions

1. **Tax Rate** — Should tax be a **flat platform-wide rate**, or is it **region/jurisdiction-based**? What is the default rate?
2. **Delivery Fee** — Is the delivery fee a **fixed amount**, or is it **dynamic** (e.g., based on distance, restaurant, or order value)?
3. **Coupon Rules** — What are the coupon validation rules? (e.g., expiry date, single-use vs. multi-use, percentage vs. fixed discount, minimum order value?)
4. **Multi-Restaurant Cart** — Can a user add items from **multiple restaurants** in a single cart, or is the cart restricted to **one restaurant at a time**?
5. **Cart Expiry** — Should an inactive cart **expire** after a set period? If yes, what is the expiry window?
6. **Order Lifecycle** — What are the full set of order statuses beyond `pending` and `confirmed`? (e.g., `preparing`, `out_for_delivery`, `delivered`, `cancelled`)
7. **Currency** — What **currency/currencies** should Stripe Payment Intents be created in?
8. **Refunds** — Should the backend handle **Stripe refund webhooks** in this issue, or is that a separate issue?
9. **Cart Clearance Timing** — Should the cart be cleared on `payment_intent.succeeded` webhook (server-confirmed) or earlier on client-side payment confirmation?
10. **Authentication Module** — Is the authentication middleware from a prior issue already implemented and available, or does it need to be mocked/stubbed for this issue?

---

## 9. Final Recommendation

> ⚠️ **Requires Clarification**

Issue #10 is technically well-scoped with clear API contracts and acceptance criteria. However, **several business logic gaps** — specifically around tax computation, delivery fee rules, coupon validation, and multi-restaurant cart behavior — must be resolved before implementation begins to avoid costly rework.

The two dependency risks on **Issue #4** (schema) and **Issue #8** (menu APIs) should be validated as completed or near-complete before the database migrations and cart-add integration tasks begin.

**Once the approval questions are answered**, this issue is ready for active backend development.

---

*Plan approved and generated on 2026-06-26 by Sprint Planning Agent.*
