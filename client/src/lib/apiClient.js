/**
 * API Client Wrapper
 * Single API wrapper with interceptors, retry strategy, timeout, and error handling
 */

// Use proxy in development, direct URL in production
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'production' ? 'https://your-api-domain.com' : '');
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Request ID generator for correlation
let requestIdCounter = 0;
const generateRequestId = () => `req_${Date.now()}_${++requestIdCounter}`;

// Inflight requests tracker for cancellation
const inflightRequests = new Map();

/**
 * Cancel inflight request
 */
export const cancelRequest = (requestId) => {
  const controller = inflightRequests.get(requestId);
  if (controller) {
    controller.abort();
    inflightRequests.delete(requestId);
  }
};

/**
 * Cancel all inflight requests
 */
export const cancelAllRequests = () => {
  inflightRequests.forEach((controller) => controller.abort());
  inflightRequests.clear();
};

/**
 * Retry strategy for failed requests
 */
const retryRequest = async (fn, retries = MAX_RETRIES, delay = RETRY_DELAY) => {
  try {
    return await fn();
  } catch (error) {
    // Don't retry on 4xx errors (client errors)
    if (error.status >= 400 && error.status < 500) {
      throw error;
    }
    
    // Don't retry if aborted
    if (error.name === 'AbortError') {
      throw error;
    }
    
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryRequest(fn, retries - 1, delay * 2); // Exponential backoff
    }
    throw error;
  }
};

/**
 * Check if request is idempotent
 */
const isIdempotent = (method) => {
  return ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
};

/**
 * Main API request function
 */
const apiRequest = async (endpoint, options = {}) => {
  const {
    method = 'GET',
    body,
    headers = {},
    timeout = REQUEST_TIMEOUT,
    retry = true,
    signal: externalSignal,
    ...restOptions
  } = options;

  const requestId = generateRequestId();
  const controller = new AbortController();
  const signal = externalSignal || controller.signal;
  
  // Track inflight request
  inflightRequests.set(requestId, controller);

  // Get token from auth store (if available)
  const authStorage = localStorage.getItem('auth-storage');
  let token = null;
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage);
      token = parsed.state?.token;
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Build headers
  const requestHeaders = {
    'Content-Type': 'application/json',
    'X-Request-ID': requestId,
    ...headers,
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Build URL - handle double slashes
  let url;
  if (endpoint.startsWith('http')) {
    url = endpoint;
  } else {
    // Remove trailing slash from base URL and leading slash from endpoint to avoid double slashes
    const base = API_BASE_URL.replace(/\/$/, '');
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    url = base ? `${base}${path}` : path;
  }

  // Create timeout
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const makeRequest = async () => {
    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal,
        credentials: 'include', // Include cookies for refresh tokens
        ...restOptions,
      });

      clearTimeout(timeoutId);
      inflightRequests.delete(requestId);

      // Handle 401 - Auto logout
      if (response.status === 401) {
        // For refresh endpoint, let the auth store handle it (no redirect)
        const isRefreshEndpoint =
          endpoint.includes('/api/auth/refresh') || url.includes('/api/auth/refresh');
        if (!isRefreshEndpoint) {
          // Clear auth storage
          localStorage.removeItem('auth-storage');
          // Redirect to home instead of login
          if (window.location.pathname !== '/') {
            window.location.href = '/';
          }
        }
        throw new Error('Unauthorized');
      }

      // Handle 403 - Forbidden
      if (response.status === 403) {
        throw new Error('Forbidden - You do not have permission to access this resource');
      }

      // Parse response
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else if (contentType && contentType.includes('text/csv')) {
        // Handle CSV downloads
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'download.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
        return { success: true };
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const error = new Error(data.error || data.message || `HTTP ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      inflightRequests.delete(requestId);

      // Handle network errors
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - Please try again');
      }

      if (!navigator.onLine) {
        throw new Error('You are offline - Please check your internet connection');
      }

      throw error;
    }
  };

  // Apply retry strategy for idempotent requests or if explicitly enabled
  if (retry && (isIdempotent(method) || retry === true)) {
    return retryRequest(makeRequest);
  }

  return makeRequest();
};

/**
 * API methods
 */
export const api = {
  get: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'DELETE' }),
};

export default api;
