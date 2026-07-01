'use strict';

const request = require('supertest');
const app     = require('../app');

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 | GET /restaurants — paginated list with optional filters
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /restaurants', () => {
  it('AC-1 | should return 200 with a paginated list of all restaurants', async () => {
    const res = await request(app).get('/restaurants');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination).toHaveProperty('total');
    expect(res.body.pagination).toHaveProperty('page');
    expect(res.body.pagination).toHaveProperty('limit');
    expect(res.body.pagination).toHaveProperty('totalPages');
    expect(res.body.pagination).toHaveProperty('hasNext');
    expect(res.body.pagination).toHaveProperty('hasPrev');
  });

  it('AC-1 | should filter by cuisine (case-insensitive)', async () => {
    const res = await request(app).get('/restaurants?cuisine=indian');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach((r) => {
      expect(r.cuisine.toLowerCase()).toContain('indian');
    });
  });

  it('AC-1 | should filter by minimum rating', async () => {
    const res = await request(app).get('/restaurants?rating=4.5');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    res.body.data.forEach((r) => {
      expect(r.rating).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('AC-1 | should return empty data array when no restaurants match the filter', async () => {
    const res = await request(app).get('/restaurants?cuisine=nonexistentcuisine99');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.pagination.total).toBe(0);
  });

  it('AC-1 | should respect page and limit for pagination', async () => {
    const res = await request(app).get('/restaurants?page=1&limit=3');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(3);
    expect(res.body.pagination.limit).toBe(3);
    expect(res.body.pagination.page).toBe(1);
  });

  it('AC-1 | should not expose lat/lng fields in the response', async () => {
    const res = await request(app).get('/restaurants');

    res.body.data.forEach((r) => {
      expect(r).not.toHaveProperty('lat');
      expect(r).not.toHaveProperty('lng');
    });
  });

  it('AC-1 | response should contain X-Response-Time header', async () => {
    const res = await request(app).get('/restaurants');
    expect(res.headers['x-response-time']).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 | Geo-sorting via lat/lng
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /restaurants (geo-sort)', () => {
  it('AC-4 | should sort results by ascending distance when lat/lng provided', async () => {
    // User coordinates: Bangalore (12.9716, 77.5946)
    const res = await request(app).get('/restaurants?lat=12.9716&lng=77.5946');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.length).toBeGreaterThan(0);

    // Every item should have distanceKm
    data.forEach((r) => {
      expect(r).toHaveProperty('distanceKm');
      expect(typeof r.distanceKm).toBe('number');
    });

    // Results should be in ascending order of distanceKm
    for (let i = 1; i < data.length; i++) {
      expect(data[i].distanceKm).toBeGreaterThanOrEqual(data[i - 1].distanceKm);
    }
  });

  it('AC-4 | should filter by max distance in km', async () => {
    // User in Mumbai (19.0760, 72.8777) — rst_001 is in Mumbai itself
    const res = await request(app).get('/restaurants?lat=19.0760&lng=72.8777&distance=200');

    expect(res.status).toBe(200);
    res.body.data.forEach((r) => {
      expect(r.distanceKm).toBeLessThanOrEqual(200);
    });
  });

  it('AC-4 | should not include distanceKm when lat/lng not provided', async () => {
    const res = await request(app).get('/restaurants');

    res.body.data.forEach((r) => {
      expect(r).not.toHaveProperty('distanceKm');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 | GET /restaurants/:id — restaurant detail + full menu
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /restaurants/:id', () => {
  it('AC-2 | should return 200 with restaurant detail and full menu for a valid ID', async () => {
    const res = await request(app).get('/restaurants/rst_001');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.restaurant).toBeDefined();
    expect(res.body.restaurant.id).toBe('rst_001');
    expect(res.body.restaurant.name).toBe('The Spice Garden');
    expect(Array.isArray(res.body.menu)).toBe(true);
    expect(res.body.menu.length).toBeGreaterThan(0);
  });

  it('AC-2 | each menu item should belong to the requested restaurant', async () => {
    const res = await request(app).get('/restaurants/rst_005');

    expect(res.status).toBe(200);
    res.body.menu.forEach((item) => {
      expect(item.restaurantId).toBe('rst_005');
    });
  });

  it('AC-2 | should return 404 for a non-existent restaurant ID', async () => {
    const res = await request(app).get('/restaurants/rst_999');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Not Found');
  });

  it('AC-2 | restaurant detail should not expose lat/lng', async () => {
    const res = await request(app).get('/restaurants/rst_002');

    expect(res.status).toBe(200);
    expect(res.body.restaurant).not.toHaveProperty('lat');
    expect(res.body.restaurant).not.toHaveProperty('lng');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 | GET /restaurants/search?q= — full-text search
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /restaurants/search', () => {
  it('AC-3 | should return 200 with matching results for a valid search term', async () => {
    const res = await request(app).get('/restaurants/search?q=sushi');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.query).toBe('sushi');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('AC-3 | should match by cuisine', async () => {
    const res = await request(app).get('/restaurants/search?q=Korean');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach((r) => {
      const combined = `${r.name} ${r.cuisine} ${r.description}`.toLowerCase();
      expect(combined).toContain('korean');
    });
  });

  it('AC-3 | should match by restaurant name', async () => {
    const res = await request(app).get('/restaurants/search?q=Green+Bowl');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].name).toBe('Green Bowl');
  });

  it('AC-3 | should return 400 when query param q is missing', async () => {
    const res = await request(app).get('/restaurants/search');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Bad Request');
  });

  it('AC-3 | should return 400 when q is empty string', async () => {
    const res = await request(app).get('/restaurants/search?q=');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('AC-3 | should return paginated results', async () => {
    const res = await request(app).get('/restaurants/search?q=a&page=1&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.pagination).toBeDefined();
  });

  it('AC-3 | search route should not be captured by :id param', async () => {
    // If the router is misconfigured, /search would return a 404 (treating
    // "search" as a restaurant ID). This test confirms correct route ordering.
    const res = await request(app).get('/restaurants/search?q=pizza');
    expect(res.status).not.toBe(404);
    expect(res.body).not.toHaveProperty('restaurant'); // should NOT return detail view
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5 | Response time threshold
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-5 | Response time thresholds', () => {
  const THRESHOLD_MS = 200;

  it('GET /restaurants should respond within threshold', async () => {
    const start = Date.now();
    await request(app).get('/restaurants');
    expect(Date.now() - start).toBeLessThan(THRESHOLD_MS);
  });

  it('GET /restaurants/:id should respond within threshold', async () => {
    const start = Date.now();
    await request(app).get('/restaurants/rst_003');
    expect(Date.now() - start).toBeLessThan(THRESHOLD_MS);
  });

  it('GET /restaurants/search should respond within threshold', async () => {
    const start = Date.now();
    await request(app).get('/restaurants/search?q=pizza');
    expect(Date.now() - start).toBeLessThan(THRESHOLD_MS);
  });

  it('GET /restaurants with geo-sort should respond within threshold', async () => {
    const start = Date.now();
    await request(app).get('/restaurants?lat=19.0760&lng=72.8777');
    expect(Date.now() - start).toBeLessThan(THRESHOLD_MS);
  });
});
