# Implementation Plan — Issue #13

---

## 1. Issue Summary

| Field | Details |
|---|---|
| **Issue Number** | #13 |
| **Title** | Implement Frontend Order Tracking and Cancellation Screens |
| **Priority** | 🔴 High |
| **ADLC Phase** | Development |
| **Labels** | `development`, `high-priority`, `order-tracking`, `frontend`, `cancellation` |
| **Dependencies** | #5 — Design UX Flows and UI Wireframes for All App Screens · #12 — Implement Backend Real-Time Order Tracking and Order Cancellation |
| **Assigned Agent** | Frontend Development Agent |

---

## 2. Objective

Build the complete frontend experience for real-time order lifecycle visibility and user-initiated cancellation. This includes an order tracking screen with a live progress stepper driven by WebSocket or SSE events, a dynamically updating estimated delivery time, a context-aware cancel button with confirmation modal, clearly communicated cancellation success and error feedback, and a paginated order history screen listing all past orders with their statuses and totals. All screens must integrate with the backend APIs and real-time transport delivered in Issue #12.

---

## 3. Phase 1 — Requirement Analysis

### Functional Requirements

**Order Tracking Screen**
- Display the **current order status** in real time using a **progress stepper** component with the following steps: `Confirmed → Preparing → Out for Delivery → Delivered`.
- Consume live status updates from the backend via **WebSocket (Socket.io) or SSE** — the active step in the stepper must update automatically when a new event is received.
- Display the **estimated delivery time**, which must update dynamically as status transitions occur.
- The **Cancel Order button** must be visible and active **only when cancellation is permitted** (i.e., when the order is in `confirmed` status); it must be hidden or disabled for all other statuses.

**Order Cancellation UI**
- Tapping "Cancel Order" must display a **confirmation modal** prompting the user to confirm intent before submission.
- On confirmation, call `POST /orders/:id/cancel` and handle both outcomes:
  - **Success**: display a clear success state (e.g., "Your order has been cancelled. A refund has been initiated.") and update the stepper to reflect `cancelled` status.
  - **Error**: display a descriptive, user-facing error message (e.g., "This order can no longer be cancelled.") and allow dismissal without losing tracking state.

**Order History Screen**
- Display a **paginated list of past orders** for the authenticated user.
- Each order entry must show: **order ID, restaurant name, date placed, order status badge, and total amount**.
- Tapping an order entry must navigate to the **Order Tracking Screen** for that order.

### Business Rules
- The **Cancel Order button visibility** must be driven by the current order status received from the backend — never by a client-side assumption.
- Live status updates must be consumed **only for orders owned by the authenticated user** — no cross-user data.
- The confirmation modal must **prevent accidental cancellation** — the user must explicitly confirm.
- The WebSocket/SSE connection must be **established on Order Tracking Screen mount** and **torn down on unmount** to prevent memory leaks and stale subscriptions.
- If the real-time connection is unavailable, the screen must **fall back gracefully** (e.g., poll `GET /orders/:id` or display a connectivity notice).

