/**
 * API URL Configuration
 * 
 * Uses relative URLs (empty string) for all API calls.
 * Frontend and backend share the same domain via ingress routing
 * in both preview and production — no need for absolute URLs.
 * 
 * If REACT_APP_BACKEND_URL is set and matches the current domain,
 * it's used. Otherwise, falls back to relative URLs to prevent
 * CORS issues from stale deployment secrets.
 */
const configured = process.env.REACT_APP_BACKEND_URL || '';

function resolveApiUrl() {
  if (!configured) return '';
  try {
    const url = new URL(configured);
    if (typeof window !== 'undefined' && url.host !== window.location.host) {
      return '';
    }
    return configured;
  } catch {
    return '';
  }
}

export const API_URL = resolveApiUrl();
