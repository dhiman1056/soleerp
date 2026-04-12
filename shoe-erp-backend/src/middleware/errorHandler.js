'use strict';

/**
 * Centralized error-handling middleware.
 * Must be registered LAST in app.js (after all routes).
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl} →`, err.message);

  // express-validator passes errors via err.errors array
  if (err.type === 'validation') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors:  err.errors,
    });
  }

  // PostgreSQL unique-violation
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'A record with the same unique key already exists.',
      detail:  err.detail,
    });
  }

  // PostgreSQL foreign-key violation
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Foreign key constraint violation.',
      detail:  err.detail,
    });
  }

  // PostgreSQL check-constraint violation
  if (err.code === '23514') {
    return res.status(400).json({
      success: false,
      message: 'Check constraint violation.',
      detail:  err.detail,
    });
  }

  const status  = err.status  || 500;
  const message = err.message || 'Internal Server Error';

  return res.status(status).json({
    success: false,
    message,
  });
};

/**
 * Tiny helper to create a structured operational error.
 * Usage: throw createError(404, 'Work order not found');
 */
const createError = (status, message) => {
  const err  = new Error(message);
  err.status = status;
  return err;
};

module.exports = { errorHandler, createError };