### Constraints
- Framework: **React / React Native** (consistent with Issues #9, #11).
- Real-time transport: **Socket.io (WebSocket) or SSE** — must match the transport chosen in Issue #12.
- Progress indicator: **Stepper component** (as specified in the issue assumptions).
- UI must follow wireframes and UX flows from **Issue #5**.
- All API calls require a valid authenticated user session/token.

---

## 4. Phase 2 — Design

### Architecture Decisions
- Implement a **`useOrderTracking` hook** that manages WebSocket/SSE connection lifecycle, incoming status events, and order state — keeping components stateless and focused on rendering.
- The hook must handle: connection setup on mount, event subscription to the correct `orderId` room, state updates on incoming events, and disconnection on unmount.
- Implement a **`useOrderHistory` hook** that manages paginated `GET /orders` API calls and order list state.
- The `CancellationModal` must be a **controlled component** — its open/close state is owned by the parent screen, not internal state.
- Cancellation feedback (success/error) must be rendered **inline within the tracking screen** rather than navigating away, so the user retains context.

### Data Models (Frontend)

**Order Tracking State**
```ts
OrderTrackingState {
  orderId: string;
  status: 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  estimatedDeliveryTime?: string;
  restaurantName: string;
  items: OrderItem[];
  total: number;
  isCancellable: boolean;         // derived from status === 'confirmed'
  cancellationStatus: 'idle' | 'pending' | 'success' | 'error';
  cancellationError?: string;
}
```

**Order History Item**
```ts
OrderHistoryItem {
  id: string;
  restaurantName: string;
  placedAt: DateTime;
  status: OrderStatus;
  total: number;
}
```

**Real-Time Event (consumed from Issue #12)**
```ts
OrderStatusUpdateEvent {
  orderId: string;
  previousStatus: OrderStatus;
  currentStatus: OrderStatus;
  updatedAt: DateTime;
  estimatedDeliveryTime?: string;
}
```

### Stepper Configuration

| Step | Label | Active When Status Is |
|---|---|---|
| 1 | Order Confirmed | `confirmed` |
| 2 | Preparing | `preparing` |
| 3 | Out for Delivery | `out_for_delivery` |
| 4 | Delivered | `delivered` |
| — | Cancelled | `cancelled` *(special cancelled state — stepper replaced or marked)* |

### API Integration

| Method | Endpoint | Used On | Purpose |
|---|---|---|---|
| `GET` | `/orders/:id` | Tracking Screen mount | Fetch initial order state before WebSocket/SSE connection |
| `POST` | `/orders/:id/cancel` | Cancellation confirm | Submit cancellation request |
| `GET` | `/orders` | History Screen | Fetch paginated order history |

### Real-Time Integration (WebSocket/SSE)

**Socket.io (if chosen in Issue #12)**
```ts
// On OrderTrackingScreen mount
socket.emit('subscribe:order', { orderId });

// Listen for status updates
socket.on('order:status_updated', (event: OrderStatusUpdateEvent) => {
  updateOrderStatus(event.currentStatus);
  updateEstimatedDelivery(event.estimatedDeliveryTime);
});

// On unmount
socket.off('order:status_updated');
socket.emit('unsubscribe:order', { orderId });
```

**SSE (if chosen in Issue #12)**
```ts
const eventSource = new EventSource(`/orders/${orderId}/status/stream`);
eventSource.onmessage = (e) => {
  const event: OrderStatusUpdateEvent = JSON.parse(e.data);
  updateOrderStatus(event.currentStatus);
};
// On unmount: eventSource.close();
```

### Key Components

| Component | Screen | Purpose |
|---|---|---|
| `OrderTrackingScreen` | Tracking | Root screen — fetches initial state, manages WebSocket/SSE, renders stepper and cancellation UI |
| `OrderStatusStepper` | Tracking | Visual progress stepper with steps: Confirmed → Preparing → Out for Delivery → Delivered |
| `EstimatedDeliveryBadge` | Tracking | Displays and dynamically updates estimated delivery time |
| `CancelOrderButton` | Tracking | Conditionally rendered; visible only when `isCancellable === true` |
| `CancellationModal` | Tracking | Confirmation modal with confirm/dismiss actions |
| `CancellationFeedback` | Tracking | Inline success/error message after cancellation attempt |
| `OrderHistoryScreen` | History | Paginated list of past orders |
| `OrderHistoryCard` | History | Single order entry: ID, restaurant, date, status badge, total |
| `OrderStatusBadge` | History & Tracking | Coloured status pill (e.g., green for Delivered, red for Cancelled) |
| `SkeletonLoader` | All | Loading placeholder during initial API fetch |
| `EmptyOrderHistory` | History | Shown when user has no past orders |
| `ConnectionErrorBanner` | Tracking | Displayed when WebSocket/SSE connection is unavailable |

---

## 5. Phase 3 — Implementation

### Frontend Tasks

**Order Tracking Screen**
- [ ] Build `OrderTrackingScreen` — on mount, call `GET /orders/:id` to fetch initial order state before establishing real-time connection.
- [ ] Implement `useOrderTracking` hook:
  - Establish Socket.io / SSE connection on mount scoped to `orderId`.
  - Update order status state on incoming `order:status_updated` events.
  - Tear down connection cleanly on unmount.
  - Implement polling fallback (`GET /orders/:id`) if WebSocket/SSE connection fails.
- [ ] Build `OrderStatusStepper` component — highlight the active step based on current `status`; render a special `cancelled` visual state when status is `cancelled`.
- [ ] Build `EstimatedDeliveryBadge` — display and reactively update estimated delivery time from real-time event payload.
- [ ] Build `CancelOrderButton` — conditionally render based on `isCancellable` flag; disable with tooltip/message when cancellation is not permitted.
- [ ] Build `CancellationModal` — display order summary and cancel confirmation copy; expose `onConfirm` and `onDismiss` callbacks.
- [ ] Implement cancellation flow:
  - On confirm: call `POST /orders/:id/cancel`.
  - On success: close modal, update stepper to `cancelled`, render `CancellationFeedback` (success state).
  - On error: close modal, render `CancellationFeedback` (error state with backend error message).
- [ ] Build `ConnectionErrorBanner` — display when real-time connection is lost; hide when reconnected.
- [ ] Add `SkeletonLoader` for the tracking screen during initial `GET /orders/:id` fetch.

**Order History Screen**
- [ ] Build `OrderHistoryScreen` — fetch paginated order list via `GET /orders` on mount.
- [ ] Implement `useOrderHistory` hook — manages order list state, pagination cursor, and loading state.
- [ ] Build `OrderHistoryCard` — render order ID, restaurant name, date, `OrderStatusBadge`, and total; navigate to `OrderTrackingScreen` on tap.
- [ ] Build `OrderStatusBadge` — colour-coded pill for each possible status (`confirmed`, `preparing`, `out_for_delivery`, `delivered`, `cancelled`).
- [ ] Implement **pagination / infinite scroll** on the order history list.
- [ ] Build `EmptyOrderHistory` component — displayed when the user has no past orders.
- [ ] Add `SkeletonLoader` for the order history list during initial fetch.

### State Management Tasks
- [ ] Implement `useOrderTracking` hook to centralize order tracking state, real-time event handling, and cancellation request state.
- [ ] Implement `useOrderHistory` hook to centralize paginated history state and fetch logic.
- [ ] Ensure WebSocket/SSE connections are scoped per screen and properly cleaned up — no global persistent connections.

### Integration Tasks
- [ ] Integrate Socket.io client or native `EventSource` (SSE) — must match transport confirmed in Issue #12.
- [ ] Authenticate WebSocket connection with user JWT (passed in handshake `auth` or `Authorization` header for SSE).
- [ ] Subscribe to the correct `orderId` room/channel on connection.
- [ ] Handle API error responses from `POST /orders/:id/cancel` with user-facing inline messages.
- [ ] Handle `GET /orders` and `GET /orders/:id` HTTP errors gracefully.

### Database Tasks
*(Not applicable — frontend only; data sourced from Issue #12 APIs)*

---

## 6. Phase 4 — Testing

### Unit Tests
- `OrderStatusStepper`:
  - Verify each status highlights the correct active step.
  - Verify `cancelled` status renders a distinct cancelled visual state.
- `CancelOrderButton`:
  - Verify button renders when `isCancellable === true`.
  - Verify button is hidden/disabled when `isCancellable === false`.
- `CancellationModal`:
  - Verify modal opens when cancel button is tapped.
  - Verify `onConfirm` callback is invoked on confirm tap.
  - Verify `onDismiss` callback closes modal without submitting cancellation.
- `CancellationFeedback`:
  - Verify success message renders after successful cancellation.
  - Verify error message renders with backend-provided error text after failed cancellation.
- `OrderHistoryCard`:
  - Verify correct rendering of order ID, restaurant name, date, status badge, and total.
  - Verify navigation to `OrderTrackingScreen` on tap.
- `OrderStatusBadge`:
  - Verify correct colour and label for each possible status value.
- `useOrderTracking` hook:
  - Verify Socket.io/SSE subscription is established on mount.
  - Verify status state updates when `order:status_updated` event is received.
  - Verify connection is torn down on unmount.
  - Verify polling fallback activates when WebSocket/SSE connection fails.

### Integration Tests
- `OrderTrackingScreen`:
  - Verify `GET /orders/:id` is called on mount and populates initial state.
  - Verify stepper updates when a live `order:status_updated` event is received.
  - Verify `CancelOrderButton` appears when status is `confirmed` and disappears on status change to `preparing`.
  - Verify cancellation modal displays on cancel button tap.
  - Verify successful `POST /orders/:id/cancel` updates UI to cancelled state and displays success feedback.
  - Verify failed `POST /orders/:id/cancel` displays error feedback without changing stepper state.
- `OrderHistoryScreen`:
  - Verify `GET /orders` populates the order list on mount.
  - Verify pagination / infinite scroll fetches the next page when the user scrolls to the end.
  - Verify `EmptyOrderHistory` renders when the user has no past orders.
  - Verify tapping an order navigates to `OrderTrackingScreen` with the correct `orderId`.

### Validation Scenarios
- [ ] Stepper **automatically advances** to the next step when a real-time status event is received — without manual refresh.
- [ ] **Estimated delivery time** updates dynamically when a new value is received in the status event payload.
- [ ] **Cancel button is hidden** when order status is `preparing`, `out_for_delivery`, or `delivered`.
- [ ] Cancellation modal **cannot be bypassed** — order is never cancelled without explicit user confirmation.
- [ ] **Success feedback** after cancellation includes refund notice copy.
- [ ] **Error feedback** after a failed cancellation is specific and actionable — not a generic error message.
- [ ] **Connection error banner** appears when WebSocket/SSE connection is lost; disappears on reconnect.
- [ ] Screens render correctly on **multiple screen sizes** (responsive / adaptive layout).
- [ ] **Unauthenticated users** are redirected to the login screen when accessing tracking or history.
- [ ] **Back navigation from tracking screen** tears down the WebSocket/SSE connection cleanly.
- [ ] `SkeletonLoader` is displayed on both screens while initial API calls are in flight.

---

## 7. Risks

| Risk | Type | Mitigation |
|---|---|---|
| Issue #5 (wireframes) not finalized blocks stepper layout, cancellation modal design, and history card design | Dependency Risk | Confirm wireframes are approved and accessible before building visual components |
| Issue #12 (backend real-time APIs) not ready blocks all WebSocket/SSE integration and cancellation API calls | Dependency Risk | Use mock Socket.io/SSE event emitters and stub API responses to develop and test screens in parallel |
| Real-time transport selection (Socket.io vs. SSE) not yet confirmed in Issue #12 — divergent client implementations | Dependency Risk | Confirm transport in Issue #12 before building `useOrderTracking`; abstract connection logic behind an interface to allow easy swap |
| WebSocket connection not cleaned up on screen unmount — causes memory leaks and stale event listeners | Technical Risk | Enforce cleanup in `useOrderTracking`'s `useEffect` return function; add unmount tests |
| User receives status updates for another user's order if socket room is misconfigured | Technical Risk | Validate `orderId` ownership server-side (Issue #12) before adding to room; never trust client-provided room name alone |
| Cancellation API error message is generic — poor UX | Requirement Gap | Confirm that backend (Issue #12) returns descriptive, user-facing error messages; align error copy with UX team |
| Estimated delivery time format and update frequency not specified | Requirement Gap | Confirm expected format (e.g., "30–45 min", absolute time "2:30 PM") and whether it updates on every status transition or only specific ones |
| No explicit handling specified for the case where the user opens the tracking screen for a `delivered` or `cancelled` order | Requirement Gap | Confirm expected UI for terminal order states — static summary, redirect to history, or read-only stepper |
| Polling fallback frequency for offline/failed WebSocket could cause excessive API load | Technical Risk | Use exponential backoff for polling; cap at a maximum retry interval (e.g., 30 seconds) |

---

## 8. Approval Questions

1. **Real-Time Transport** — Should the frontend use **Socket.io** or **SSE**? This must align with the transport decision confirmed in Issue #12.
2. **Stepper Cancelled State** — When an order is cancelled, should the stepper show a **distinct cancelled visual** (e.g., red X on the active step), **replace the stepper with a cancellation card**, or **hide the stepper entirely**?
3. **Estimated Delivery Time Format** — Should estimated delivery time be displayed as a **countdown** (e.g., "~25 min"), a **relative label** (e.g., "30–45 min"), or an **absolute time** (e.g., "Arriving by 2:30 PM")?
4. **Delivered / Cancelled Order Tracking** — When a user navigates to the tracking screen for a **`delivered` or `cancelled` order**, what should be shown — a **read-only summary**, a **redirect to order history**, or a **static status card**?
5. **Cancellation Success Copy** — Should the cancellation success message explicitly state that a **refund has been initiated**, and if so, should it include an **estimated refund timeline**?
6. **Order History Navigation** — Should tapping a **`delivered` or `cancelled`** order in history navigate to the order tracking screen (read-only), or to a separate **order detail/receipt screen**?
7. **History Filters** — Should the order history screen support **filtering by status** (e.g., show only "Delivered" orders) or **date range**?
8. **Platform** — Confirm: is this **React Native (mobile)**, **React (web)**, or **both**? (Consistent with Issues #9 and #11.)
9. **Accessibility** — Are there **WCAG or a11y compliance** requirements for the stepper and modal components?
10. **Push Notifications** — If the user has the app **backgrounded or closed**, should order status updates also arrive via **push notifications** (FCM/APNs)? Is that in scope for this issue or a separate one?

---

## 9. Final Recommendation

> ⚠️ **Requires Clarification**

Issue #13 is well-structured with clear acceptance criteria and a coherent real-time frontend model. However, **several UX definition gaps** — including the cancelled stepper state, estimated delivery time format, terminal order screen behavior, and order history navigation — must be confirmed before building the visual components to avoid rework.

The two active dependency risks on **Issue #5** (wireframes) and **Issue #12** (backend real-time APIs) must be resolved or stubbed before integration begins. The real-time transport selection (Socket.io vs. SSE) confirmed in Issue #12 is a hard prerequisite for `useOrderTracking` implementation.

**Once the approval questions are answered**, this issue is ready for active frontend development.

---

*Plan approved and generated on 2026-06-26 by Sprint Planning Agent.*
