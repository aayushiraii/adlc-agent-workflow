'use strict';

const { RESTAURANTS, MENU_ITEMS } = require('../data/seed');
const { sortByDistance }          = require('../utils/haversine');
const { paginate }                = require('../utils/pagination');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a sanitised public view of a restaurant (without internal lat/lng
 * unless geo-sorted, in which case distanceKm is included).
 *
 * @param {Object}  restaurant
 * @param {boolean} includeDistance - Whether to keep the distanceKm field.
 * @returns {Object}
 */
function toPublicRestaurant(restaurant, includeDistance = false) {
  const { lat, lng, ...rest } = restaurant; // strip raw coords
  if (includeDistance && restaurant.distanceKm !== undefined) {
    return { ...rest, distanceKm: restaurant.distanceKm };
  }
  return rest;
}

/**
 * Gets all menu items for a restaurant.
 *
 * @param {string} restaurantId
 * @returns {Array<Object>}
 */
function getMenuForRestaurant(restaurantId) {
  return MENU_ITEMS.filter((m) => m.restaurantId === restaurantId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Methods
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lists restaurants with optional filtering and geo-sorting, then paginates.
 *
 * Supported query params:
 *   cuisine  {string}  - Filter by cuisine type (case-insensitive)
 *   rating   {number}  - Minimum rating (e.g. 4.0 returns restaurants rated >= 4.0)
 *   lat      {number}  - User latitude  (enables geo-sort + distanceKm in response)
 *   lng      {number}  - User longitude (required with lat)
 *   distance {number}  - Max distance in km (requires lat & lng)
 *   page     {number}  - Page number (default: 1)
 *   limit    {number}  - Items per page (default: 10, max: 100)
 *
 * @param {Object} filters - Parsed query parameters.
 * @returns {{ data: Array, pagination: Object }}
 */
function listRestaurants(filters = {}) {
  const {
    cuisine,
    rating,
    lat,
    lng,
    distance,
    page  = 1,
    limit = 10,
  } = filters;

  const userLat = lat  !== undefined ? parseFloat(lat)  : null;
  const userLng = lng  !== undefined ? parseFloat(lng)  : null;
  const hasGeo  = userLat !== null && userLng !== null &&
                  !isNaN(userLat) && !isNaN(userLng);

  let results = [...RESTAURANTS];

  // Filter by cuisine
  if (cuisine) {
    const q = cuisine.toLowerCase().trim();
    results  = results.filter((r) => r.cuisine.toLowerCase().includes(q));
  }

  // Filter by minimum rating
  if (rating !== undefined) {
    const minRating = parseFloat(rating);
    if (!isNaN(minRating)) {
      results = results.filter((r) => r.rating >= minRating);
    }
  }

  // Geo-sort and annotate distanceKm
  if (hasGeo) {
    results = sortByDistance(results, userLat, userLng);

    // Filter by max distance if provided
    if (distance !== undefined) {
      const maxDist = parseFloat(distance);
      if (!isNaN(maxDist)) {
        results = results.filter((r) => r.distanceKm <= maxDist);
      }
    }
  }

  // Strip lat/lng, keep distanceKm when geo-sorted
  const publicResults = results.map((r) => toPublicRestaurant(r, hasGeo));

  return paginate(publicResults, page, limit);
}

/**
 * Returns a single restaurant with its full menu.
 *
 * @param {string} id - Restaurant ID (e.g. 'rst_001').
 * @returns {{ restaurant: Object, menu: Array<Object> } | null}
 */
function getRestaurantById(id) {
  const restaurant = RESTAURANTS.find((r) => r.id === id);
  if (!restaurant) return null;

  const menu = getMenuForRestaurant(id);

  return {
    restaurant: toPublicRestaurant(restaurant),
    menu,
  };
}

/**
 * Full-text search across restaurant name, cuisine, and description.
 * Results are paginated.
 *
 * @param {string} query  - Search term.
 * @param {number} page   - Page number (default: 1).
 * @param {number} limit  - Items per page (default: 10).
 * @returns {{ data: Array, pagination: Object }}
 */
function searchRestaurants(query, page = 1, limit = 10) {
  if (!query || !query.trim()) {
    return paginate(
      RESTAURANTS.map((r) => toPublicRestaurant(r)),
      page,
      limit
    );
  }

  const q = query.toLowerCase().trim();

  const results = RESTAURANTS.filter(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      r.cuisine.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.address.toLowerCase().includes(q)
  ).map((r) => toPublicRestaurant(r));

  return paginate(results, page, limit);
}

module.exports = { listRestaurants, getRestaurantById, searchRestaurants };
