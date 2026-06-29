const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// In-memory mock user store (replace with DB query in production)
const users = [];

/**
 * Registers a user into the mock store (used by registration flow).
 * @param {string} email
 * @param {string} hashedPassword
 */
const saveUser = (email, hashedPassword) => {
  users.push({ email, password: hashedPassword });
};

/**
 * Finds a user by email from the mock store.
 * @param {string} email
 * @returns {object|undefined}
 */
const findUserByEmail = (email) => {
  return users.find((user) => user.email === email);
};

/**
 * Verifies the plain-text password against the stored bcrypt hash.
 * @param {string} plainPassword - The password submitted by the user.
 * @param {string} hashedPassword - The bcrypt hashed password stored in DB.
 * @returns {Promise<boolean>}
 */
const verifyPassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

/**
 * Generates a signed JWT access token.
 * @param {object} payload - Data to embed in the token (userId, email).
 * @returns {string} - Signed JWT token.
 */
const generateAccessToken = (payload) => {
  const secret = process.env.JWT_SECRET || 'default_jwt_secret';
  const options = { expiresIn: process.env.JWT_EXPIRES_IN || '1h' };
  return jwt.sign(payload, secret, options);
};

/**
 * Core login service.
 * Validates credentials and returns a JWT token on success.
 *
 * @param {string} email - User's email address.
 * @param {string} password - Plain-text password from request.
 * @returns {Promise<{ token: string }>}
 * @throws {Error} with status 401 if credentials are invalid.
 */
const loginUser = async (email, password) => {
  // Step 1: Look up user by email
  const user = findUserByEmail(email);

  // Step 2: User not found — generic error to prevent user enumeration
  if (!user) {
    const error = new Error('Invalid email or password.');
    error.status = 401;
    throw error;
  }

  // Step 3: Compare submitted password with stored bcrypt hash
  const isPasswordValid = await verifyPassword(password, user.password);

  if (!isPasswordValid) {
    const error = new Error('Invalid email or password.');
    error.status = 401;
    throw error;
  }

  // Step 4: Generate JWT access token — NO plaintext password in payload
  const token = generateAccessToken({ email: user.email });

  return { token };
};

module.exports = {
  saveUser,
  findUserByEmail,
  verifyPassword,
  generateAccessToken,
  loginUser,
};
