'use strict';

const jwt = require('jsonwebtoken');

/**
 * Generates a signed JWT token for the given user payload.
 *
 * @param {Object} payload - Must include userId and email.
 * @returns {string} Signed JWT token string.
 * @throws {Error} If JWT_SECRET is not configured.
 */
function generateToken(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set.');
  }

  const expiry = process.env.JWT_EXPIRY || '1h';

  return jwt.sign(
    {
      userId: payload.userId,
      email:  payload.email,
    },
    secret,
    {
      algorithm : 'HS256',
      expiresIn : expiry,
    }
  );
}

/**
 * Verifies and decodes a JWT token.
 *
 * @param {string} token - The JWT token string to verify.
 * @returns {Object} The decoded payload ({ userId, email, iat, exp }).
 * @throws {jwt.TokenExpiredError}   If the token has expired.
 * @throws {jwt.JsonWebTokenError}   If the token is malformed or invalid.
 * @throws {Error}                   If JWT_SECRET is not configured.
 */
function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set.');
  }

  return jwt.verify(token, secret, { algorithms: ['HS256'] });
}

module.exports = { generateToken, verifyToken };
