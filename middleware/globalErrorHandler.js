import {

  sendValidationError,
  sendServerError,
  sendUnauthorized,
  sendNotFound,
  sendConflict,
} from "../utils/responseHelper.js";
import { logError } from "../utils/logger.js";

/**
 * Handle validation errors
 */
const handleValidationError = (res, err) => {
  const errors = {};
  if (err.details) {
    err.details.forEach((detail) => {
      const field = detail.path ? detail.path.join(".") : "unknown";
      errors[field] = detail.message;
    });
  } else {
    errors.validation = err.message;
  }
  return sendValidationError(res, "Validation failed", errors);
};

/**
 * Global error handler middleware
 */
export const globalErrorHandler = (err, req, res, next) => {
  logError("Global error handler caught", {
    error: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    url: req.url,
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString(),
  });

  if (res.headersSent) {
    return next(err);
  }

  if (err.name === "ValidationError" || err.isJoi) {
    return handleValidationError(res, err);
  }

  if (err.name === "JsonWebTokenError") {
    return sendUnauthorized(res, "Invalid authentication token");
  }

  if (err.name === "TokenExpiredError") {
    return sendUnauthorized(res, "Authentication token has expired");
  }

  if (err.name === "SequelizeValidationError") {
    const errors = {};
    err.errors?.forEach((e) => {
      errors[e.path] = e.message;
    });
    return sendValidationError(res, "Database validation error", errors);
  }

  if (err.name === "SequelizeUniqueConstraintError") {
    const errors = {};
    err.errors?.forEach((e) => {
      errors[e.path] = `${e.path} already exists`;
    });
    return sendConflict(res, Object.keys(errors)[0] || "resource");
  }

  // Default server error
  return sendServerError(res, err);
};

/**
 * Async error wrapper
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
  return sendNotFound(res, `Route ${req.method} ${req.originalUrl} not found`, {
    route: `Route ${req.method} ${req.originalUrl} not found`,
  });
};

export default globalErrorHandler;
