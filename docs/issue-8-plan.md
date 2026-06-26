# Implementation Plan — Issue #8
# Implement Backend Restaurant and Menu APIs

---

## Issue Summary

| Field | Details |
|---|---|
| **Issue Number** | #8 |
| **Title** | Implement Backend Restaurant and Menu APIs |
| **Priority** | High |
| **ADLC Phase** | Development |
| **Labels** | `development`, `backend`, `restaurants`, `high-priority` |
| **Dependencies** | #4 — Design System Architecture and Database Schema for Food Delivery Platform |
| **State** | Open |

---

## Objective

This issue aims to build the complete **backend REST API layer for the Restaurant and Menu domains** of the food delivery platform. This includes endpoints for paginated restaurant listing with multi-criteria filtering, full-text restaurant search, individual restaurant detail retrieval with full menu, and geo-based distance sorting using the user's current latitude and longitude. The APIs must be performant, properly indexed, and tested under normal load conditions to meet acceptable response time thresholds.

---

## Phase 1 — Requirement Analysis

### Functional Requirements

**Restaurant Listing — `GET /api/v1/restaurants`**
- Returns a **paginated list** of active restaurants.
- Supports the following **optional query parameters**:
  - `cuisine` — Filter by one or more cuisine types (e.g., `?cuisine=Italian,Mexican`)
  - `rating` — Minimum rating filter (e.g., `?rating=4.0`)
  - `lat` + `lng` — User's current coordinates for distance-based sorting and filtering
  - `radius` — Maximum delivery radius in km/miles (e.g., `?radius=10`)
  - `sortBy` — Sort field: `distance`, `rating`, `delivery_time` (default: `distance` if coordinates provided, else `rating`)
  - `page` + `limit` — Pagination parameters (e.g., `?page=1&limit=20`)
- Response must include: restaurant ID, name, cuisine type(s), rating, review count, price range, estimated delivery time, distance from user (if coordinates provided), promo badge flag, cover image URL, `isOpen` flag based on current time and operating hours.
- Only `isActive = true` restaurants must be returned.
- `isOpen` must be computed server-side based on the restaurant's `operatingHours` and the request time.

**Restaurant Search — `GET /api/v1/restaurants/search`**
- Accepts query parameter `q` for full-text search input.
- Searches across restaurant name, cuisine type, and menu item names.
- Returns ranked results with the same response shape as the listing endpoint.
- Supports the same optional filters (`cuisine`, `rating`, `lat`, `lng`, `radius`) combined with the search term.
- Must handle partial matches, case-insensitivity, and leading/trailing whitespace gracefully.
- Must return an empty array (not an error) when no results match.

**Restaurant Detail — `GET /api/v1/restaurants/:id`**
- Returns full restaurant detail: all listing fields plus full menu.
- Menu is grouped by category with `displayOrder` respected.
- Each menu item includes: ID, name, description, image URL, price, `isAvailable` flag, category name.
- Returns `404 Not Found` if the restaurant does not exist or `isActive = false`.

**Menu Filtering — `GET /api/v1/restaurants/:id/menu`**
- Optional standalone endpoint to fetch only the menu for a given restaurant.
- Supports optional query parameter `category` to filter by specific menu category.
- Returns only `isAvailable = true` menu items unless an admin flag is passed.
- Menu items returned in `displayOrder` within each category.

**Geo-Sorting & Distance Calculation**
- When `lat` and `lng` query parameters are provided, results must be sorted by distance (ascending) by default.
- Distance calculation must use **PostGIS** (`ST_Distance` / `ST_DWithin`) or the **haversine formula** as a fallback.
- Calculated distance must be included in the response payload (in km, rounded to 1 decimal place).
- Restaurants outside the specified `radius` must be excluded from results.

**Database Seeding**
- A seed script must be created to populate the database with representative restaurant and menu data for development and testing purposes.
- Seed data must cover: multiple cuisine types, varying ratings, operating hours, geo-coordinates across a test area, and a variety of menu categories and items.

### Business Rules
- Only restaurants with `isActive = true` are returned in any public-facing endpoint.
- `isOpen` computation must account for timezone — the restaurant's local timezone should be used (or UTC operating hours with timezone offset stored — to be confirmed).
- If `lat`/`lng` are not provided, distance-based sorting and radius filtering are not applied; results default to rating-based sort.
- Pagination must default to `page=1`, `limit=20` if not specified. Maximum `limit` must be capped (e.g., 100).
- Search queries under a minimum character length (e.g., fewer than 2 characters) should return an empty result or a validation error — to be confirmed.
- All API responses must follow a consistent envelope structure: `{ data, meta: { page, limit, total }, errors }`.

