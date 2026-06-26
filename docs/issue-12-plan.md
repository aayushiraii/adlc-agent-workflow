# Implementation Plan — Issue #12

---

## 1. Issue Summary

| Field | Details |
|---|---|
| **Issue Number** | #12 |
| **Title** | Implement Backend Real-Time Order Tracking and Order Cancellation |
| **Priority** | 🔴 High |
| **ADLC Phase** | Development |
| **Labels** | `development`, `high-priority`, `order-tracking`, `backend`, `cancellation` |
| **Dependencies** | #10 — Implement Backend Cart Management, Order Placement, and Payment Integration |
| **Assigned Agent** | Backend Development Agent |

---

## 2. Objective

Build the backend infrastructure for real-time order lifecycle visibility and controlled order cancellation. This includes REST endpoints for order retrieval and order history, a real-time push mechanism (Socket.io or SSE) that broadcasts order status transitions (`confirmed → preparing → out for delivery → delivered`) to the client, a cancellation endpoint with business-rule enforcement on allowable cancellation windows, and automatic Stripe refund initiation upon a successful cancellation.

---

## 3. Phase 1 — Requirement Analysis

### Functional Requirements

**Order Retrieval**
- `GET /orders/:id` — Return the current status and full details of a specific order for the authenticated user.
- `GET /orders` — Return the **paginated order history** for the authenticated user, sorted by most recent first.

**Real-Time Order Tracking**
- Order status transitions must be **pushed to the client in real time** via WebSocket (Socket.io) or Server-Sent Events (SSE).
- Status transitions follow the sequence: `confirmed → preparing → out for delivery → delivered`.
- The client must be subscribed to updates **scoped to their specific order** — not a broadcast to all users.

**Order Cancellation**
- `POST /orders/:id/cancel` — Cancel an order if it is within the **allowed cancellation window**.
- If cancellation is attempted **outside the allowed window**, return a **meaningful, descriptive error** (not a generic 400/403).
- On successful cancellation:
  - Update order status to `cancelled`.
  - Initiate a **Stripe refund** for the amount collected, if payment was already captured.

### Business Rules
- Only the **authenticated order owner** may retrieve or cancel their own order.
- Cancellation is only permitted when the order is in an **allowable state** (e.g., `confirmed` — before the restaurant begins preparing).
- Once an order is in `preparing`, `out_for_delivery`, or `delivered` status, cancellation must be **rejected**.
- Stripe refund must be initiated **atomically with order cancellation** — if refund initiation fails, cancellation should be rolled back or flagged for manual review.
- Real-time status pushes must be **authenticated** — only the order owner's connected client should receive updates for their order.

### Constraints
- Real-time transport: **Socket.io** or **Server-Sent Events (SSE)** — final choice to be confirmed.
- Depends entirely on the order model, status fields, and Stripe integration from **Issue #10**.
- Stripe refund is triggered by the application, not by webhook — this is a direct Stripe API call on cancellation.
- Order status transitions (e.g., `confirmed → preparing`) are triggered by an **admin/restaurant-side action** — confirm whether this is in scope or via a separate issue.

---

## 4. Phase 2 — Design

