/**
 * Server Configuration
 * Centralized config management
 */

module.exports = {
  server: {
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || 'development',
    name: 'Spice Route API',
    version: '1.0.0',
  },
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/spice_route',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'YOUR_KEY_ID',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'YOUR_KEY_SECRET',
  },
  security: {
    corsOrigins: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:5173', 'http://localhost:3000'],
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
    },
    authRateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 5,
    },
  },
};
