export const API_BASE = '/api';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('vault_dms_token');
}

export function storeToken(token: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('vault_dms_token', token);
}

/**
 * fetch() wrapper that attaches the stored JWT as a Bearer token.
 * Every backend route except @Public()-marked ones (auth, health, plans)
 * requires this - see JwtAuthGuard on the backend.
 */
export async function authedFetch(path: string, options: RequestInit = {}) {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  // Don't force JSON content-type for FormData bodies (file uploads) - the
  // browser needs to set its own multipart boundary.
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}
