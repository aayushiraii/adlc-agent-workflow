# Implementation Plan — Issue #11

---

## 1. Issue Summary

| Field | Details |
|---|---|
| **Issue Number** | #11 |
| **Title** | Implement Frontend Cart, Checkout, and Payment Screens |
| **Priority** | 🔴 High |
| **ADLC Phase** | Development |
| **Labels** | `development`, `high-priority`, `cart`, `payments`, `frontend` |
| **Dependencies** | #5 — Design UX Flows and UI Wireframes for All App Screens · #10 — Implement Backend Cart Management, Order Placement, and Payment Integration |
| **Assigned Agent** | Frontend Development Agent |

---

## 2. Objective

Build the complete frontend experience for the cart, checkout, and payment flow. This covers the cart screen where users manage items and review their order summary, a multi-step checkout flow collecting delivery address and payment details via Stripe Elements, and post-payment screens for both success (order confirmation) and failure (error with retry). All screens must integrate seamlessly with the backend APIs delivered in Issue #10.

---

## 3. Phase 1 — Requirement Analysis

### Functional Requirements

**Cart Screen**
- Display all cart items with: **item image, name, quantity, unit price, and line total**.
- Allow users to **increase or decrease item quantities** directly on the cart screen.
- Allow users to **remove items** from the cart.
- Display the **order summary**: subtotal, delivery fee, taxes, and total.
- Reflect cart updates in **real time** without requiring a full page reload.

**Checkout Screen**
- Allow users to **select a delivery address** from their saved addresses.
- Collect **payment details** via **Stripe Elements** (PCI-compliant card input UI).
- Display a final **order summary** before payment submission.
- Support selection of **delivery time** (as mentioned in the issue description).

**Payment Flow**
- On submission, call the backend `POST /orders` to get `clientSecret`.
- Use **Stripe.js** to confirm the payment using the `clientSecret`.
- On **payment success**: navigate to the Order Confirmation screen with order ID and order details.
- On **payment failure**: display a clear error message and allow the user to **retry payment** without losing cart state.

**Order Confirmation Screen**
- Display: **order ID**, itemized summary, total paid, estimated delivery details.
- Provide a call-to-action to return home or track the order.

