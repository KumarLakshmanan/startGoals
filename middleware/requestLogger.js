/**
 * Request Logging Middleware
 * Logs all incoming requests with endpoint and request data
 */

const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';
  
  // Log basic request info
  console.log('\n=== REQUEST LOG ===');
  console.log(`Timestamp: ${timestamp}`);
  console.log(`Method: ${method}`);
  console.log(`Endpoint: ${url}`);
  console.log(`IP: ${ip}`);
  console.log(`User-Agent: ${userAgent}`);
  
  // Log request data based on method
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
  }
  
  if (req.query && Object.keys(req.query).length > 0) {
    console.log('Query Params:', JSON.stringify(req.query, null, 2));
  }
  
  if (req.params && Object.keys(req.params).length > 0) {
    console.log('Route Params:', JSON.stringify(req.params, null, 2));
  }
  
  // Log headers (excluding sensitive ones)
  const sanitizedHeaders = { ...req.headers };
  delete sanitizedHeaders.authorization;
  delete sanitizedHeaders.cookie;
  delete sanitizedHeaders['x-api-key'];
  console.log('Headers:', JSON.stringify(sanitizedHeaders, null, 2));
  
  console.log('==================\n');
  
  next();
};

export default requestLogger;
