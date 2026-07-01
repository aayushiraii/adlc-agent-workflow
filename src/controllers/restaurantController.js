'use strict';

const {
  listRestaurants,
  getRestaurantById,
  searchRestaurants,
} = require('../services/restaurantService');

// ─────────────────────────────────────────────────────────────────────────────
// GET /restaurants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lists restaurants with optional filters and geo-sorting.
 *
 * Query params:
 *   cuisine  {string}  - Filter by cuisine type (case-insensitive)
 *   rating   {number}  - Minimum rating threshold
 *   lat      {number}  - User latitude  (enables geo-sort)
 *   lng      {number}  - User longitude (required with lat)
 *   distance {number}  - Max distance in km (requires lat & lng)
 *   page     {number}  - Page number (default 1)
 *   limit    {number}  - Items per page (default 10, max 100)
 *
 * Response 200:
 *   { success: true, data: [...], pagination: { total, page, limit, totalPages, hasNext, hasPrev } }
 */
function list(req, res) {
  const startTime = Date.now();

  try {
    const { cuisine, rating, lat, lng, distance, page, limit } = req.query;

    const result = listRestaurants({ cuisine, rating, lat, lng, distance, page, limit });

    res.setHeader('X-Response-Time', `${Date.now() - startTime}ms`);

    return res.status(200).json({
      success   : true,
      ...result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error  : 'Internal Server Error',
      message: 'Failed to fetch restaurant list.',
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /restaurants/search?q=
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full-text restaurant search.
 *
 * Query params:
 *   q     {string} - Search term (name, cuisine, description, address)
 *   page  {number} - Page number  (default 1)
 *   limit {number} - Items per page (default 10)
 *
 * Response 200:
 *   { success: true, query: string, data: [...], pagination: {...} }
 *
 * Response 400:
 *   { success: false, error: 'Bad Request', message: '...' }
 */
function search(req, res) {
  const startTime = Date.now();

  try {
    const { q, page, limit } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({
        success: false,
        error  : 'Bad Request',
        message: "Query parameter 'q' is required and must not be empty.",
      });
    }

    const result = searchRestaurants(q.trim(), page, limit);

    res.setHeader('X-Response-Time', `${Date.now() - startTime}ms`);

    return res.status(200).json({
      success: true,
      query  : q.trim(),
      ...result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error  : 'Internal Server Error',
      message: 'Failed to search restaurants.',
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /restaurants/:id
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the detail of a single restaurant and its full menu.
 *
 * Route params:
 *   id {string} - Restaurant ID (e.g. rst_001)
 *
 * Response 200:
 *   { success: true, restaurant: {...}, menu: [...] }
 *
 * Response 404:
 *   { success: false, error: 'Not Found', message: '...' }
 */
function getById(req, res) {
  const startTime = Date.now();

  try {
    const { id } = req.params;

    if (!id || !id.trim()) {
      return res.status(400).json({
        success: false,
        error  : 'Bad Request',
        message: 'Restaurant ID is required.',
      });
    }

    const result = getRestaurantById(id.trim());

    if (!result) {
      return res.status(404).json({
        success: false,
        error  : 'Not Found',
        message: `Restaurant with id '${id}' does not exist.`,
      });
    }

    res.setHeader('X-Response-Time', `${Date.now() - startTime}ms`);

    return res.status(200).json({
      success   : true,
      restaurant: result.restaurant,
      menu      : result.menu,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error  : 'Internal Server Error',
      message: 'Failed to fetch restaurant details.',
    });
  }
}

module.exports = { list, search, getById };