### Business Rules
- Cart data must be fetched from the **server-side cart** (Issue #10) — not local state only.
- Delivery address must be selected from **saved user addresses** (no free-text address entry per assumptions).
- Payment card input must be rendered via **Stripe Elements** — raw card data must never touch application code.
- Cart state must **not be cleared** on the frontend until payment is confirmed.
- Retry after payment failure must **reuse the existing order** and not create a duplicate order.

### Constraints
- Framework: **React / React Native** (consistent with Issue #9).
- Payment SDK: **Stripe.js / React Stripe.js** (fixed per issue assumptions).
- UI must adhere to wireframes and UX flows from **Issue #5**.
- All authenticated API calls require a valid user session/token.

---

## 4. Phase 2 — Design

### Architecture Decisions
- Use a **dedicated payment context or hook** (`usePayment`, `useCart`) to manage Stripe lifecycle, cart state, and order state independently of UI components.
- Wrap the checkout subtree with **Stripe's `<Elements>` provider** to supply the Stripe instance and `clientSecret` to all child components.
- Structure checkout as a **multi-step flow** (Step 1: Address → Step 2: Payment → Step 3: Review & Pay) or a single scrollable screen depending on wireframe from Issue #5.
- API calls must be routed through a **service layer** (e.g., `CartService`, `OrderService`) to keep components clean and testable.
- Use **optimistic UI updates** for cart quantity changes to improve perceived responsiveness, with server reconciliation on error.

### Data Models (Frontend)

**Cart State**
```ts
CartState {
  items: CartItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  couponCode?: string;
}

CartItem {
  id: string;
  menuItemId: string;
  name: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}
```

**Checkout State**
```ts
CheckoutState {
  selectedAddressId: string;
  deliveryTime?: string;
  stripeClientSecret?: string;
  orderId?: string;
  paymentStatus: 'idle' | 'processing' | 'success' | 'failed';
  errorMessage?: string;
}
```

**Saved Address**
```ts
Address {
  id: string;
  label: string;       // e.g., "Home", "Work"
  street: string;
  city: string;
  state: string;
  postalCode: string;
}
```

### API Integration

| Method | Endpoint | Used On | Purpose |
|---|---|---|---|
| `GET` | `/cart` | Cart Screen mount | Fetch current cart |
| `PUT` | `/cart/update` | Cart Screen | Update item quantity |
| `DELETE` | `/cart/item/:id` | Cart Screen | Remove item |
| `GET` | `/user/addresses` | Checkout Screen | Fetch saved addresses |
| `POST` | `/orders` | Checkout Screen (on pay) | Create order + get Stripe `clientSecret` |

### Key Components

| Component | Screen | Purpose |
|---|---|---|
| `CartScreen` | Cart | Root cart screen with item list and order summary |
| `CartItemRow` | Cart | Single cart item with quantity controls and remove button |
| `OrderSummaryPanel` | Cart & Checkout | Subtotal, delivery fee, tax, total display |
| `CheckoutScreen` | Checkout | Multi-step or single-page checkout container |
| `AddressSelector` | Checkout | Dropdown/list of saved user addresses |
| `DeliveryTimePicker` | Checkout | Select or display estimated delivery time |
| `StripePaymentForm` | Checkout | Wraps Stripe `<CardElement>` with submit logic |
| `PaymentSuccessScreen` | Post-Payment | Order ID, summary, and navigation CTA |
| `PaymentFailureScreen` | Post-Payment | Error message with retry and back options |
| `SkeletonLoader` | All | Loading placeholder during API calls |
| `EmptyCartState` | Cart | Shown when cart is empty |

### Stripe Integration Flow
```
1. User taps "Place Order"
2. Frontend calls POST /orders → receives { orderId, clientSecret }
3. Frontend calls stripe.confirmCardPayment(clientSecret, { payment_method: { card: cardElement } })
4. Stripe returns { paymentIntent } on success or { error } on failure
5. On success → navigate to PaymentSuccessScreen with orderId
6. On failure → display error, allow retry using same clientSecret (no new order created)
```

---

## 5. Phase 3 — Implementation

### Frontend Tasks

**Cart Screen**
- [ ] Build `CartScreen` layout: scrollable item list + sticky `OrderSummaryPanel` at the bottom.
- [ ] Build `CartItemRow` with quantity increment/decrement controls and remove button.
- [ ] Integrate `GET /cart` API on screen mount to populate cart state.
- [ ] Integrate `PUT /cart/update` on quantity change (debounced or on blur).
- [ ] Integrate `DELETE /cart/item/:id` on item removal.
- [ ] Implement **optimistic UI update** for quantity changes with rollback on API error.
- [ ] Build `OrderSummaryPanel` displaying subtotal, delivery fee, tax, discount, and total.
- [ ] Implement `EmptyCartState` component for when the cart has no items.
- [ ] Add `SkeletonLoader` for the cart item list during initial API fetch.
- [ ] Add a **"Proceed to Checkout"** CTA button that is disabled when cart is empty.

**Checkout Screen**
- [ ] Build `CheckoutScreen` as a multi-step or single-scroll layout per wireframes from Issue #5.
- [ ] Build `AddressSelector` — fetch saved addresses from `GET /user/addresses` and render a selectable list.
- [ ] Build `DeliveryTimePicker` — allow user to select or view estimated delivery time.
- [ ] Integrate **Stripe.js**: load `@stripe/stripe-js` and wrap checkout with `<Elements provider>`.
- [ ] Build `StripePaymentForm` using Stripe `<CardElement>` for PCI-compliant card input.
- [ ] Display a read-only `OrderSummaryPanel` on the checkout screen for final review.
- [ ] On "Pay Now" tap: call `POST /orders` → receive `clientSecret` → call `stripe.confirmCardPayment()`.

**Post-Payment Screens**
- [ ] Build `PaymentSuccessScreen`: display order ID, item summary, total, and estimated delivery; provide "Track Order" and "Go Home" CTAs.
- [ ] Build `PaymentFailureScreen`: display Stripe error message; provide "Retry Payment" (reuse existing `clientSecret`) and "Back to Cart" options.
- [ ] Ensure **back navigation from success screen** does not re-trigger payment.

### State Management Tasks
- [ ] Implement `useCart` hook: manages cart fetch, quantity updates, item removal, and optimistic state.
- [ ] Implement `useCheckout` hook: manages address selection, delivery time, Stripe client secret, order ID, and payment status.
- [ ] Clear cart state from global/local store **only after** navigating to `PaymentSuccessScreen`.

### Integration Tasks
- [ ] Load Stripe publishable key from **environment variable** (`REACT_APP_STRIPE_PUBLISHABLE_KEY` or equivalent).
- [ ] Connect `POST /orders` response `clientSecret` directly to `stripe.confirmCardPayment()`.
- [ ] Handle all HTTP error responses from cart and order APIs with user-facing toast/inline messages.

### Database Tasks
*(Not applicable — frontend only; data sourced from Issue #10 APIs)*

---

## 6. Phase 4 — Testing

### Unit Tests
- `CartItemRow`: Verify quantity increment/decrement calls correct API; verify remove button triggers delete.
- `OrderSummaryPanel`: Verify subtotal, tax, delivery fee, and total render correctly for given cart data.
- `AddressSelector`: Verify addresses are rendered; verify selection updates checkout state.
- `StripePaymentForm`: Verify `stripe.confirmCardPayment` is called with correct `clientSecret` on submit (mock Stripe.js).
- `PaymentSuccessScreen`: Verify order ID and summary are displayed correctly.
- `PaymentFailureScreen`: Verify error message is displayed; verify retry re-calls `stripe.confirmCardPayment` without creating a new order.
- `useCart` hook: Verify optimistic update is applied and rolled back correctly on API failure.

### Integration Tests
- `CartScreen`: Verify `GET /cart` populates item list and order summary on mount; verify quantity update is persisted via `PUT /cart/update`; verify item removal via `DELETE /cart/item/:id`.
- `CheckoutScreen`: Verify `GET /user/addresses` populates address selector; verify `POST /orders` is called with correct payload on submit; verify Stripe payment confirmation is triggered with the returned `clientSecret`.
- Full payment success flow: Verify navigation to `PaymentSuccessScreen` with correct order ID after `stripe.confirmCardPayment` resolves successfully.
- Full payment failure flow: Verify `PaymentFailureScreen` renders with Stripe error message; verify retry does not call `POST /orders` again.

### Validation Scenarios
- [ ] Cart screen correctly displays **all items, quantities, and computed totals** from the server-side cart.
- [ ] Updating quantity to **0 removes the item** from the cart.
- [ ] **"Proceed to Checkout"** is disabled when the cart is empty.
- [ ] Checkout screen **cannot be submitted** without a selected delivery address.
- [ ] Stripe `<CardElement>` is rendered and **card data never passes through** application code.
- [ ] Payment failure displays a **specific, user-friendly error message** (not a generic one).
- [ ] Retrying payment after failure **does not create a duplicate order**.
- [ ] Navigating **back from the success screen** does not re-trigger the payment flow.
- [ ] `SkeletonLoader` is shown on the cart screen while the initial `GET /cart` is in flight.
- [ ] Cart and checkout screens render correctly across **multiple screen sizes**.
- [ ] Unauthenticated users are **redirected to login** when accessing cart or checkout.

---

## 7. Risks

| Risk | Type | Mitigation |
|---|---|---|
| Issue #5 (wireframes) not finalized blocks checkout layout decisions (single-screen vs. multi-step) | Dependency Risk | Confirm checkout flow design from Issue #5 before building `CheckoutScreen` |
| Issue #10 (backend APIs) not ready blocks all API integration tasks | Dependency Risk | Use mock API responses / stubs to develop and test screens in parallel |
| Stripe.js `clientSecret` mishandling could result in double order creation on retry | Technical Risk | Strictly reuse the same `clientSecret` on retry; never call `POST /orders` again unless the user explicitly restarts the cart |
| Optimistic UI cart updates diverging from server state on network failure | Technical Risk | Implement rollback logic in `useCart` on API error; always refetch cart after a failed update |
| Stripe publishable key accidentally hardcoded in source | Technical Risk | Load from environment variables; add `.env` checks to CI |
| Saved addresses API endpoint not yet defined in prior issues | Requirement Gap | Confirm `GET /user/addresses` endpoint availability and response shape from backend team |
| Delivery time selection scope not fully specified (static display vs. user-selectable slot) | Requirement Gap | Confirm whether delivery time is a fixed estimate or a user-selectable time slot |
| No explicit accessibility (a11y) requirements stated for payment forms | Requirement Gap | Confirm WCAG/a11y compliance requirements, especially for Stripe Elements keyboard and screen-reader support |
| Cart state clearing timing mismatch between frontend and backend webhook confirmation | Technical Risk | Only clear frontend cart state after navigating to success screen; rely on backend webhook for authoritative clearance |

---

## 8. Approval Questions

1. **Checkout Layout** — Should checkout be a **multi-step flow** (Address → Payment → Review) or a **single scrollable screen**? Confirm per Issue #5 wireframes.
2. **Delivery Time** — Is delivery time a **fixed system estimate** displayed to the user, or can the user **select a preferred delivery time slot**?
3. **Address Management** — If the user has **no saved addresses**, should they be able to **add a new address inline** during checkout, or must they go to a separate profile/address management screen first?
4. **Retry Behavior** — On payment failure, should the retry reuse the **same Stripe Payment Intent** (`clientSecret`), or should the user be redirected back to the cart to restart the order flow?
5. **Coupon Code on Frontend** — Should the **cart screen include a coupon code input field**, or is coupon application handled separately (e.g., in the restaurant/menu screen)?
6. **Guest Checkout** — Is **guest (unauthenticated) checkout** in scope, or is authentication always required to access the cart?
7. **Platform** — Confirm: is this **React Native (mobile)**, **React (web)**, or **both**? (Consistent with Issue #9 clarification.)
8. **Stripe Element Style** — Should the `<CardElement>` use the **default Stripe styling**, or does it need to be **custom-themed** to match the app's design system?
9. **Order Tracking** — After the success screen, should "Track Order" navigate to a **live order tracking screen** (separate issue) or a **static order detail screen**?
10. **Analytics** — Should payment events (payment initiated, payment success, payment failure, retry) be tracked with an analytics event?

---

## 9. Final Recommendation

> ⚠️ **Requires Clarification**

Issue #11 is well-scoped with clear acceptance criteria and a defined Stripe integration path. However, **key UX and flow decisions** — checkout layout (single vs. multi-step), delivery time behavior, address fallback when no saved addresses exist, and retry strategy — must be confirmed before implementation begins to avoid structural rework.

The two active dependency risks on **Issue #5** (wireframes) and **Issue #10** (backend APIs) should be resolved or stubbed before integration tasks begin. Frontend screens can be scaffolded and unit-tested with mock data in parallel.

**Once the approval questions are answered**, this issue is ready for active frontend development.

---

*Plan approved and generated on 2026-06-26 by Sprint Planning Agent.*
