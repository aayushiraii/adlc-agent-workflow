'use strict';

process.env.JWT_SECRET = 'test_secret_key';

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const authRoutes = require('../routes/authRoutes');
const { verifyToken } = require('../middleware/authMiddleware');

// ── App setup ────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

// Protected test route to validate the middleware
app.get('/protected', verifyToken, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

// ── POST /auth/login ─────────────────────────────────────────────────────────
describe('POST /auth/login', () => {
  // ── 400: Missing fields ──────────────────────────────────────────────────
  test('should return 400 when email is missing', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ password: 'Password@123' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.missing).toContain('email');
  });

  test('should return 400 when password is missing', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'raj@example.com' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.missing).toContain('password');
  });

  test('should return 400 when both fields are missing', async () => {
    const res = await request(app).post('/auth/login').send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.missing).toEqual(expect.arrayContaining(['email', 'password']));
  });

  // ── 401: Invalid credentials ─────────────────────────────────────────────
  test('should return 401 for non-existent email', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'unknown@example.com', password: 'Password@123' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid email or password/i);
  });

  test('should return 401 for wrong password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'raj@example.com', password: 'WrongPassword' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid email or password/i);
  });

  // ── 200: Successful login ────────────────────────────────────────────────
  test('should return 200 with a JWT token for valid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'raj@example.com', password: 'Password@123' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();

    // Verify the returned token is valid
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.email).toBe('raj@example.com');
  });
});

// ── verifyToken middleware ────────────────────────────────────────────────────
describe('GET /protected (verifyToken middleware)', () => {
  test('should return 401 when Authorization header is missing', async () => {
    const res = await request(app).get('/protected');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/No token provided/i);
  });

  test('should return 401 for an invalid/tampered token', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer this.is.not.valid');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid or expired token/i);
  });

  test('should return 200 and attach user when token is valid', async () => {
    const token = jwt.sign(
      { id: 1, email: 'raj@example.com' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('raj@example.com');
  });
});
