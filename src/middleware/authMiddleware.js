'use strict';

const jwt           = require('jsonwebtoken');
const { verifyToken } = require('../utils/jwtUtils');

/**
 * Express middleware that validates a Bearer JWT token on incoming requests.
 *
 * On success  → attaches decoded user ({ userId, email, iat, exp }) to req.user
 *               and calls next().
 * On failure  → responds with 401 Unauthorized and a JSON error body.
 *
 * Expected header format:
 *   Authorization: Bearer <token>
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error  : 'Unauthorized',
      message: 'Missing or malformed Authorization header. Expected: Bearer <token>',
    });
  }

  const token = authHeader.slice(7).trim(); // Remove "Bearer " prefix

  if (!token) {
    return res.status(401).json({
      success: false,
      error  : 'Unauthorized',
      message: 'Token is empty.',
    });
  }

  try {
    const decoded = verifyToken(token);
    req.user = {
      userId: decoded.userId,
      email : decoded.email,
      iat   : decoded.iat,
      exp   : decoded.exp,
    };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error  : 'Unauthorized',
        message: 'Token has expired. Please log in again.',
      });
    }

    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error  : 'Unauthorized',
        message: 'Invalid token. Authentication failed.',
      });
    }

    // Unexpected error — do not expose internals
    return res.status(401).json({
      success: false,
      error  : 'Unauthorized',
      message: 'Authentication error.',
    });
  }
}

module.exports = { authMiddleware };
