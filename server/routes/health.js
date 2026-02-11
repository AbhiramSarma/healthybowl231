/**
 * Health Check Endpoint
 * Monitoring & Health checks
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Health check endpoint
router.get('/', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    services: {},
  };

  // Check MongoDB connection
  try {
    const dbState = mongoose.connection.readyState;
    health.services.database = {
      status: dbState === 1 ? 'connected' : 'disconnected',
      state: dbState,
    };
  } catch (error) {
    health.services.database = {
      status: 'error',
      error: error.message,
    };
  }

  // Check memory usage
  const memoryUsage = process.memoryUsage();
  health.services.memory = {
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
    rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
  };

  // Determine overall health status
  const allServicesHealthy = Object.values(health.services).every(
    service => service.status === 'connected' || service.status === 'ok'
  );

  const statusCode = allServicesHealthy ? 200 : 503;
  health.status = allServicesHealthy ? 'ok' : 'degraded';

  res.status(statusCode).json(health);
});

module.exports = router;
