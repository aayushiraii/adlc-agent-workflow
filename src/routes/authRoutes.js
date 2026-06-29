'use strict';

const express = require('express');
const { login } = require('../controllers/authController');

const router = express.Router();

/**
 * @route  POST /auth/login
 * @desc   Authenticate user and return JWT token
 * @access Public
 */
router.post('/login', login);

module.exports = router;