### Constraints
- Database schema and table structure must follow the ERD finalized in **Issue #4**.
- **PostGIS** extension must be enabled on PostgreSQL for geospatial queries.
- All endpoints must be protected by the authentication middleware from Issue #6 (or optionally public for browsing — to be confirmed).
- Response times must remain within acceptable thresholds under normal load — specific targets to be defined (see Approval Questions).
- Full-text search must use **PostgreSQL Full-Text Search** (`tsvector`/`tsquery`) unless Elasticsearch/OpenSearch has been confirmed in Issue #4.
- The `GET /restaurants/search` route must be registered **before** `GET /restaurants/:id` in the router to prevent path collision.

---

## Phase 2 — Design

### API Contract Specifications

**`GET /api/v1/restaurants`**

Query Parameters:
```
page        integer   default: 1
limit       integer   default: 20, max: 100
cuisine     string    comma-separated (e.g., "Italian,Mexican")
rating      number    minimum rating (e.g., 4.0)
lat         number    user latitude
lng         number    user longitude
radius      number    km radius from user location (default: 10)
sortBy      string    "distance" | "rating" | "delivery_time"
```

Response `200 OK`:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "cuisineType": ["string"],
      "rating": 4.5,
      "reviewCount": 120,
      "priceRange": "$$",
      "estimatedDeliveryTime": 30,
      "distanceKm": 1.2,
      "isOpen": true,
      "promoAvailable": false,
      "coverImageUrl": "https://..."
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 85
  }
}
```

---

**`GET /api/v1/restaurants/search?q=`**

Query Parameters:
```
q           string    required, search term
page        integer   default: 1
limit       integer   default: 20
cuisine     string    optional filter
rating      number    optional filter
lat         number    optional
lng         number    optional
radius      number    optional
```

Response `200 OK`: Same structure as listing endpoint.

Response `200 OK` (no results):
```json
{ "data": [], "meta": { "page": 1, "limit": 20, "total": 0 } }
```

---

**`GET /api/v1/restaurants/:id`**

Response `200 OK`:
```json
{
  "data": {
    "id": "uuid",
    "name": "string",
    "cuisineType": ["string"],
    "rating": 4.5,
    "reviewCount": 120,
    "priceRange": "$$",
    "estimatedDeliveryTime": 30,
    "distanceKm": 1.2,
    "isOpen": true,
    "operatingHours": {
      "monday": { "open": "09:00", "close": "22:00" },
      "tuesday": { "open": "09:00", "close": "22:00" }
    },
    "menu": [
      {
        "categoryId": "uuid",
        "categoryName": "Starters",
        "displayOrder": 1,
        "items": [
          {
            "id": "uuid",
            "name": "string",
            "description": "string",
            "imageUrl": "https://...",
            "price": 9.99,
            "isAvailable": true
          }
        ]
      }
    ]
  }
}
```

Response `404 Not Found`:
```json
{ "errors": [{ "code": "RESTAURANT_NOT_FOUND", "message": "Restaurant not found." }] }
```

---

**`GET /api/v1/restaurants/:id/menu`**

Query Parameters:
```
category    string    optional, filter by category name or ID
```

Response `200 OK`: Menu array (same structure as nested `menu` in restaurant detail).

---

### Service Layer Design

**RestaurantService**
- `listRestaurants(filters, pagination, geoParams)` — Builds and executes the paginated, filtered, geo-sorted query.
- `searchRestaurants(query, filters, pagination, geoParams)` — Builds and executes full-text search query.
- `getRestaurantById(id)` — Fetches restaurant with full menu, computes `isOpen`.
- `getMenuByRestaurantId(restaurantId, categoryFilter)` — Fetches menu grouped by category.
- `computeIsOpen(operatingHours, timezone)` — Pure function to determine open/closed status.
- `computeDistance(lat1, lng1, lat2, lng2)` — Haversine formula fallback if PostGIS unavailable.

**RestaurantRepository**
- `findAll(queryOptions)` — Executes paginated DB query with filters and geo-sort.
- `findById(id)` — Fetches single restaurant record.
- `findMenuByRestaurantId(restaurantId, categoryFilter)` — Fetches menu with category grouping.
- `fullTextSearch(term, filters)` — Executes `tsvector`/`tsquery` full-text search query.

### Database Design — Indexes & Performance

```sql
-- Geospatial index (PostGIS)
CREATE INDEX idx_restaurants_location
  ON restaurants USING GIST (ST_MakePoint(lng, lat)::geography);

