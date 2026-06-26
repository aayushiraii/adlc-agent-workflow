# Implementation Plan — Issue #3
# Define Requirements for Cart, Payment, Order Tracking, and Cancellation

---

## Issue Summary

| Field | Details |
|---|---|
| **Issue Number** | #3 |
| **Title** | Define Requirements for Cart, Payment, Order Tracking, and Cancellation |
| **Priority** | High |
| **ADLC Phase** | Requirement Analysis |
| **Labels** | `requirement-analysis`, `high-priority`, `cart`, `payments`, `order-tracking` |
| **Dependencies** | None |
| **State** | Open |

---

## Objective

This issue aims to formally capture and document all functional requirements for the platform's **core transactional workflows** — including cart management, checkout, online payment processing, real-time order tracking, and order cancellation. The documented requirements will serve as the authoritative specification for subsequent design, implementation, and testing phases across these critical user journeys.

---

## Phase 1 — Requirement Analysis

### Functional Requirements

**Cart Management**
- Users must be able to **add**, **update quantity**, and **remove** items from the cart.
- Cart must enforce configurable **maximum item limits** per order.
- Each menu item must have an **individual quantity limit** (e.g., max 10 of a single item).
- If a user attempts to add items from a **different restaurant**, the system must prompt to clear the existing cart or cancel the action.
- Cart must **persist across sessions** (user should not lose cart on page refresh or app restart).
- Cart must reflect **real-time availability** — unavailable items must be flagged or removed.

**Checkout**
- Users must be able to review cart contents, delivery address, and estimated delivery time before confirming an order.
- Users must be able to apply **promo codes or discount vouchers** at checkout.
- A confirmed order must generate a unique **Order ID**.

**Payment**
- Supported payment methods must be formally defined (card, wallet, Cash on Delivery if applicable).
- Payment integration with **Stripe** (or equivalent gateway) must be documented.
- Payment must support **secure tokenization** — raw card data must never be stored.
- System must handle **payment failure** gracefully with retry or alternative payment options.
- Successful payment must trigger order placement atomically.

**Order Tracking**
- Order status lifecycle must follow: `Placed → Confirmed → Preparing → Out for Delivery → Delivered`.
- Status updates must be delivered via **real-time polling or WebSockets**.
- Users must be able to view the **current status** of their active order at any time.
- Estimated delivery time must be displayed and updated dynamically.

**Cancellation**
- Cancellation is permitted **only before the restaurant confirms** the order.
- Once confirmed, cancellation must be blocked with an appropriate user message.
- Cancellation must trigger a **refund** according to a defined refund policy.
- Cancellation reason must be captured (optional or mandatory — to be confirmed).

**Notifications**
- Notification touchpoints must be identified for: Email, Push Notifications, SMS.
- Notifications must be triggered at key order lifecycle events (order placed, confirmed, out for delivery, delivered, cancelled).

### Business Rules
- A cart can only contain items from **one restaurant at a time**.
- Payment must be completed before the order is submitted to the restaurant.
- Cancellation eligibility window closes the moment the restaurant **confirms** the order.
- Refunds must be processed back to the **original payment method**.
- Cash on Delivery (COD) orders may follow a different cancellation/refund flow.

### Constraints
- PCI-DSS compliance must be maintained — no raw card data stored on platform servers.
- WebSocket connections must handle reconnection gracefully on network drops.
- Refund processing timelines depend on the payment gateway (typically 3–7 business days for cards).
- Notification delivery must not block the order flow (fire-and-forget or async pattern).

---

## Phase 2 — Design

### Architecture Decisions
- **Cart Service** — Stateful service with session persistence (Redis or database-backed cart).
- **Payment Service** — Thin integration layer over Stripe (or equivalent); handles tokenization, charge, and refund APIs.
- **Order Service** — Manages order lifecycle state machine (`Placed → Confirmed → Preparing → Out for Delivery → Delivered`).
- **Notification Service** — Async, event-driven service consuming order lifecycle events and dispatching Email, Push, and SMS notifications.
- **Real-Time Tracking** — WebSocket channel per order, with polling fallback for clients that cannot maintain persistent connections.

### Data Models

**Cart**
- `id`, `userId`, `restaurantId`, `items[]`, `createdAt`, `updatedAt`

**Cart Item**
- `id`, `cartId`, `menuItemId`, `quantity`, `unitPrice`, `subtotal`

**Order**
- `id`, `userId`, `restaurantId`, `items[]`, `totalAmount`, `paymentMethod`, `paymentStatus`, `orderStatus`, `deliveryAddress`, `promoCode`, `placedAt`, `updatedAt`

