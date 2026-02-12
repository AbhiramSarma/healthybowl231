/**
 * API URL Helper
 * Centralized function to build full API URLs for production
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Builds a full API URL from an endpoint path
 * @param {string} endpoint - API endpoint (e.g., '/api/menu' or 'api/menu')
 * @returns {string} Full URL or relative path if no base URL is set
 */
export const apiUrl = (endpoint) => {
  const base = API_BASE_URL.replace(/\/$/, ''); // Remove trailing slash
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return base ? `${base}${path}` : path;
};

export default apiUrl;
