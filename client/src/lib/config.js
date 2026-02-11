/**
 * Application Configuration
 * Centralized config management
 */

export const config = {
  api: {
    baseURL: import.meta.env.VITE_API_URL || '',
    timeout: 30000,
    retries: 3,
  },
  app: {
    name: 'Healthy Bowl',
    version: '1.0.0',
    environment: import.meta.env.MODE || 'development',
  },
  features: {
    guestCheckout: true,
    realTimeTracking: true,
    paymentGateway: 'razorpay',
  },
  // DevTools disabled in production
  devTools: import.meta.env.MODE === 'development',
};

export default config;
