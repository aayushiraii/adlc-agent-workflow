'use strict';

const { Router } = require('express');
const { list, search, getById } = require('../controllers/restaurantController');

const router = Router();

/**
 * @route  GET /restaurants/search
 * @desc   Full-text search across restaurant name, cuisine, description, address
 * @access Public
 * @query  q {string} - Search term (required)
 * @query  page  {number} - Page number  (optional, default 1)
 * @query  limit {number} - Items per page (optional, default 10)
 *
 * NOTE: /search MUST be declared before /:id so Express does not
 * treat "search" as a dynamic :id parameter.
 */
router.get('/search', search);

/**
 * @route  GET /restaurants
 * @desc   List all restaurants with optional cuisine/rating/distance filters and geo-sort
 * @access Public
 * @query  cuisine  {string} - Filter by cuisine type (case-insensitive)
 * @query  rating   {number} - Minimum rating threshold
 * @query  lat      {number} - User latitude  (enables geo-sort and distanceKm in response)
 * @query  lng      {number} - User longitude (required with lat)
 * @query  distance {number} - Max distance in km (requires lat & lng)
 * @query  page     {number} - Page number  (optional, default 1)
 * @query  limit    {number} - Items per page (optional, default 10, max 100)
 */
router.get('/', list);

/**
 * @route  GET /restaurants/:id
 * @desc   Get a single restaurant's detail and its full menu
 * @access Public
 * @param  id {string} - Restaurant ID (e.g. rst_001)
 */
router.get('/:id', getById);

module.exports = router;
