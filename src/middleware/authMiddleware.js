'use strict';

const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware.
 *
 * Reads the Authorization header (Bearer token), verifies
 * the JWT signature and expiry, and attaches the decoded
 * payload to `req.user` before calling `next()`.
 *
 * Responds with 401 Unauthorized when:
 *  - Authorization header is absent or malformed.
 *  - Token is expired, tampered, or otherwise invalid.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  // ── 401: Missing or malformed header ─────────────────────────────────
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    // ── Verify and decode token ─────────────────────────────────────────
    const decoded = jwt.verify(token, secret);
    req.user = decoded; // attach user payload to request
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired token.',
      error: error.message,
    });
  }
};

module.exports = { verifyToken };
