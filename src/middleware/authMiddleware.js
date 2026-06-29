const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 *
 * Protects routes by verifying the Bearer token in the Authorization header.
 * Attaches the decoded user payload to `req.user` on success.
 *
 * Usage: Apply to any route that requires an authenticated user.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  // Expect header in format: "Bearer <token>"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET || 'default_jwt_secret';
    const decoded = jwt.verify(token, secret);

    // Attach decoded payload to request for downstream use
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token.',
    });
  }
};

/**
 * Rate Limiting Middleware (brute force prevention)
 *
 * Tracks failed login attempts per IP.
 * Blocks further attempts after exceeding the threshold within a time window.
 */
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const rateLimitLogin = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (record) {
    // Reset window if expired
    if (now - record.firstAttempt > WINDOW_MS) {
      loginAttempts.set(ip, { count: 1, firstAttempt: now });
      return next();
    }

    if (record.count >= MAX_ATTEMPTS) {
      const retryAfterMs = WINDOW_MS - (now - record.firstAttempt);
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);
      return res.status(429).json({
        status: 'error',
        message: `Too many login attempts. Please try again in ${retryAfterSec} seconds.`,
      });
    }

    record.count += 1;
  } else {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
  }

  next();
};

module.exports = { authenticateToken, rateLimitLogin };
