/**
 * Application Configuration & API Base URL Resolver
 *
 * In local development:
 *   VITE_API_BASE_URL can be omitted or empty, in which case relative paths
 *   ('/api/...') are proxied by Vite's development server to http://127.0.0.1:8000.
 *
 * In production (Vercel):
 *   Set VITE_API_BASE_URL in your Vercel Project Settings to your Render backend URL,
 *   e.g. https://secretpixel-backend.onrender.com
 */

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

/**
 * Resolves an API endpoint path against the configured API_BASE_URL.
 *
 * @param {string} endpoint - The endpoint path (e.g. '/api/embed')
 * @returns {string} Full URL in production or proxied relative path in development
 */
export function getApiUrl(endpoint) {
  if (!endpoint) return '';
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://') || endpoint.startsWith('data:')) {
    return endpoint;
  }
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
}