**Payment**
- `id`, `orderId`, `gatewayTransactionId`, `method`, `amount`, `currency`, `status`, `createdAt`

**Cancellation**
- `id`, `orderId`, `reason`, `requestedAt`, `refundStatus`, `refundAmount`, `refundInitiatedAt`

**Notification Log**
- `id`, `orderId`, `userId`, `channel (email/push/SMS)`, `event`, `sentAt`, `status`

### APIs
- `POST /cart/items` — Add item to cart
- `PUT /cart/items/:itemId` — Update item quantity
- `DELETE /cart/items/:itemId` — Remove item from cart
- `DELETE /cart` — Clear entire cart
- `POST /orders` — Place order (from cart)
- `GET /orders/:id` — Get order details and current status
- `POST /orders/:id/cancel` — Request order cancellation
- `POST /payments/initiate` — Initiate payment session (Stripe PaymentIntent)
- `POST /payments/confirm` — Confirm payment after gateway callback
- `GET /orders/:id/tracking` — WebSocket or polling endpoint for live status updates

### Components
- **Cart Sidebar / Cart Page** — Item list, quantity controls, subtotal, promo code input, checkout CTA
- **Checkout Page** — Address confirmation, payment method selector, order summary, place order CTA
- **Payment Modal / Screen** — Stripe Elements integration for card input
- **Order Confirmation Page** — Order ID, estimated delivery time, status
- **Order Tracking Page** — Live status stepper, estimated delivery time, cancel button (if eligible)
- **Order History Page** — Past orders with status and reorder option
- **Notification Templates** — Email, Push, and SMS templates for each lifecycle event

---

## Phase 3 — Implementation

### Backend Tasks
- Implement Cart CRUD endpoints with session persistence.
- Implement restaurant-switching conflict resolution logic in the cart.
- Implement real-time cart item availability check on add/update.
- Implement `POST /orders` endpoint with atomic payment + order creation.
- Build Order lifecycle state machine with valid transition enforcement.
- Integrate **Stripe PaymentIntent API** for card payments.
- Implement payment failure handling and retry logic.
- Implement `POST /orders/:id/cancel` with eligibility check (pre-confirmation only).
- Implement refund initiation via Stripe Refund API on cancellation.
- Build WebSocket server for real-time order status broadcasting.
- Build Notification Service with async event consumption and multi-channel dispatch.
- Implement promo code validation and discount application at checkout.

### Frontend Tasks
- Build **Cart Sidebar / Page** with add, update, remove, and clear functionality.
- Build restaurant-switching conflict prompt (clear cart or cancel).
- Build **Checkout Page** with address, payment method, and order summary.
- Integrate **Stripe Elements** for secure card input on the payment screen.
- Build **Order Confirmation Page** displaying Order ID and estimated delivery time.
- Build **Order Tracking Page** with live status stepper and dynamic ETA.
- Show/hide **Cancel Order** button based on order status eligibility.
- Build **Order History Page** with reorder functionality.
- Handle payment failure states with user-friendly error messages and retry options.

### Database Tasks
- Create `carts` and `cart_items` tables with user and restaurant associations.
- Create `orders` and `order_items` tables with full lifecycle status support.
- Create `payments` table linked to orders with gateway transaction references.
- Create `cancellations` table tracking cancellation requests and refund status.
- Create `notification_logs` table for audit trail of dispatched notifications.
- Set up database-level constraints to enforce one active cart per user.
- Set up indexes on `orders.userId`, `orders.status`, and `payments.orderId` for query performance.

### Integration Tasks
- Integrate **Stripe SDK** (backend) for PaymentIntent, charge, and refund flows.
- Integrate **Stripe Elements** (frontend) for PCI-compliant card input.
- Integrate **Push Notification** provider (e.g., Firebase Cloud Messaging).
- Integrate **Email** provider (e.g., SendGrid or AWS SES) for transactional emails.
- Integrate **SMS** provider (e.g., Twilio) for SMS notifications.
- Integrate WebSocket library (e.g., Socket.IO) for real-time order tracking.

---

## Phase 4 — Testing

### Unit Tests
- Test cart item add/update/remove logic including quantity limit enforcement.
- Test restaurant-switching conflict detection in cart.
- Test order state machine transition validity (e.g., cannot go from `Placed` to `Delivered` directly).
- Test cancellation eligibility check (pre-confirmation = allowed, post-confirmation = blocked).
- Test promo code validation logic (valid, expired, already used).
- Test payment failure handling and retry logic.
- Test refund calculation on cancellation.

