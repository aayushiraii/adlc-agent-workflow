# Implementation Plan — Issue #4
# Design System Architecture and Database Schema for Food Delivery Platform

---

## Issue Summary

| Field | Details |
|---|---|
| **Issue Number** | #4 |
| **Title** | Design System Architecture and Database Schema for Food Delivery Platform |
| **Priority** | High |
| **ADLC Phase** | Design |
| **Labels** | `high-priority`, `design`, `architecture` |
| **Dependencies** | #1 — User Registration and Login, #2 — Restaurant Browsing and Discovery, #3 — Cart, Payment, Order Tracking, and Cancellation |
| **State** | Open |

---

## Objective

This issue aims to produce the **complete system architecture and database schema** for the food delivery platform. It covers service decomposition, database entity relationships, REST API contracts, infrastructure topology, and technology stack finalization. The output will act as the single authoritative design blueprint that guides all downstream implementation, integration, and infrastructure work.

---

## Phase 1 — Requirement Analysis

### Functional Requirements
- Define **service boundaries** for each domain: Auth, Restaurant, Order, Payment, Notification.
- Produce a **high-level system architecture diagram** illustrating service interactions, data flows, and infrastructure topology.
- Design a **relational database schema (ERD)** covering: Users, Restaurants, Menus, Menu Items, Carts, Orders, Order Items, Payments, Cancellations, Notifications.
- Document **core REST API contracts** including endpoint paths, HTTP methods, request bodies, and response shapes for all major workflows.
- Finalize and document the **technology stack** across backend, frontend, database, caching, messaging, and infrastructure layers.
- Address **non-functional requirements** including scalability targets, latency SLAs, availability goals, and security requirements.

### Business Rules
- Each service must own its **data store exclusively** — no cross-service direct database access (if microservices architecture is chosen).
- Inter-service communication must be defined as either **synchronous REST** or **asynchronous messaging** (event-driven), with explicit justification per interaction.
- The architecture must support **horizontal scaling** of high-throughput services (Order, Payment, Restaurant).
- The database schema must enforce **referential integrity** via foreign keys and appropriate constraints.
- All API endpoints must follow consistent **RESTful naming conventions** and versioning strategy (e.g., `/api/v1/`).

