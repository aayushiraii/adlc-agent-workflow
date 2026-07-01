'use strict';

process.env.JWT_SECRET = 'test_super_secret_key_for_jest';
process.env.JWT_EXPIRY = '1h';

const request = require('supertest');
const jwt     = require('jsonwebtoken');
const app     = require('../app');

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite: POST /auth/login
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /auth/login', () => {
  it('AC-1/AC-2/AC-3 | should return 200 with a valid JWT token on correct credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();

    // Decode without verification to inspect payload
    const decoded = jwt.decode(res.body.token);
    expect(decoded).toHaveProperty('userId', 'usr_001');
    expect(decoded).toHaveProperty('email', 'alice@example.com');
    expect(decoded).toHaveProperty('exp');
    expect(decoded).toHaveProperty('iat');

    // Expiry should be ~1 hour from now
    expect(decoded.exp - decoded.iat).toBe(3600);
  });

  it('AC-1 | should sign the token with the configured JWT_SECRET (HS256)', () => {
    const { generateToken } = require('../utils/jwtUtils');
    const token = generateToken({ userId: 'usr_001', email: 'alice@example.com' });

    // Verification should succeed with the correct secret
    expect(() =>
      jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
    ).not.toThrow();

    // Verification should FAIL with a wrong secret
    expect(() =>
      jwt.verify(token, 'wrong_secret', { algorithms: ['HS256'] })
    ).toThrow(jwt.JsonWebTokenError);
  });

  it('should return 401 for incorrect password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('should return 401 for unknown email', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'anything' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 when email is missing', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 when password is missing', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite: GET /auth/profile (Protected Route)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /auth/profile', () => {
  let validToken;

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@example.com', password: 'password123' });
    validToken = res.body.token;
  });

  it('AC-5/AC-6 | should return 200 and attach user info when a valid token is provided', async () => {
    const res = await request(app)
      .get('/auth/profile')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toHaveProperty('userId', 'usr_001');
    expect(res.body.user).toHaveProperty('email', 'alice@example.com');
    expect(res.body).toHaveProperty('tokenExpiresAt');
  });

  it('AC-4 | should return 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/auth/profile');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('AC-4 | should return 401 for a malformed token', async () => {
    const res = await request(app)
      .get('/auth/profile')
      .set('Authorization', 'Bearer this.is.not.a.valid.token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('AC-4 | should return 401 for an expired token', async () => {
    // Generate a token that has already expired
    const expiredToken = jwt.sign(
      { userId: 'usr_001', email: 'alice@example.com' },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: -1 } // expired 1 second ago
    );

    const res = await request(app)
      .get('/auth/profile')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/expired/i);
  });

  it('AC-4 | should return 401 when Authorization header is missing Bearer prefix', async () => {
    const res = await request(app)
      .get('/auth/profile')
      .set('Authorization', validToken); // no "Bearer " prefix

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('AC-4 | should return 401 for a token signed with the wrong secret', async () => {
    const wrongToken = jwt.sign(
      { userId: 'usr_001', email: 'alice@example.com' },
      'completely_wrong_secret',
      { algorithm: 'HS256', expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/auth/profile')
      .set('Authorization', `Bearer ${wrongToken}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite: AC-3 — JWT_EXPIRY configurability via environment variable
// ─────────────────────────────────────────────────────────────────────────────
describe('JWT_EXPIRY configurability', () => {
  it('AC-3 | token exp reflects the configured JWT_EXPIRY value', () => {
    const { generateToken } = require('../utils/jwtUtils');

    process.env.JWT_EXPIRY = '30m';
    const token   = generateToken({ userId: 'usr_999', email: 'test@example.com' });
    const decoded = jwt.decode(token);
    const diffMin = Math.round((decoded.exp - decoded.iat) / 60);
    expect(diffMin).toBe(30);

    // Restore
    process.env.JWT_EXPIRY = '1h';
  });
});
