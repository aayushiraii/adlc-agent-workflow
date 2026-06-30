const { loginUser } = require('../services/authService');

/**
 * POST /auth/login
 *
 * Handles user login requests.
 * - Validates that email and password fields are present.
 * - Delegates credential verification and token generation to authService.
 * - Returns appropriate HTTP status codes based on the outcome.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  // ── Task 2: Input Validation ──────────────────────────────────────────────
  const missingFields = [];
  if (!email) missingFields.push('email');
  if (!password) missingFields.push('password');

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed. Missing required fields.',
      missingFields,
    });
  }

  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed.',
      details: 'Invalid email format.',
    });
  }

  // ── Task 3 & 4: Credential Verification & Token Generation ────────────────
  try {
    const { token } = await loginUser(email, password);

    return res.status(200).json({
      status: 'success',
      message: 'Login successful.',
      accessToken: token,
    });
  } catch (err) {
    const statusCode = err.status || 500;

    // Do NOT log plaintext passwords — only log the error message
    console.error(`[AuthController] Login failed for email: ${email} | Error: ${err.message}`);

    return res.status(statusCode).json({
      status: 'error',
      message: err.message || 'An unexpected error occurred.',
    });
  }
};

module.exports = { login };