### Constraints
- **PostgreSQL** is the designated relational database for all persistent domain data.
- **Redis** is the designated store for session management, caching, and ephemeral cart state.
- **React** (web) and **React Native** (mobile) are the designated frontend technologies.
- The architecture must account for **PCI-DSS** compliance requirements, particularly for the Payment Service.
- The design must remain deployable on standard cloud infrastructure (AWS, GCP, or Azure).
- All dependent issues (#1, #2, #3) must be completed and their requirements finalized before this design is locked.

---

## Phase 2 — Design

### Architecture Decisions

**Deployment Pattern**
- Evaluate and select between:
  - **Modular Monolith** — Single deployable unit with clearly separated internal modules (lower operational overhead, suitable for early-stage).
  - **Microservices** — Independently deployable services per domain (higher operational complexity, better long-term scalability).
- Recommended starting point: **Modular Monolith** with clean service module boundaries, designed for future extraction into microservices.

**Service Decomposition**

| Service | Responsibilities |
|---|---|
| **Auth Service** | User registration, login, JWT issuance and validation, OAuth (social login), token refresh |
| **User Service** | User profile management, saved addresses, preferences |
| **Restaurant Service** | Restaurant listings, search, filters, geo-sorting, menu and menu item management |
| **Cart Service** | Cart state management, item add/update/remove, restaurant conflict resolution |
| **Order Service** | Order placement, lifecycle state machine, order history |
| **Payment Service** | Stripe integration, payment initiation/confirmation, refund processing |
| **Notification Service** | Event-driven dispatch of Email, Push, and SMS notifications |
| **Tracking Service** | Real-time order status broadcasting via WebSockets |

**Communication Patterns**
- Synchronous REST — for client-facing API calls and time-sensitive inter-service calls (e.g., payment confirmation triggering order update).
- Asynchronous Messaging (e.g., RabbitMQ or AWS SQS/SNS) — for notification dispatch, order status events, and audit logging.

**Infrastructure Topology**
- API Gateway — Single entry point for all client requests; handles routing, authentication, and rate limiting.
- Load Balancer — Distributes traffic across service instances.
- CDN — Serves static frontend assets and media (restaurant/menu images).
- Object Storage (e.g., AWS S3) — Stores restaurant and menu item images.
- Redis Cluster — Shared caching layer and session store.
- PostgreSQL (Primary + Read Replica) — Relational data persistence with read scaling.
- Message Broker (RabbitMQ / AWS SQS) — Async event bus for inter-service communication.

---

### Database Schema (ERD Overview)

**users**
`id`, `email`, `passwordHash`, `fullName`, `phone`, `oauthProvider`, `oauthProviderId`, `isVerified`, `createdAt`, `updatedAt`

**user_addresses**
`id`, `userId (FK)`, `label`, `addressLine1`, `addressLine2`, `city`, `state`, `postalCode`, `lat`, `lng`, `isDefault`, `createdAt`

**restaurants**
`id`, `name`, `cuisineType`, `rating`, `reviewCount`, `priceRange`, `estimatedDeliveryTime`, `lat`, `lng`, `operatingHours (JSONB)`, `isActive`, `createdAt`, `updatedAt`

**menu_categories**
`id`, `restaurantId (FK)`, `name`, `displayOrder`, `createdAt`

**menu_items**
`id`, `categoryId (FK)`, `restaurantId (FK)`, `name`, `description`, `imageUrl`, `price`, `isAvailable`, `createdAt`, `updatedAt`

**carts**
`id`, `userId (FK)`, `restaurantId (FK)`, `createdAt`, `updatedAt`

**cart_items**
`id`, `cartId (FK)`, `menuItemId (FK)`, `quantity`, `unitPrice`, `createdAt`

**orders**
`id`, `userId (FK)`, `restaurantId (FK)`, `deliveryAddressId (FK)`, `status`, `totalAmount`, `deliveryFee`, `discount`, `promoCode`, `paymentMethod`, `paymentStatus`, `placedAt`, `updatedAt`

**order_items**
`id`, `orderId (FK)`, `menuItemId (FK)`, `name`, `quantity`, `unitPrice`, `subtotal`

**payments**
`id`, `orderId (FK)`, `gatewayTransactionId`, `method`, `amount`, `currency`, `status`, `gatewayResponse (JSONB)`, `createdAt`, `updatedAt`

**cancellations**
`id`, `orderId (FK)`, `requestedBy`, `reason`, `refundAmount`, `refundStatus`, `requestedAt`, `resolvedAt`

**notifications_log**
`id`, `userId (FK)`, `orderId (FK)`, `channel`, `event`, `status`, `sentAt`

---

### Core API Contracts (Summary)

**Auth Service**
- `POST /api/v1/auth/register` — Register new user
- `POST /api/v1/auth/login` — Authenticate user, return JWT
- `POST /api/v1/auth/refresh` — Refresh access token
- `POST /api/v1/auth/logout` — Invalidate refresh token
- `POST /api/v1/auth/oauth/:provider` — OAuth login (Google, etc.)

**Restaurant Service**
- `GET /api/v1/restaurants` — List with filters and geo-sort
- `GET /api/v1/restaurants/:id` — Restaurant detail
- `GET /api/v1/restaurants/:id/menu` — Full menu grouped by category
- `GET /api/v1/restaurants/search?q=` — Full-text search

**Cart Service**
- `GET /api/v1/cart` — Get current user's cart
- `POST /api/v1/cart/items` — Add item to cart
- `PUT /api/v1/cart/items/:itemId` — Update item quantity
- `DELETE /api/v1/cart/items/:itemId` — Remove item
- `DELETE /api/v1/cart` — Clear cart

**Order Service**
- `POST /api/v1/orders` — Place order from cart
- `GET /api/v1/orders/:id` — Order detail and status
- `GET /api/v1/orders` — User's order history
- `POST /api/v1/orders/:id/cancel` — Cancel order

**Payment Service**
- `POST /api/v1/payments/initiate` — Create Stripe PaymentIntent
- `POST /api/v1/payments/confirm` — Confirm payment
- `POST /api/v1/payments/webhook` — Stripe webhook receiver

**Tracking Service**
- `WS /api/v1/orders/:id/tracking` — WebSocket for live order status

---

### Technology Stack

| Layer | Technology |
|---|---|
| **Frontend (Web)** | React, TypeScript, TailwindCSS |
| **Frontend (Mobile)** | React Native, TypeScript |
| **Backend** | Node.js / NestJS (or equivalent) |
| **Database** | PostgreSQL |
| **Caching / Sessions** | Redis |
| **Search** | PostgreSQL Full-Text Search (or Elasticsearch for scale) |
| **Geospatial** | PostGIS extension for PostgreSQL |
| **Payment Gateway** | Stripe |
| **Real-Time** | Socket.IO (WebSockets) |
| **Message Broker** | RabbitMQ or AWS SQS |
| **Notifications** | Firebase FCM (Push), SendGrid (Email), Twilio (SMS) |
| **Object Storage** | AWS S3 (or equivalent) |
| **CDN** | CloudFront (or equivalent) |
| **API Gateway** | AWS API Gateway / NGINX |
| **Containerization** | Docker |
| **Orchestration** | Kubernetes or AWS ECS |
| **CI/CD** | GitHub Actions |

---

## Phase 3 — Implementation

### Architecture & Documentation Tasks
- Produce the **high-level system architecture diagram** (services, data flows, infrastructure topology).
- Produce the **database ERD** using a diagramming tool (e.g., dbdiagram.io, Lucidchart, or draw.io).
- Document all **API contracts** with request/response JSON shapes and HTTP status codes.
- Write the **Technology Stack Decision Document** with rationale for each choice.
- Document **non-functional requirements** (NFRs) covering scalability, latency, availability, and security targets.
- Define **inter-service communication contracts** (synchronous vs. asynchronous per interaction).
- Define the **API versioning strategy** and deprecation policy.

### Backend Tasks
- Scaffold the project repository with the chosen architecture pattern (modular monolith or microservices).
- Set up **PostgreSQL** database with initial schema migrations.
- Configure **PostGIS** extension for geospatial queries.
- Set up **Redis** for session and cache management.
- Configure **API Gateway** routing rules for all service endpoints.
- Set up **message broker** (RabbitMQ or SQS) with defined queues/topics per event type.
- Implement **JWT authentication middleware** applied globally across all protected endpoints.
- Set up **Stripe webhook endpoint** with signature verification.

### Frontend Tasks
- Scaffold **React (web)** project with TypeScript and TailwindCSS.
- Scaffold **React Native (mobile)** project with TypeScript.
- Configure API client (e.g., Axios or React Query) with base URL, auth token injection, and error handling interceptors.
- Set up **WebSocket client** for real-time order tracking integration.

### Infrastructure Tasks
- Define **Docker Compose** configuration for local development (PostgreSQL, Redis, RabbitMQ, app services).
- Define **Kubernetes manifests** or **ECS task definitions** for production deployment.
- Configure **CI/CD pipeline** with GitHub Actions for lint, test, build, and deploy stages.
- Set up **S3 bucket** and CDN distribution for static assets and media files.
- Configure **environment variable management** (e.g., AWS Secrets Manager or HashiCorp Vault).

---

## Phase 4 — Testing

### Unit Tests
- Test API Gateway routing rules for correct service resolution.
- Test JWT middleware — valid token passes, expired/invalid token is rejected.
- Test database migration scripts for schema correctness.
- Test geospatial query logic for proximity-based restaurant sorting.
- Test Redis cache hit/miss behavior for restaurant listing responses.

### Integration Tests
- Test end-to-end request flow from API Gateway → Auth Service → protected resource.
- Test database foreign key constraints and cascade behaviors across all tables.
- Test message broker event publishing and consumption across services (order placed → notification dispatched).
- Test Stripe webhook signature verification and event handling.
- Test WebSocket connection establishment and order status event delivery.

### Validation Scenarios
- Architecture diagram accurately reflects all defined services and their interactions.
- Database ERD covers all entities required by Issues #1, #2, and #3.
- All API contracts include at least one success and one error response shape.
- All NFRs (scalability, latency, availability) have documented measurable targets.
- Technology stack document justifies each choice relative to platform requirements.
- Local development environment bootstraps successfully via Docker Compose with all services running.
- CI/CD pipeline successfully runs lint, test, and build on a sample pull request.

---

## Risks

### Technical Risks
- **Architecture pattern lock-in** — Choosing between a modular monolith and microservices early has long-term cost and complexity implications. An incorrect choice creates significant rework.
- **Schema migration complexity** — As requirements evolve post-design, altering the database schema with live data requires careful migration planning to avoid data loss.
- **PostGIS setup complexity** — Geospatial indexing and query tuning can be non-trivial and may introduce performance issues if not properly benchmarked.
- **WebSocket scalability** — Designing the WebSocket infrastructure for multi-instance deployments requires a pub/sub backend (e.g., Redis Pub/Sub) to broadcast events across nodes.
- **Over-engineering risk** — Designing too many services prematurely can introduce unnecessary complexity before the platform reaches scale.

### Dependency Risks
- **Issues #1, #2, #3 must be complete** — This design issue directly depends on all three requirement issues being fully resolved. Any unresolved requirement gaps will result in an incomplete schema or API contract.
- **Third-party service availability** — Design decisions around Stripe, Firebase, SendGrid, and Twilio assume continued availability and stable APIs. Pricing or API changes could force architectural revisions.
- **Technology stack approvals** — Final stack decisions may require organizational or stakeholder approval, which could delay design finalization.

### Requirement Gaps
- **Deployment target** — The specific cloud provider (AWS, GCP, or Azure) has not been confirmed, which affects infrastructure topology decisions.
- **Scalability targets** — Specific NFR targets (e.g., requests per second, p99 latency, uptime SLA) have not been defined in the issue.
- **Multi-tenancy** — It is not specified whether the platform is single-tenant (one city/region) or multi-tenant (multiple cities or franchise operators).
- **Admin/restaurant portal** — Whether an internal admin panel or restaurant-facing management portal is in scope is not addressed.
- **Data residency / compliance** — Regional data storage requirements (e.g., GDPR) are not mentioned.
- **Disaster recovery** — RTO (Recovery Time Objective) and RPO (Recovery Point Objective) targets are not defined.

---

## Approval Questions

1. **Architecture Pattern** — Should the platform be built as a **modular monolith** (recommended for initial launch) or **microservices** (recommended for scale)? Or should it start as a monolith with a documented extraction path?
2. **Cloud Provider** — Which cloud provider is the target deployment environment — **AWS**, **GCP**, or **Azure**?
3. **Scalability Targets** — What are the expected NFR targets? (e.g., concurrent users, requests per second, p99 API latency, uptime SLA)
4. **Multi-Region / Multi-City** — Is the platform intended to operate in a single city/region or across multiple regions from the start?
5. **Admin Portal Scope** — Is an internal admin panel or restaurant management portal in scope for this design phase?
6. **Search Engine** — Should the platform use **PostgreSQL Full-Text Search** (simpler, lower cost) or a dedicated search engine like **Elasticsearch / OpenSearch** (more powerful, higher cost)?
7. **Message Broker** — Should the platform use **RabbitMQ** (self-managed) or a cloud-native queue like **AWS SQS/SNS** (managed)?
8. **API Versioning** — Should API versioning be path-based (`/api/v1/`), header-based (`Accept-Version`), or query-parameter-based?
9. **GDPR / Data Residency** — Are there any data residency or privacy regulation requirements (e.g., GDPR for EU users) that must be reflected in the architecture?
10. **Disaster Recovery** — What are the RTO and RPO targets for the platform? This influences database replication and backup strategy design.

---

## Final Recommendation

> **Status: Blocked by Dependencies**

This issue is fundamentally dependent on the full resolution of Issues **#1**, **#2**, and **#3**. The database schema, API contracts, and service boundaries cannot be finalized until all requirement gaps from those issues — particularly around guest access, COD payments, delivery radius, refund policies, and notification channels — are confirmed and documented.

Additionally, several **architectural decisions** (cloud provider, deployment pattern, scalability targets) require stakeholder approval before the design can be locked. Once dependencies are resolved and the approval questions above are answered, this issue will be **Ready for Development**.

---

*Plan approved and generated on 2026-06-26 by Sprint Planning Agent.*
*Approved by: Raj Sanghvi (hello@bitcot.ai)*