### Architecture Decisions
- Use **Socket.io** as the default real-time transport, with SSE as a fallback option (confirm with team).
- Create a dedicated **`OrderGateway`** (WebSocket gateway) or **`OrderSSEController`** that handles client subscriptions and broadcasts order status events.
- Each connected client must **join a private room** scoped to their `orderId` (Socket.io rooms) upon connection — this prevents cross-user data leakage.
- Order status transitions should emit events through a **centralized `OrderEventsService`** that is called by any service that updates order status (admin updates, webhook updates, etc.).
- Stripe refund logic should be encapsulated in the existing `StripeService` (from Issue #10) as a `createRefund(paymentIntentId, amount?)` method.
- Use a **database transaction** to wrap: order status update to `cancelled` + Stripe refund initiation. On Stripe failure, roll back or flag for manual intervention.

### Data Models

**Order Status Enum** *(extends Issue #10)*
```ts
OrderStatus {
  PENDING          = 'pending',
  CONFIRMED        = 'confirmed',
  PREPARING        = 'preparing',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED        = 'delivered',
  CANCELLED        = 'cancelled'
}
```

**Order** *(existing from Issue #10, extended)*
```ts
Order {
  id: string;
  userId: string;
  restaurantId: string;
  items: OrderItem[];
  status: OrderStatus;
  stripePaymentIntentId: string;
  stripeRefundId?: string;           // populated on cancellation
  cancelledAt?: DateTime;
  cancellationReason?: string;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

**Real-Time Event Payload**
```ts
OrderStatusUpdateEvent {
  orderId: string;
  previousStatus: OrderStatus;
  currentStatus: OrderStatus;
  updatedAt: DateTime;
  estimatedDeliveryTime?: string;
}
```

**Cancellation Response (Error)**
```ts
CancellationErrorResponse {
  statusCode: 422;
  error: 'UnprocessableEntity';
  message: string;   // e.g., "Order cannot be cancelled — restaurant has already begun preparing your order."
  currentStatus: OrderStatus;
}
```

### API Contracts

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/orders` | ✅ Required | Retrieve paginated order history for authenticated user |
| `GET` | `/orders/:id` | ✅ Required | Retrieve current status and full details of a specific order |
| `POST` | `/orders/:id/cancel` | ✅ Required | Cancel an order within the allowed window; trigger Stripe refund |

### WebSocket / SSE Event Contracts

**Socket.io**
```ts
// Client subscribes on connection
socket.emit('subscribe:order', { orderId: 'abc123' });

// Server emits on status change
socket.to(orderId).emit('order:status_updated', OrderStatusUpdateEvent);
```

**SSE** *(if chosen)*
```
GET /orders/:id/status/stream    (EventStream)
Content-Type: text/event-stream

event: order_status_updated
data: { "orderId": "abc123", "currentStatus": "preparing", "updatedAt": "..." }
```

### Order Status Transition Rules

```
PENDING          → CONFIRMED          (by Stripe webhook — Issue #10)
CONFIRMED        → PREPARING          (by restaurant/admin action)
PREPARING        → OUT_FOR_DELIVERY   (by restaurant/admin action)
OUT_FOR_DELIVERY → DELIVERED          (by delivery agent / admin action)
CONFIRMED        → CANCELLED          ✅ Allowed (refund triggered)
PREPARING        → CANCELLED          ❌ Rejected
OUT_FOR_DELIVERY → CANCELLED          ❌ Rejected
DELIVERED        → CANCELLED          ❌ Rejected
```

### Key Modules & Services

| Module / Service | Responsibility |
|---|---|
| `OrderQueryService` | Handles `GET /orders` and `GET /orders/:id` — retrieval and authorization |
| `OrderCancellationService` | Cancellation business-rule enforcement, status update, refund coordination |
| `OrderEventsService` | Centralized event emitter for order status changes; called by all status-updating services |
| `OrderGateway` *(Socket.io)* | WebSocket gateway managing client rooms, subscriptions, and status event broadcasting |
| `StripeService.createRefund()` | Extended from Issue #10; initiates Stripe refund by `paymentIntentId` |

---

## 5. Phase 3 — Implementation

### Backend Tasks

**Order Retrieval Module**
- [ ] Implement `GET /orders/:id`:
  - Validate that the order belongs to the authenticated user.
  - Return full order details including current status, items, totals, and timestamps.
  - Return `404` if order not found; `403` if user is not the order owner.
- [ ] Implement `GET /orders`:
  - Return paginated order history for the authenticated user.
  - Support query parameters: `page`, `perPage`, `status` (optional filter).
  - Sort by `createdAt` descending by default.

**Real-Time Order Tracking Module**
- [ ] Set up **Socket.io** server integration (or SSE controller — confirm with team).
- [ ] Implement `OrderGateway`:
  - Authenticate WebSocket connections using JWT (validate token on handshake).
  - Handle `subscribe:order` event — validate that the requesting user owns the order; add socket to a private room keyed by `orderId`.
  - Handle client disconnection and room cleanup.
- [ ] Implement `OrderEventsService`:
  - Expose a `emitStatusUpdate(orderId, previousStatus, currentStatus)` method.
  - Broadcast `order:status_updated` event to the correct Socket.io room.
- [ ] Hook `OrderEventsService.emitStatusUpdate()` into every service that updates order status:
  - Stripe webhook handler (Issue #10) — on `confirmed`.
  - Admin/restaurant status update endpoint — on `preparing`, `out_for_delivery`, `delivered`.
  - `OrderCancellationService` — on `cancelled`.

**Order Cancellation Module**
- [ ] Implement `POST /orders/:id/cancel`:
  - Validate order ownership (authenticated user must own the order).
  - Enforce cancellation business rules:
    - Allow if `status === 'confirmed'`.
    - Reject with `422 Unprocessable Entity` and descriptive message if status is `preparing`, `out_for_delivery`, or `delivered`.
  - Within a **database transaction**:
    - Update order `status` to `cancelled`, set `cancelledAt` timestamp.
    - Call `StripeService.createRefund(stripePaymentIntentId)`.
    - On Stripe refund success: persist `stripeRefundId` on the order.
    - On Stripe refund failure: roll back order status update; log the failure; flag for manual review.
  - Emit `order:status_updated` event via `OrderEventsService`.

**Stripe Refund Extension**
- [ ] Extend `StripeService` with `createRefund(paymentIntentId, amount?)`:
  - Call Stripe Refunds API with `payment_intent` as the source.
  - Support full refund by default; partial refund if `amount` is specified.
  - Return `refundId` on success; throw structured error on failure.

### Database Tasks
- [ ] Add `stripe_refund_id` column to `orders` table (nullable string).
- [ ] Add `cancelled_at` column to `orders` table (nullable timestamp).
- [ ] Add `cancellation_reason` column to `orders` table (nullable string).
- [ ] Write and run migrations for the new columns.
- [ ] Add index on `orders.status` to support filtered order history queries efficiently.

### Integration Tasks
- [ ] Integrate `OrderEventsService` with the **Stripe webhook handler** from Issue #10 so `confirmed` status pushes a real-time event.
- [ ] Integrate Socket.io (or SSE) into the application server bootstrap — ensure it shares the HTTP server instance.
- [ ] Ensure Socket.io **JWT authentication middleware** on the WebSocket handshake reuses the same token validation logic as HTTP routes.
- [ ] Wire `OrderCancellationService` to emit real-time events via `OrderEventsService` on successful cancellation.

---

## 6. Phase 4 — Testing

### Unit Tests
- `OrderCancellationService`:
  - Verify cancellation succeeds when status is `confirmed`.
  - Verify cancellation is rejected with correct error message when status is `preparing`.
  - Verify cancellation is rejected when status is `out_for_delivery`.
  - Verify cancellation is rejected when status is `delivered`.
  - Verify `StripeService.createRefund` is called with the correct `paymentIntentId`.
  - Verify order status is rolled back if Stripe refund fails.
- `OrderEventsService`:
  - Verify `emitStatusUpdate` broadcasts to the correct Socket.io room.
  - Verify event payload contains correct `orderId`, `previousStatus`, `currentStatus`, and `updatedAt`.
- `StripeService.createRefund`:
  - Verify correct Stripe API call with `paymentIntentId` (mock Stripe SDK).
  - Verify structured error is thrown on Stripe failure.
- `OrderGateway`:
  - Verify unauthenticated WebSocket connections are rejected.
  - Verify a user cannot subscribe to another user's order room.

### Integration Tests
- `GET /orders/:id`:
  - Verify correct order details are returned for the authenticated owner.
  - Verify `403` is returned when a different user requests the order.
  - Verify `404` is returned for a non-existent order ID.
- `GET /orders`:
  - Verify paginated order history is returned for the authenticated user.
  - Verify `status` filter query param returns only orders matching that status.
- `POST /orders/:id/cancel`:
  - Verify full cancellation flow: status updated to `cancelled`, Stripe refund initiated, real-time event emitted.
  - Verify `422` response with descriptive message when order is in `preparing` status.
  - Verify `403` response when a different user attempts cancellation.
- WebSocket real-time flow:
  - Verify client receives `order:status_updated` event when order status changes.
  - Verify client does **not** receive events for orders they do not own.

### Validation Scenarios
- [ ] `GET /orders/:id` returns the **correct current status** immediately after a status transition.
- [ ] Real-time event is received by the client **within an acceptable latency window** after a status update.
- [ ] Cancelling an order in `confirmed` state: order status becomes `cancelled`, Stripe refund `id` is stored, client receives real-time `cancelled` event.
- [ ] Cancelling an order in `preparing` state: returns `422` with message — *"Order cannot be cancelled — restaurant has already begun preparing your order."*
- [ ] Stripe refund failure during cancellation: order status is **not updated** to `cancelled`; failure is logged.
- [ ] Two simultaneous cancellation requests for the same order (race condition): only **one succeeds**; the second receives an appropriate error.
- [ ] WebSocket connection with an **expired or invalid JWT** is rejected at handshake.
- [ ] A client subscribing to an order they **do not own** receives a `forbidden` error — no data is leaked.
- [ ] `GET /orders` pagination returns the **correct page and count** of orders.

---

## 7. Risks

| Risk | Type | Mitigation |
|---|---|---|
| Issue #10 (Order model, Stripe integration) not complete blocks all implementation tasks | Dependency Risk | Scaffold modules with stubs; do not merge until Issue #10 is confirmed complete |
| Race condition: two concurrent cancellation requests updating the same order simultaneously | Technical Risk | Use database-level row locking (`SELECT FOR UPDATE`) or optimistic concurrency control on order updates |
| Stripe refund API failure leaving order in inconsistent state (cancelled UI but no refund) | Technical Risk | Wrap in a transaction; on failure, revert status and log to a `failed_refunds` audit table for manual review |
| WebSocket connections not authenticated — potential data leakage between users | Technical Risk | Enforce JWT validation on Socket.io handshake; scope all room subscriptions to verified `userId` |
| Order status transitions (e.g., `confirmed → preparing`) triggered by admin/restaurant not defined in this issue | Requirement Gap | Confirm whether the admin/restaurant-side status update endpoint is in scope for this issue or a separate ticket |
| Cancellation window definition not precisely specified (only "before restaurant confirms" mentioned) | Requirement Gap | Confirm exact cancellation-eligible statuses and whether a time-based window (e.g., within 2 minutes of placing) also applies |
| Partial refund scenarios not addressed (e.g., item-level cancellations) | Requirement Gap | Confirm whether refunds are always full-order refunds or if partial/item-level refunds are needed |
| Socket.io vs. SSE choice not finalized — impacts server setup and client integration | Requirement Gap | Confirm real-time transport decision before beginning `OrderGateway` implementation |
| Scaling WebSocket connections across multiple server instances requires shared state | Technical Risk | Use Redis adapter for Socket.io (`socket.io-redis`) if the service runs on multiple nodes |

---

## 8. Approval Questions

1. **Real-Time Transport** — Should the backend use **Socket.io (WebSocket)** or **Server-Sent Events (SSE)**? Each has different client integration implications.
2. **Cancellation Window** — Is cancellation only allowed when status is **`confirmed`**, or is there also a **time-based window** (e.g., "within 5 minutes of order placement, regardless of status")?
3. **Cancellation Reason** — Should the user be required to provide a **cancellation reason**, or is it optional/not collected?
4. **Admin/Restaurant Status Updates** — Is the endpoint to update order status (`confirmed → preparing → out_for_delivery → delivered`) **in scope for this issue**, or is it a separate restaurant-facing admin issue?
5. **Partial Refunds** — Are refunds always **full order refunds**, or should the backend support **partial item-level refunds**?
6. **Refund Failure Handling** — If the Stripe refund fails after cancellation, should the order be: (a) reverted to its previous status, (b) kept as `cancelled` but flagged for manual refund, or (c) placed in a `cancellation_pending_refund` status?
7. **Multi-Instance Scaling** — Will the backend run on **multiple server instances**? If yes, a Redis adapter for Socket.io will be required.
8. **Order History Filters** — Should `GET /orders` support filtering by **status**, **date range**, or **restaurant**, beyond basic pagination?
9. **Push Notifications** — Should order status changes also trigger **push notifications** (e.g., FCM/APNs) in addition to real-time WebSocket/SSE events, or is that a separate issue?
10. **Delivered Confirmation** — Is the `delivered` status transition triggered by the **delivery agent**, the **system**, or confirmed by the **customer** (e.g., "Confirm Receipt" button)?

---

## 9. Final Recommendation

> ⚠️ **Requires Clarification**

Issue #12 is architecturally well-defined with clear API contracts and a logical real-time event model. However, **critical business rule gaps** — specifically the exact cancellation window, refund failure handling strategy, partial refund support, and the scope of admin/restaurant status update endpoints — must be resolved before implementation to prevent significant rework.

The single dependency on **Issue #10** is the most impactful blocker. All order retrieval, cancellation, and refund tasks directly rely on the order model and Stripe service delivered in that issue. Real-time transport selection (Socket.io vs. SSE) must also be confirmed before the `OrderGateway` implementation begins.

**Once the approval questions are answered**, this issue is ready for active backend development.

---

*Plan approved and generated on 2026-06-26 by Sprint Planning Agent.*
