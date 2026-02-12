/**
 * Security Middleware
 * Helmet, CORS, Rate Limiting, Payload Limits
 */

const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Helmet configuration for security headers
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:5173', 'http://localhost:3000'];
    
    // Check if origin matches any allowed origin
    const isAllowed = allowedOrigins.some(allowed => {
      // Exact match
      if (origin === allowed) return true;
      // Match with/without trailing slash
      if (origin === allowed.replace(/\/$/, '') || origin === allowed + '/') return true;
      
      // Special handling for Vercel preview URLs
      // If main domain is healthybowl231.vercel.app, also allow preview URLs
      if (allowed.includes('healthybowl231.vercel.app')) {
        const vercelPreviewPattern = /^https:\/\/healthybowl231-[a-z0-9]+-abhiram-sarmas-projects\.vercel\.app$/;
        if (vercelPreviewPattern.test(origin)) return true;
        // Also allow any healthybowl231-*.vercel.app pattern
        if (/^https:\/\/healthybowl231-.*\.vercel\.app$/.test(origin)) return true;
      }
      
      // Match wildcard subdomains (e.g., *.vercel.app)
      if (allowed.includes('*')) {
        const pattern = allowed.replace(/\*/g, '[^.]*').replace(/\./g, '\\.');
        const regex = new RegExp('^' + pattern + '$');
        return regex.test(origin);
      }
      return false;
    });
    
    if (isAllowed || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.log(`CORS blocked: ${origin} not in allowed origins:`, allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400, // 24 hours
};

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  },
});

// Strict rate limiter for auth endpoints (login/register only)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs (increased from 5 for production)
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins against the limit
  skip: (req) => {
    // Skip rate limiting for refresh endpoint (uses general limiter instead)
    return req.path === '/api/auth/refresh';
  },
  // Use IP address for rate limiting (Express will handle X-Forwarded-For when trust proxy is enabled)
  // Note: trust proxy must be enabled in Express app for this to work correctly
});

// Strict rate limiter for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many payment requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Payload size limit middleware
const payloadSizeLimit = (req, res, next) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const contentLength = parseInt(req.get('content-length') || '0');
  
  if (contentLength > maxSize) {
    return res.status(413).json({ 
      error: 'Payload too large',
      message: 'Request body exceeds maximum size of 10MB'
    });
  }
  
  next();
};

module.exports = {
  helmetConfig,
  corsOptions,
  generalLimiter,
  authLimiter,
  paymentLimiter,
  payloadSizeLimit,
};
