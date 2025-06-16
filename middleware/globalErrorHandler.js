/**
 * Global Error Handling Middleware for StartGoals API
 * Catches all unhandled errors and returns consistent JSON responses
 */

/**
 * Handle validation errors
 */
const handleValidationError = (res, err) => {
  return res.status(400).json({
    status: false,
    success: false,
    message: 'Validation failed',
    data: null,
    errors: err.details ? err.details.map(detail => ({
      field: detail.path ? detail.path.join('.') : 'unknown',
      message: detail.message,
      value: detail.context?.value
    })) : [{ message: err.message }]
  });
};

/**
 * Handle server errors
 */
const handleServerError = (res, message = 'Internal server error') => {
  return res.status(500).json({
    status: false,
    success: false,
    message,
    data: null,
  });
};

/**
 * Global error handler middleware
 * This should be the last middleware in the chain
 */
export const globalErrorHandler = (err, req, res, next) => {
  // Log the error for debugging
  console.error('Global error handler caught:', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  // If response was already sent, delegate to Express default error handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle different types of errors
  if (err.name === 'ValidationError' || err.isJoi) {
    return handleValidationError(res, err);
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: false,
      success: false,
      message: 'Invalid authentication token',
      data: null,
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: false,
      success: false,
      message: 'Authentication token has expired',
      data: null,
    });
  }

  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      status: false,
      success: false,
      message: 'Database validation error',
      data: null,
      errors: err.errors?.map(e => ({
        field: e.path,
        message: e.message,
        value: e.value
      }))
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      status: false,
      success: false,
      message: 'Resource already exists',
      data: null,
      errors: err.errors?.map(e => ({
        field: e.path,
        message: `${e.path} already exists`,
        value: e.value
      }))
    });
  }

  // Default server error
  return handleServerError(res, err.message || 'Internal server error');
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass to error handler
 */
export const asyncErrorWrapper = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    status: false,
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    data: null,
  });
};

export default globalErrorHandler;
