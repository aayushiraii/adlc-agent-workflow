const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// ─── Mock the authService module ────────────────────────────────────────────
const {
  saveUser,
  findUserByEmail,
  verifyPassword,
  generateAccessToken,
  loginUser,
} = require('../services/authService');

// ─── Mock the authMiddleware module ─────────────────────────────────────────
const { authenticateToken, rateLimitLogin } = require('../middleware/authMiddleware');

// ─── Mock the authController module ─────────────────────────────────────────
const { login } = require('../controllers/authController');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a lightweight mock of Express req/res/next for unit testing
 * controllers and middleware without spinning up a real HTTP server.
 */
const mockReqRes = (bodyOverrides = {}, headerOverrides = {}) => {
  const req = {
    body: { email: 'user@example.com', password: 'Passw0rd!', ...bodyOverrides },
    headers: { authorization: '', ...headerOverrides },
    ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' },
  };
  const res = {
    statusCode: 200,
    _json: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this._json = data; return this; },
  };
  const next = jest.fn();
  return { req, res, next };
};

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — authService
// ─────────────────────────────────────────────────────────────────────────────

describe('authService', () => {
  let hashedPassword;

  beforeAll(async () => {
    hashedPassword = await bcrypt.hash('Passw0rd!', 10);
    saveUser('service@example.com', hashedPassword);
  });

  // ── findUserByEmail ────────────────────────────────────────────────────────

  describe('findUserByEmail()', () => {
    test('TC-SVC-01 | returns user object for a registered email', () => {
      const user = findUserByEmail('service@example.com');
      expect(user).toBeDefined();
      expect(user.email).toBe('service@example.com');
    });

    test('TC-SVC-02 | returns undefined for an unregistered email', () => {
      const user = findUserByEmail('ghost@example.com');
      expect(user).toBeUndefined();
    });
  });

  // ── verifyPassword ─────────────────────────────────────────────────────────

  describe('verifyPassword()', () => {
    test('TC-SVC-03 | resolves true for a correct password', async () => {
      const result = await verifyPassword('Passw0rd!', hashedPassword);
      expect(result).toBe(true);
    });

    test('TC-SVC-04 | resolves false for an incorrect password', async () => {
      const result = await verifyPassword('WrongPass!', hashedPassword);
      expect(result).toBe(false);
    });
  });

  // ── generateAccessToken ────────────────────────────────────────────────────

  describe('generateAccessToken()', () => {
    test('TC-SVC-05 | returns a valid signed JWT string', () => {
      const token = generateAccessToken({ email: 'service@example.com' });
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // header.payload.signature
    });

    test('TC-SVC-06 | JWT payload contains the expected email', () => {
      const token = generateAccessToken({ email: 'service@example.com' });
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_jwt_secret');
      expect(decoded.email).toBe('service@example.com');
    });

    test('TC-SVC-07 | JWT payload does NOT contain a password field', () => {
      const token = generateAccessToken({ email: 'service@example.com' });
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_jwt_secret');
      expect(decoded.password).toBeUndefined();
    });
  });

  // ── loginUser ──────────────────────────────────────────────────────────────

  describe('loginUser()', () => {
    test('TC-SVC-08 | resolves with a token for valid credentials', async () => {
      const result = await loginUser('service@example.com', 'Passw0rd!');
      expect(result).toHaveProperty('token');
      expect(typeof result.token).toBe('string');
    });

    test('TC-SVC-09 | throws 401 for a non-existent email', async () => {
      await expect(loginUser('nobody@example.com', 'Passw0rd!')).rejects.toMatchObject({
        status: 401,
        message: 'Invalid email or password.',
      });
    });

    test('TC-SVC-10 | throws 401 for a wrong password', async () => {
      await expect(loginUser('service@example.com', 'BadPass123')).rejects.toMatchObject({
        status: 401,
        message: 'Invalid email or password.',
      });
    });

    test('TC-SVC-11 | error message is identical for wrong email & wrong password (no enumeration)', async () => {
      let errEmail, errPass;
      try { await loginUser('nobody@example.com', 'Passw0rd!'); } catch (e) { errEmail = e.message; }
      try { await loginUser('service@example.com', 'BadPass123'); } catch (e) { errPass = e.message; }
      expect(errEmail).toBe(errPass);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — authController
// ─────────────────────────────────────────────────────────────────────────────

describe('authController — login()', () => {
  let seededHash;

  beforeAll(async () => {
    seededHash = await bcrypt.hash('Passw0rd!', 10);
    saveUser('ctrl@example.com', seededHash);
  });

  test('TC-CTRL-01 | 200 + accessToken for valid credentials', async () => {
    const { req, res } = mockReqRes({ email: 'ctrl@example.com', password: 'Passw0rd!' });
    await login(req, res);
    expect(res.statusCode).toBe(200);
    expect(res._json.status).toBe('success');
    expect(res._json).toHaveProperty('accessToken');
  });

  test('TC-CTRL-02 | 400 when email is missing', async () => {
    const { req, res } = mockReqRes({ email: '', password: 'Passw0rd!' });
    await login(req, res);
    expect(res.statusCode).toBe(400);
    expect(res._json.missingFields).toContain('email');
  });

  test('TC-CTRL-03 | 400 when password is missing', async () => {
    const { req, res } = mockReqRes({ email: 'ctrl@example.com', password: '' });
    await login(req, res);
    expect(res.statusCode).toBe(400);
    expect(res._json.missingFields).toContain('password');
  });

  test('TC-CTRL-04 | 400 when both fields are missing', async () => {
    const { req, res } = mockReqRes({ email: '', password: '' });
    await login(req, res);
    expect(res.statusCode).toBe(400);
    expect(res._json.missingFields).toHaveLength(2);
  });

  test('TC-CTRL-05 | 400 for malformed email format', async () => {
    const { req, res } = mockReqRes({ email: 'not-an-email', password: 'Passw0rd!' });
    await login(req, res);
    expect(res.statusCode).toBe(400);
    expect(res._json.details).toMatch(/invalid email format/i);
  });

  test('TC-CTRL-06 | 401 for unregistered email', async () => {
    const { req, res } = mockReqRes({ email: 'unknown@example.com', password: 'Passw0rd!' });
    await login(req, res);
    expect(res.statusCode).toBe(401);
  });

  test('TC-CTRL-07 | 401 for wrong password', async () => {
    const { req, res } = mockReqRes({ email: 'ctrl@example.com', password: 'WrongPass!' });
    await login(req, res);
    expect(res.statusCode).toBe(401);
  });

  test('TC-CTRL-08 | response body does NOT expose password', async () => {
    const { req, res } = mockReqRes({ email: 'ctrl@example.com', password: 'Passw0rd!' });
    await login(req, res);
    const responseStr = JSON.stringify(res._json);
    expect(responseStr).not.toMatch(/Passw0rd!/);
    expect(responseStr).not.toMatch(/password/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — authMiddleware
// ─────────────────────────────────────────────────────────────────────────────

describe('authMiddleware — authenticateToken()', () => {
  const secret = process.env.JWT_SECRET || 'default_jwt_secret';

  test('TC-MW-01 | calls next() for a valid Bearer token', () => {
    const token = jwt.sign({ email: 'mw@example.com' }, secret, { expiresIn: '1h' });
    const { req, res, next } = mockReqRes({}, { authorization: `Bearer ${token}` });
    authenticateToken(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.email).toBe('mw@example.com');
  });

  test('TC-MW-02 | 401 when Authorization header is missing', () => {
    const { req, res, next } = mockReqRes({}, { authorization: '' });
    authenticateToken(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('TC-MW-03 | 401 when token is tampered / invalid', () => {
    const { req, res, next } = mockReqRes({}, { authorization: 'Bearer tampered.token.value' });
    authenticateToken(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('TC-MW-04 | 401 when token is expired', () => {
    const token = jwt.sign({ email: 'mw@example.com' }, secret, { expiresIn: '-1s' });
    const { req, res, next } = mockReqRes({}, { authorization: `Bearer ${token}` });
    authenticateToken(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('TC-MW-05 | 401 when header uses wrong scheme (Basic instead of Bearer)', () => {
    const { req, res, next } = mockReqRes({}, { authorization: 'Basic dXNlcjpwYXNz' });
    authenticateToken(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('authMiddleware — rateLimitLogin()', () => {
  test('TC-RATE-01 | allows request under the attempt threshold', () => {
    const { req, res, next } = mockReqRes({}, {});
    req.ip = '10.0.0.1'; // isolated IP
    rateLimitLogin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('TC-RATE-02 | blocks request after exceeding MAX_ATTEMPTS', () => {
    const ip = '10.0.0.99'; // isolated IP for this test
    // Exhaust 5 attempts
    for (let i = 0; i < 5; i++) {
      const { req, res, next } = mockReqRes({}, {});
      req.ip = ip;
      rateLimitLogin(req, res, next);
    }
    // 6th attempt should be blocked
    const { req, res, next } = mockReqRes({}, {});
    req.ip = ip;
    rateLimitLogin(req, res, next);
    expect(res.statusCode).toBe(429);
    expect(next).not.toHaveBeenCalled();
  });
});