### Integration Tests
- Test end-to-end cart → checkout → payment → order placement flow.
- Test Stripe PaymentIntent creation, confirmation, and failure handling.
- Test Stripe Refund API trigger on order cancellation.
- Test WebSocket status update delivery on order state change.
- Test notification dispatch for each order lifecycle event across all channels.
- Test cart persistence across user sessions (logout/login).

### Validation Scenarios
- User adds items from Restaurant A, then attempts to add from Restaurant B — conflict prompt appears.
- User places order, payment fails — order is not created, user is shown retry option.
- User cancels order before restaurant confirms — cancellation succeeds, refund is initiated.
- User attempts to cancel after restaurant confirms — cancellation is blocked with explanation.
- Order status updates from `Placed → Confirmed → Preparing → Out for Delivery → Delivered` and each transition triggers the correct notification.
- Guest user (if allowed) cannot access cart or checkout without logging in.
- COD order follows alternate payment and cancellation flow (no refund via gateway).

---

## Risks

### Technical Risks
- **Payment atomicity** — If the order is created but payment confirmation is delayed or fails, the system could enter an inconsistent state. A robust saga or two-phase commit pattern is required.
- **WebSocket scalability** — Maintaining persistent WebSocket connections for all active orders at scale requires careful infrastructure planning (e.g., sticky sessions, pub/sub backend).
- **Stripe webhook reliability** — Payment status updates rely on Stripe webhooks; missed or delayed webhooks could cause stale order states.
- **Refund processing delays** — Refunds via card gateways can take 3–7 business days, which may create a negative user experience requiring clear communication.

### Dependency Risks
- **Stripe API changes** — Any breaking changes to the Stripe API version could disrupt the payment flow.
- **Third-party notification providers** — Downtime or rate limits from Firebase, SendGrid, or Twilio could delay critical order notifications.
- **Restaurant confirmation latency** — If restaurants are slow to confirm orders, the cancellation window ambiguity may lead to user disputes.

### Requirement Gaps
- **COD (Cash on Delivery)** — It is unclear whether COD is a supported payment method; the cancellation and refund flow for COD is fundamentally different.
- **Wallet payments** — No details are provided about whether an in-app wallet exists or if third-party wallets (Apple Pay, Google Pay) are supported.
- **Partial refund policy** — The refund policy for partially consumed orders or delivery fee deductions is not defined.
- **Cancellation reason** — It is not specified whether the cancellation reason is mandatory or optional.
- **Multi-item partial unavailability** — What happens if one item in the order becomes unavailable after order placement is not addressed.
- **Promo code rules** — Stackability, per-user limits, and minimum order value rules are not defined.

---

## Approval Questions

1. **COD Support** — Is Cash on Delivery a supported payment method? If yes, what are the cancellation and refund rules for COD orders?
2. **Wallet / Digital Payments** — Should the platform support Apple Pay, Google Pay, or an in-app wallet in addition to card payments?
3. **Cancellation Reason** — Is providing a cancellation reason mandatory for the user, or optional?
4. **Partial Refund Policy** — Should refunds deduct delivery fees or any service charges, or is the full order amount refunded on cancellation?
5. **Promo Code Rules** — Can multiple promo codes be stacked? Is there a minimum order value to apply a promo? Is each promo limited to one use per user?
6. **Real-Time Tracking Method** — Should the platform use WebSockets for real-time updates, or is periodic polling (e.g., every 15 seconds) acceptable?
7. **Notification Channels** — Are all three channels (Email, Push, SMS) mandatory, or are some optional based on user preference settings?
8. **Item Unavailability Post-Placement** — If a menu item becomes unavailable after the order is placed but before preparation, what is the expected system behavior (cancel item, cancel order, notify user)?
9. **Guest Checkout** — Should guest users (unauthenticated) be able to place orders, or is login required for all transactional flows?
10. **Max Cart Size** — What is the maximum number of distinct items or total item quantity allowed in a single cart?

---

## Final Recommendation

> **Status: Requires Clarification**

This issue covers highly critical transactional flows — cart, payment, order tracking, and cancellation — and is well-scoped at a high level. However, several **significant requirement gaps** exist, particularly around COD support, wallet/digital payment methods, the partial refund policy, promo code rules, and post-placement item unavailability handling. These gaps must be resolved before implementation can begin to avoid costly rework in the payment and order management layers.

Once the approval questions above are answered, this issue will be fully **Ready for Development**.

---

*Plan approved and generated on 2026-06-26 by Sprint Planning Agent.*
*Approved by: Raj Sanghvi (hello@bitcot.ai)*
