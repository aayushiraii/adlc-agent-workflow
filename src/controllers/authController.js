'use strict';

const { findUserByEmail, comparePassword, generateToken } = require('../services/authService');

/**
 * POST /auth/login
 * Authenticates a user and returns a signed JWT token.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ── 400: Missing required fields ──────────────────────────────────────
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Bad Request: email and password are required.',
        missing: [
          ...(!email ? ['email'] : []),
          ...(!password ? ['password'] : []),
        ],
      });
    }

    // ── 401: User not found ───────────────────────────────────────────────
    const user = findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid email or password.',
      });
    }

    // ── 401: Password mismatch ────────────────────────────────────────────
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid email or password.',
      });
    }

    // ── 200: Successful login ─────────────────────────────────────────────
    const token = generateToken({ id: user.id, email: user.email });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error.',
      error: error.message,
    });
  }
};

module.exports = { login };