-- Full-text search index
ALTER TABLE restaurants ADD COLUMN search_vector tsvector;
CREATE INDEX idx_restaurants_search ON restaurants USING GIN (search_vector);
CREATE INDEX idx_menu_items_search
  ON menu_items USING GIN (to_tsvector('english', name || ' ' || description));

-- Filter indexes
CREATE INDEX idx_restaurants_is_active ON restaurants (is_active);
CREATE INDEX idx_restaurants_rating ON restaurants (rating DESC);
CREATE INDEX idx_restaurants_cuisine ON restaurants USING GIN (cuisine_type);

-- Menu indexes
CREATE INDEX idx_menu_items_restaurant_id ON menu_items (restaurant_id);
CREATE INDEX idx_menu_items_is_available ON menu_items (is_available);
CREATE INDEX idx_menu_categories_display_order
  ON menu_categories (restaurant_id, display_order);
```

### Caching Strategy (Redis)
- Cache `GET /restaurants` responses per unique filter+pagination combination with a short TTL (e.g., 2–5 minutes).
- Cache individual restaurant detail responses per ID with a medium TTL (e.g., 5–10 minutes).
- Invalidate cached restaurant entries on any restaurant or menu data update (write-through or TTL-based).
- Do **not** cache geo-sorted results per user location — too many unique cache keys.

### Query Design — Geo-Sort with PostGIS

```sql
SELECT
  r.*,
  ST_Distance(
    ST_MakePoint(r.lng, r.lat)::geography,
    ST_MakePoint(:userLng, :userLat)::geography
  ) / 1000 AS distance_km
FROM restaurants r
WHERE
  r.is_active = true
  AND ST_DWithin(
    ST_MakePoint(r.lng, r.lat)::geography,
    ST_MakePoint(:userLng, :userLat)::geography,
    :radiusMeters
  )
