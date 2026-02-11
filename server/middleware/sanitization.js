/**
 * Input Sanitization Middleware
 * NoSQL injection prevention, XSS sanitization, strip unknown fields
 */

const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

// MongoDB sanitization - prevents NoSQL injection
const mongoSanitizeConfig = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`[Sanitization] Removed prohibited key: ${key} from request`);
  },
});

// HTTP Parameter Pollution prevention
const hppConfig = hpp({
  whitelist: ['category', 'status', 'sort'], // Allow these to be arrays
});

// Custom sanitization for request body
const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    // Remove $ and . operators (MongoDB injection prevention)
    const sanitizeObject = (obj) => {
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      } else if (obj !== null && typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
          // Block MongoDB operators
          if (key.startsWith('$') || key.includes('.')) {
            console.warn(`[Sanitization] Blocked MongoDB operator in key: ${key}`);
            continue;
          }
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      }
      // Escape strings to prevent XSS
      if (typeof obj === 'string') {
        return obj
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;');
      }
      return obj;
    };
    
    req.body = sanitizeObject(req.body);
  }
  next();
};

module.exports = {
  mongoSanitizeConfig,
  hppConfig,
  sanitizeBody,
};
