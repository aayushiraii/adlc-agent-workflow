'use strict';

require('dotenv').config();

const express    = require('express');
const authRoutes = require('./routes/authRoutes');

const app = express();

// ──────────────────────────────────────────
// Global Middleware
// ──────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ──────────────────────────────────────────
// Routes
// ──────────────────────────────────────────
app.use('/auth', authRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error  : 'Not Found',
    message: 'The requested resource does not exist.',
  });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    error  : 'Internal Server Error',
    message: 'An unexpected error occurred.',
  });
});

// ──────────────────────────────────────────
// Start server (only when not under test)
// ──────────────────────────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`[SERVER] Running on http://localhost:${PORT}`);
  });
}

module.exports = app;