ORDER BY distance_km ASC
LIMIT :limit OFFSET :offset;
```

---

## Phase 3 — Implementation

### Setup Tasks
- Enable **PostGIS** extension on PostgreSQL: `CREATE EXTENSION IF NOT EXISTS postgis;`
- Add `search_vector` `tsvector` column to `restaurants` table via migration.
- Create a PostgreSQL trigger to auto-update `search_vector` on restaurant insert/update.
- Create all database indexes defined in Phase 2.
- Set up **RestaurantModule** folder structure: `/src/modules/restaurant/` with `controller`, `service`, `repository`, `dto`, `entity` sub-folders.
- Install required libraries: ORM driver, `pg` PostgreSQL client, PostGIS type support packages.

### API Endpoint Implementation Tasks
- Implement `GET /api/v1/restaurants` controller and service method with full filter, sort, and pagination support.
- Implement `GET /api/v1/restaurants/search` controller and service method with full-text search and combined filters.
- Implement `GET /api/v1/restaurants/:id` controller and service method with full menu and `isOpen` computation.
- Implement `GET /api/v1/restaurants/:id/menu` controller and service method with optional category filter.
- Register the `/search` route **before** `/:id` in the router to prevent path collision.

### Business Logic Implementation Tasks
- Implement `computeIsOpen(operatingHours, timezone)` service function — parse operating hours JSON, compare against current server/local time.
- Implement `computeDistance()` haversine formula function as a utility for environments where PostGIS is unavailable.
- Implement geo-sort query builder that switches between PostGIS `ST_Distance` and haversine based on configuration/availability.
- Implement pagination utility — `page`/`limit` to SQL `LIMIT`/`OFFSET` translation, `total` count query, meta object construction.
- Implement multi-value filter builder for `cuisine` (array contains), `rating` (minimum threshold), and `radius` (geo-fence).

### Caching Implementation Tasks
- Implement Redis cache middleware or service decorator for `GET /restaurants` and `GET /restaurants/:id`.
- Implement cache key generation strategy for filter+pagination combinations.
- Implement cache invalidation on restaurant or menu item data mutations.

### Database Seeding Tasks
- Write seed script populating 20–50 restaurants across multiple cuisine types with realistic geo-coordinates within a defined test area.
- Seed each restaurant with 3–5 menu categories and 5–10 menu items per category.
- Include variety in ratings (2.0–5.0), price ranges, operating hours, and `isActive` statuses.
- Include at least 2–3 restaurants marked as closed at the time of seeding (for `isOpen = false` test coverage).

### Validation & Error Handling Tasks
- Implement DTO validation for all query parameters: type coercion, range checks (`rating` between 0–5, `limit` max 100), format validation for `lat`/`lng`.
- Implement `404 Not Found` handler for `GET /restaurants/:id` when restaurant is inactive or does not exist.
- Implement global error response envelope: `{ errors: [{ code, message }] }`.
- Implement guard/validation for missing or too-short `q` parameter on the search endpoint.

---

## Phase 4 — Testing

### Unit Tests
- Test `computeIsOpen()` — restaurant within operating hours returns `true`; outside hours returns `false`; edge cases at exact open/close time.
- Test `computeDistance()` haversine — known coordinate pairs verified against expected distances.
- Test pagination utility — `page=1, limit=20` produces `OFFSET=0`; `page=3, limit=10` produces `OFFSET=20`.
- Test filter builder — single cuisine, multiple cuisines, rating threshold, radius filter applied correctly to query object.
- Test DTO validation — invalid `rating` (> 5 or < 0), invalid `lat`/`lng` ranges, `limit` exceeding cap, non-numeric `page`.
- Test `isActive` filter — inactive restaurants are excluded from service method results.

### Integration Tests
- Test `GET /restaurants` — returns paginated list with correct `meta.total`, `meta.page`, `meta.limit`.
- Test `GET /restaurants?cuisine=Italian` — returns only Italian restaurants.
- Test `GET /restaurants?rating=4.0` — returns only restaurants with rating ≥ 4.0.
- Test `GET /restaurants?lat=40.7128&lng=-74.0060&radius=5` — returns only restaurants within 5km, sorted by `distanceKm` ascending.
- Test `GET /restaurants?lat=...&lng=...` — `distanceKm` field is present and correctly computed for each result.
- Test `GET /restaurants/search?q=pizza` — returns restaurants and/or menu items matching "pizza".
- Test `GET /restaurants/search?q=` or missing `q` — returns validation error or empty result per confirmed behavior.
- Test `GET /restaurants/:id` — returns full restaurant detail with nested menu grouped by category in `displayOrder`.
- Test `GET /restaurants/:id` with inactive restaurant ID — returns `404`.
- Test `GET /restaurants/:id` with non-existent ID — returns `404`.
- Test `GET /restaurants/:id/menu?category=Starters` — returns only items in the "Starters" category.
- Test `isOpen` field — restaurant with current time outside operating hours returns `isOpen: false`.
- Test Redis cache — second identical request hits cache and shows measurably lower response time.

### Performance Validation Scenarios
- `GET /restaurants` with no filters responds within the defined latency threshold under normal load.
- `GET /restaurants?lat=...&lng=...` with PostGIS geo-sort responds within threshold with 50+ restaurant records.
- `GET /restaurants/search?q=burger` responds within threshold with full-text search index active.
- `GET /restaurants/:id` with full menu (5 categories × 10 items) responds within threshold.
- Repeated identical requests to `GET /restaurants` benefit from Redis cache with measurably lower response time.

---

## Risks

### Technical Risks
- **PostGIS configuration complexity** — PostGIS must be installed and the extension enabled on PostgreSQL. In containerized or managed cloud database environments, this may require additional setup steps or specific PostgreSQL versions.
- **Route collision: `/search` vs `/:id`** — If the `/search` route is registered after `/:id` in the router, the string `"search"` will be interpreted as a restaurant ID, causing incorrect `404` responses. Route registration order must be strictly enforced.
- **`search_vector` trigger maintenance** — The `tsvector` column must be kept in sync with `name` and `cuisine_type` changes via a PostgreSQL trigger or application-level update. Stale triggers produce stale search results.
- **Geo-sort performance degradation** — Without a properly configured PostGIS spatial index (`GIST`), `ST_Distance` queries on large datasets perform full table scans, causing unacceptable latency.
- **Cache invalidation complexity** — Filter-based cache keys can proliferate rapidly. Without a deliberate key namespacing strategy, cache invalidation on data updates becomes imprecise or overly broad.
- **`isOpen` timezone handling** — If restaurant operating hours are stored without timezone context, `isOpen` computation will produce incorrect results for restaurants in different timezones.

### Dependency Risks
- **Issue #4 must be complete** — The database schema (tables, columns, constraints, and indexes) must be finalized and migrated before any API implementation can proceed. Schema changes after implementation begins require migration and code changes.
- **PostGIS availability** — If the deployment environment's managed PostgreSQL service does not support PostGIS, the geo-sort implementation must fall back to haversine in application code, with a performance trade-off.
- **Seed data quality** — If seed data does not include realistic geo-coordinates, operating hours, and varied cuisine types, geo-sort and filter tests will not be meaningful.

### Requirement Gaps
- **Authentication requirement** — It is not specified whether the restaurant listing and detail endpoints are publicly accessible (no auth required) or require a valid JWT. This affects middleware configuration.
- **Response time thresholds** — Specific API latency SLAs (e.g., p95 < 200ms) are not defined in the issue, making performance validation criteria ambiguous.
- **Search minimum character length** — Whether a minimum query length is enforced on `?q=` is not specified.
- **Operating hours timezone** — Whether `operatingHours` is stored in UTC or in the restaurant's local timezone is not specified, affecting `isOpen` computation accuracy.
- **Delivery radius default** — The default delivery radius when `lat`/`lng` are provided but no `radius` is specified is not defined.
- **Cuisine type storage** — Whether `cuisineType` is stored as a free-text array, a normalized reference table, or an enum must be confirmed from the Issue #4 schema.
- **Image storage** — Whether `coverImageUrl` and `menuItemImageUrl` point to S3/CDN URLs or relative paths must be confirmed.
- **Admin vs. public menu visibility** — Whether unavailable menu items (`isAvailable = false`) should be hidden entirely or returned with a flag for admin contexts is not addressed.

---

## Approval Questions

1. **Auth Requirement** — Should the restaurant listing, search, and detail endpoints be **publicly accessible** without authentication, or should they require a valid JWT token?
2. **Response Time SLA** — What are the target API response time thresholds? (e.g., p95 < 200ms for listing, p95 < 300ms for geo-sort queries under normal load)
3. **PostGIS Availability** — Is PostGIS confirmed to be available on the target PostgreSQL deployment? If not, should the haversine formula in application code serve as the primary geo-sort method?
4. **Default Delivery Radius** — What should the default radius be when `lat`/`lng` are provided but no `radius` parameter is specified? (e.g., 10 km)
5. **Search Minimum Length** — Should the search endpoint enforce a minimum query length (e.g., at least 2 characters)? If so, what should the response be for shorter inputs?
6. **Operating Hours Timezone** — Are restaurant operating hours stored in UTC or in the restaurant's local timezone? This directly determines how `isOpen` is computed.
7. **Cuisine Type Model** — Is `cuisineType` stored as a free-text array, a normalized lookup table, or a predefined enum? This affects filter query design.
8. **Menu Item Visibility** — Should `isAvailable = false` menu items be completely excluded from public API responses, or returned with an `isAvailable: false` flag?
9. **Search Scope** — Should search (`?q=`) match only restaurant names and cuisine types, or also menu item names? Including menu items significantly increases query complexity.
10. **Image URL Strategy** — Should `coverImageUrl` and `itemImageUrl` in responses return absolute CDN/S3 URLs or relative paths? Is there an image CDN base URL that must be prepended?

---

## Final Recommendation

> **Status: Blocked by Dependencies**

This issue has one direct hard dependency on **Issue #4** — the database schema, PostGIS configuration, and table/index definitions must be finalized and migrations executed before any backend implementation can begin. Attempting to build APIs against an unfinalized schema risks significant rework when the schema changes.

Additionally, several **critical requirement gaps** — authentication scope, response time SLAs, operating hours timezone handling, and PostGIS availability on the deployment target — must be resolved to ensure the implementation is production-ready from the first iteration. Once Issue #4 is resolved and the approval questions above are answered, this issue is fully **Ready for Development**.

---

*Plan approved and generated on 2026-06-26 by Sprint Planning Agent.*
*Approved by: Raj Sanghvi (hello@bitcot.ai)*
