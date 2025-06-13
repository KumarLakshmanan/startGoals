/**
 * Standardized Error Handling Middleware for StartGoals API
 * Provides consistent error responses across all endpoints
 */

import { ValidationError } from 'sequelize';

// Standard error response format
const createErrorResponse = (status, message, details = null, errorCode = null) => {
  return {
    success: false,
    status: false, // Legacy compatibility
    error: {
      code: errorCode || `ERROR_${status}`,
      message,
      details,
      timestamp: new Date().toISOString()
    }
  };
};

// Standard success response format
export const createSuccessResponse = (data, message = 'Operation successful', meta = null) => {
  const response = {
    success: true,
    status: true, // Legacy compatibility
    message,
    data
  };
  
  if (meta) {
    response.meta = meta;
  }
  
  return response;
};

// Validation error handler
export const handleValidationError = (res, error, customMessage = null) => {
  let errorDetails = [];
  
  if (error instanceof ValidationError) {
    errorDetails = error.errors.map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));
  } else if (error.details) {
    // Joi validation error
    errorDetails = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));
  }
  
  return res.status(400).json(createErrorResponse(
    400,
    customMessage || 'Validation failed',
    errorDetails,
    'VALIDATION_ERROR'
  ));
};

// Authentication error handler
export const handleAuthError = (res, message = 'Authentication required') => {
  return res.status(401).json(createErrorResponse(
    401,
    message,
    null,
    'AUTH_ERROR'
  ));
};

// Authorization error handler
export const handleAuthorizationError = (res, message = 'Insufficient permissions') => {
  return res.status(403).json(createErrorResponse(
    403,
    message,
    null,
    'AUTHORIZATION_ERROR'
  ));
};

// Not found error handler
export const handleNotFoundError = (res, resource = 'Resource', customMessage = null) => {
  return res.status(404).json(createErrorResponse(
    404,
    customMessage || `${resource} not found`,
    null,
    'NOT_FOUND_ERROR'
  ));
};

// Conflict error handler (duplicate resources)
export const handleConflictError = (res, message = 'Resource already exists') => {
  return res.status(409).json(createErrorResponse(
    409,
    message,
    null,
    'CONFLICT_ERROR'
  ));
};

// Rate limit error handler
export const handleRateLimitError = (res, retryAfter = 60) => {
  res.set('Retry-After', retryAfter);
  return res.status(429).json(createErrorResponse(
    429,
    `Rate limit exceeded. Please try again after ${retryAfter} seconds.`,
    { retryAfter },
    'RATE_LIMIT_ERROR'
  ));
};

// Server error handler
export const handleServerError = (res, error, customMessage = null) => {
  console.error('Server Error:', error);
  
  return res.status(500).json(createErrorResponse(
    500,
    customMessage || 'Internal server error',
    process.env.NODE_ENV === 'development' ? error.stack : null,
    'SERVER_ERROR'
  ));
};

// Database error handler
export const handleDatabaseError = (res, error, customMessage = null) => {
  console.error('Database Error:', error);
  
  let message = customMessage || 'Database operation failed';
  let details = null;
  
  if (process.env.NODE_ENV === 'development') {
    details = {
      name: error.name,
      message: error.message,
      sql: error.sql
    };
  }
  
  return res.status(500).json(createErrorResponse(
    500,
    message,
    details,
    'DATABASE_ERROR'
  ));
};

// Generic error handler middleware
export const errorHandler = (error, req, res, next) => {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    return handleValidationError(res, error);
  }
  
  if (error.name === 'SequelizeValidationError') {
    return handleValidationError(res, error);
  }
  
  if (error.name === 'SequelizeUniqueConstraintError') {
    return handleConflictError(res, 'Duplicate entry: ' + error.errors[0]?.message);
  }
  
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return handleDatabaseError(res, error, 'Invalid reference to related resource');
  }
  
  if (error.name === 'JsonWebTokenError') {
    return handleAuthError(res, 'Invalid authentication token');
  }
  
  if (error.name === 'TokenExpiredError') {
    return handleAuthError(res, 'Authentication token expired');
  }
  
  // Default server error
  return handleServerError(res, error);
};

// Async error wrapper
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Input validation middleware
export const validateRequiredFields = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (!req.body[field] && req.body[field] !== 0 && req.body[field] !== false) {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      return handleValidationError(res, {
        details: missingFields.map(field => ({
          field,
          message: `${field} is required`
        }))
      }, 'Missing required fields');
    }
    
    next();
  };
};

// Pagination validation middleware
export const validatePagination = (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;
  
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  if (isNaN(pageNum) || pageNum < 1) {
    return handleValidationError(res, {
      details: [{ field: 'page', message: 'Page must be a positive integer' }]
    });
  }
  
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return handleValidationError(res, {
      details: [{ field: 'limit', message: 'Limit must be between 1 and 100' }]
    });
  }
  
  req.pagination = {
    page: pageNum,
    limit: limitNum,
    offset: (pageNum - 1) * limitNum
  };
  
  next();
};

// Success response helper
export const sendSuccessResponse = (res, data, message = 'Operation successful', meta = null, statusCode = 200) => {
  return res.status(statusCode).json(createSuccessResponse(data, message, meta));
};

export default {
  createErrorResponse,
  createSuccessResponse,
  handleValidationError,
  handleAuthError,
  handleAuthorizationError,
  handleNotFoundError,
  handleConflictError,
  handleRateLimitError,
  handleServerError,
  handleDatabaseError,
  errorHandler,
  asyncHandler,
  validateRequiredFields,
  validatePagination,
  sendSuccessResponse
};
