const express = require('express');
const router = express.Router();

const { login } = require('../controllers/authController');
const { rateLimitLogin } = require('../middleware/authMiddleware');

/**
 * @route   POST /auth/login
 * @desc    Authenticate user with email & password, return signed JWT
 * @access  Public
 *
 * Middleware chain:
 *  1. rateLimitLogin — blocks brute-force attempts (max 5 per 15 min per IP)
 *  2. login          — validates input, verifies credentials, issues JWT
 */
router.post('/login', rateLimitLogin, login);

module.exports = router;
