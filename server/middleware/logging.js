/**
 * Structured Logging Middleware
 * Request correlation IDs, error logs, auth attempts, admin actions
 */

const morgan = require('morgan');
const crypto = require('crypto');

// Generate request ID middleware
const requestIdMiddleware = (req, res, next) => {
  // Use randomUUID if available (Node 15.6+), otherwise fallback
  let requestId = req.headers['x-request-id'];
  if (!requestId) {
    if (typeof crypto.randomUUID === 'function') {
      requestId = crypto.randomUUID();
    } else {
      // Fallback for older Node versions
      requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
  }
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

// Structured logging format
morgan.token('request-id', (req) => req.requestId || '-');
morgan.token('user-id', (req) => req.userId || 'guest');

const logFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" [request-id=:request-id] [user-id=:user-id]';

// Morgan logger configuration
const requestLogger = morgan(logFormat, {
  skip: (req) => {
    // Skip logging for health checks
    return req.path === '/health' || req.path === '/api/health';
  },
});

// Auth attempt logger
const logAuthAttempt = (req, success, reason = '') => {
  const logData = {
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    phone: req.body?.phone || 'unknown',
    success,
    reason,
  };
  
  console.log(`[Auth Attempt] ${JSON.stringify(logData)}`);
};

// Admin action logger
const logAdminAction = (req, action, resource, resourceId) => {
  const logData = {
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    userId: req.userId || 'unknown',
    ip: req.ip,
    action,
    resource,
    resourceId,
  };
  
  console.log(`[Admin Action] ${JSON.stringify(logData)}`);
};

// Error logger
const logError = (req, error, context = {}) => {
  const logData = {
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    userId: req.userId || 'guest',
    ip: req.ip,
    url: req.originalUrl,
    method: req.method,
    error: {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    },
    context,
  };
  
  console.error(`[Error] ${JSON.stringify(logData)}`);
};

// Payment logger
const logPayment = (req, orderId, amount, status, paymentId = null) => {
  const logData = {
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    userId: req.userId || 'guest',
    orderId,
    amount,
    status,
    paymentId,
  };
  
  // Don't log full payment details in production
  console.log(`[Payment] ${JSON.stringify(logData)}`);
};

module.exports = {
  requestIdMiddleware,
  requestLogger,
  logAuthAttempt,
  logAdminAction,
  logError,
  logPayment,
};
