'use strict';

const { Router }         = require('express');
const { login, getProfile } = require('../controllers/authController');
const { authMiddleware }    = require('../middleware/authMiddleware');

const router = Router();

/**
 * @route  POST /auth/login
 * @desc   Authenticate user and return JWT token
 * @access Public
 */
router.post('/login', login);

/**
 * @route  GET /auth/profile
 * @desc   Return authenticated user's profile
 * @access Protected (requires valid JWT Bearer token)
 */
router.get('/profile', authMiddleware, getProfile);

module.exports = router;
