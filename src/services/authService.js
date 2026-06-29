'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * In-memory user store (simulates a database).
 * Passwords are pre-hashed with bcryptjs (salt rounds = 10).
 * Replace with a real DB query in production.
 */
const users = [
  {
    id: 1,
    email: 'raj@example.com',
    // bcrypt hash of "Password@123"
    password: '$2a$10$7EqJtq98hPqEX7fNZaFWoOa0zjp.HJrXDVxS9UtzRr5R3M0y9kVEC',
    name: 'Raj Sanghvi',
  },
];

/**
 * Find a user record by email address.
 * @param {string} email
 * @returns {object|null}
 */
const findUserByEmail = (email) => {
  return users.find((u) => u.email === email) || null;
};

/**
 * Compare a plain-text password with a bcrypt hash.
 * @param {string} plainPassword
 * @param {string} hashedPassword
 * @returns {Promise<boolean>}
 */
const comparePassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

/**
 * Sign a JWT token using JWT_SECRET from environment variables.
 * Token expires in 1 hour.
 * @param {object} payload  - data to embed (e.g. { id, email })
 * @returns {string}        - signed JWT string
 */
const generateToken = (payload) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return jwt.sign(payload, secret, { expiresIn: '1h' });
};

module.exports = { findUserByEmail, comparePassword, generateToken };
