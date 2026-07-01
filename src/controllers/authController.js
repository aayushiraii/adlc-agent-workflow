'use strict';

const { loginUser } = require('../services/authService');

/**
 * POST /auth/login
 * Authenticates a user and returns a signed JWT token.
 *
 * Request body:
 *   { email: string, password: string }
 *
 * Response 200:
 *   { success: true, token: string, user: { userId, email, name } }
 *
 * Response 400/401:
 *   { success: false, error: string, message: string }
 */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error  : 'Bad Request',
      message: 'email and password are required.',
    });
  }

  try {
    const { token, user } = loginUser(email, password);

    return res.status(200).json({
      success: true,
      token,
      user,
    });
  } catch (err) {
    if (err.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({
        success: false,
        error  : 'Unauthorized',
        message: 'Invalid email or password.',
      });
    }

    // Unexpected error — hide internal details
    return res.status(500).json({
      success: false,
      error  : 'Internal Server Error',
      message: 'An unexpected error occurred. Please try again.',
    });
  }
}

/**
 * GET /auth/profile
 * Returns the authenticated user's profile (protected route).
 *
 * Requires: authMiddleware — req.user must be populated.
 *
 * Response 200:
 *   { success: true, user: { userId, email } }
 */
function getProfile(req, res) {
  // req.user is guaranteed to be set by authMiddleware
  const { userId, email, exp } = req.user;

  return res.status(200).json({
    success: true,
    user   : { userId, email },
    tokenExpiresAt: new Date(exp * 1000).toISOString(),
  });
}

module.exports = { login, getProfile };
