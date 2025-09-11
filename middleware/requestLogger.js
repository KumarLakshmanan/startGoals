import { logHttp } from '../utils/logger.js';

/**
 * Request Logging Middleware
 * Logs all incoming requests with endpoint and request data
 */

const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "Unknown";

  // Log basic request info
  logHttp(`REQUEST: ${method} ${url} from ${ip}`, {
    timestamp,
    method,
    url,
    ip,
    userAgent,
    body: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
    query: req.query && Object.keys(req.query).length > 0 ? req.query : undefined,
    params: req.params && Object.keys(req.params).length > 0 ? req.params : undefined,
    headers: (() => {
      const sanitizedHeaders = { ...req.headers };
      delete sanitizedHeaders.authorization;
      delete sanitizedHeaders.cookie;
      delete sanitizedHeaders["x-api-key"];
      return sanitizedHeaders;
    })()
  });

  next();
};

export default requestLogger;
