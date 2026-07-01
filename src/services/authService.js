'use strict';

const { generateToken } = require('../utils/jwtUtils');

/**
 * In-memory mock user store.
 * Replace with a real database lookup in production.
 */
const MOCK_USERS = [
  {
    id     : 'usr_001',
    email  : 'alice@example.com',
    // bcrypt hash of "password123" — use bcrypt.compare() in production
    password: 'password123',
    name   : 'Alice',
  },
  {
    id     : 'usr_002',
    email  : 'bob@example.com',
    password: 'securepass',
    name   : 'Bob',
  },
];

/**
 * Authenticates a user by email and password, and generates a JWT token.
 *
 * @param {string} email    - The user's email address.
 * @param {string} password - The user's plain-text password.
 * @returns {{ token: string, user: { userId: string, email: string } }}
 * @throws {Error} With message 'INVALID_CREDENTIALS' if credentials do not match.
 */
function loginUser(email, password) {
  if (!email || !password) {
    const err = new Error('INVALID_CREDENTIALS');
    err.statusCode = 400;
    throw err;
  }

  const user = MOCK_USERS.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    const err = new Error('INVALID_CREDENTIALS');
    err.statusCode = 401;
    throw err;
  }

  const tokenPayload = {
    userId: user.id,
    email : user.email,
  };

  const token = generateToken(tokenPayload);

  return {
    token,
    user: {
      userId: user.id,
      email : user.email,
      name  : user.name,
    },
  };
}

module.exports = { loginUser };
