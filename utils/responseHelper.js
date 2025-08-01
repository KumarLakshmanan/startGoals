/**
 * Response Helper Functions
 * Standardized functions for API responses
 */

/**
 * Send a success response
 * @param {Object} res - Express response object
 * @param {Number} code - HTTP status code (200, 201, etc.)
 * @param {String} message - Success message
 * @param {Object|Array|null} data - Response data
 * @returns {Object} Express response
 */
export const sendSuccess = (res, message = "Request successful", data = null) => {
  return res.status(200).json({
    status: true,
    success: true,
    code: 200,
    message,
    data
  });
};

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {Number} code - HTTP status code (400, 401, 404, 500, etc.)
 * @param {String} message - Error message
 * @param {Object} errors - Field-specific errors object
 * @returns {Object} Express response
 */
export const sendError = (res, code = 400, message = "Request failed", errors = {}) => {
  return res.status(code).json({
    status: false,
    success: false,
    code,
    message,
    data: null,
    errors
  });
};

/**
 * Send a validation error response
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Object} errors - Field-specific errors object
 * @returns {Object} Express response
 */
export const sendValidationError = (res, message = "Validation failed", errors = {}) => {
  return sendError(res, 400, message, errors);
};

/**
 * Send a not found error response
 * @param {Object} res - Express response object
 * @param {String} message - Not found message
 * @param {Object} errors - Field-specific errors object
 * @returns {Object} Express response
 */
export const sendNotFound = (res, message = "Resource not found", errors = {}) => {
  return sendError(res, 404, message, errors);
};

/**
 * Send an unauthorized error response
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @returns {Object} Express response
 */
export const sendUnauthorized = (res, message = "Unauthorized access") => {
  return sendError(res, 401, message, { auth: message });
};

/**
 * Send a forbidden error response
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @returns {Object} Express response
 */
export const sendForbidden = (res, message = "Access forbidden") => {
  return sendError(res, 403, message, { permission: message });
};

/**
 * Send a server error response
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 * @returns {Object} Express response
 */
export const sendServerError = (res, error = null) => {
  const message = error?.message || "Internal server error";
  return sendError(res, 500, message, { server: message });
};

/**
 * Send a conflict error response
 * @param {Object} res - Express response object
 * @param {String} field - Field with conflict
 * @param {String} value - Value causing conflict
 * @returns {Object} Express response
 */
export const sendConflict = (res, field, value = "") => {
  const message = `${field} already exists${value ? `: ${value}` : ""}`;
  return sendError(res, 409, message, { [field]: message  });
};

/**
 * Send a generic response
 * @param {Object} res - Express response object
 * @param {Number} statusCode - HTTP status code
 * @param {Boolean} success - Success status
 * @param {String} message - Response message
 * @param {Object|Array|null} data - Response data
 * @returns {Object} Express response
 */
export const sendResponse = (res, statusCode = 200, success = true, message = "Request processed", data = null) => {
  return res.status(statusCode).json({
    success,
    status: success,
    code: statusCode,
    message,
    data
  });
};

export default {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendServerError,
  sendConflict,
  sendResponse
};
