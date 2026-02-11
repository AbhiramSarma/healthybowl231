/**
 * Centralized Error Handler
 * Consistent error format, no stack traces to client, graceful failures
 */

const errorHandler = (err, req, res, next) => {
  // Log error with request ID
  const requestId = req.headers['x-request-id'] || 'unknown';
  
  console.error(`[${requestId}] Error:`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: errors.join(', '),
      requestId,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      error: 'Duplicate Entry',
      message: `${field} already exists`,
      requestId,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid Token',
      message: 'Authentication token is invalid',
      requestId,
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token Expired',
      message: 'Authentication token has expired',
      requestId,
    });
  }

  // MongoDB connection error
  if (err.name === 'MongoNetworkError' || err.name === 'MongoServerSelectionError') {
    return res.status(503).json({
      success: false,
      error: 'Service Unavailable',
      message: 'Database connection failed. Please try again later.',
      requestId,
    });
  }

  // Razorpay errors
  if (err.error && err.error.description) {
    return res.status(400).json({
      success: false,
      error: 'Payment Error',
      message: err.error.description,
      requestId,
    });
  }

  // Custom application errors
  if (err.status) {
    return res.status(err.status).json({
      success: false,
      error: err.error || 'Error',
      message: err.message || 'An error occurred',
      requestId,
    });
  }

  // Default 500 error - don't expose internal details
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred. Please try again later.'
      : err.message,
    requestId,
  });
};

// 404 handler
const notFoundHandler = (req, res) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    requestId,
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
