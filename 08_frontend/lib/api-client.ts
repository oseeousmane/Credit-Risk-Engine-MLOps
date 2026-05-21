// ─── API Base URL ──────────────────────────────────────────────────────────
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// ─── Token Key Constants ───────────────────────────────────────────────────
export const INTERNAL_TOKEN_KEY = 'internal_token';
export const CLIENT_TOKEN_KEY = 'client_token';
export const INTERNAL_REFRESH_KEY = 'internal_refresh_token';
export const CLIENT_REFRESH_KEY = 'client_refresh_token';

async function tryRefresh(tokenKey: string, refreshKey: string, loginPath: string): Promise<string | null> {
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem(refreshKey) : null;
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(tokenKey);
        localStorage.removeItem(refreshKey);
        if (!window.location.pathname.includes(loginPath)) window.location.href = loginPath;
      }
      return null;
    }
    const data = await res.json();
    if (typeof window !== 'undefined') {
      localStorage.setItem(tokenKey, data.access_token);
      if (data.refresh_token) localStorage.setItem(refreshKey, data.refresh_token);
    }
    return data.access_token;
  } catch {
    return null;
  }
}

/**
 * Core fetch wrapper for INTERNAL dashboard API calls.
 * On 401: attempts silent token refresh before redirecting to /auth/login.
 */
export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem(INTERNAL_TOKEN_KEY) : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

  if (response.status === 401) {
    const newToken = await tryRefresh(INTERNAL_TOKEN_KEY, INTERNAL_REFRESH_KEY, '/auth/login');
    if (newToken) {
      const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
      const retry = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers: retryHeaders });
      if (!retry.ok) {
        const errorData = await retry.json().catch(() => null);
        throw new Error(errorData?.message || `Request failed (${retry.status})`);
      }
      return retry.json();
    }
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || `Request failed (${response.status})`);
  }

  return response.json();
}

/**
 * Core fetch wrapper for CLIENT PORTAL API calls.
 * On 401: attempts silent token refresh before redirecting to /client-portal/login.
 */
export async function fetchClient(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem(CLIENT_TOKEN_KEY) : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

  if (response.status === 401) {
    const newToken = await tryRefresh(CLIENT_TOKEN_KEY, CLIENT_REFRESH_KEY, '/client-portal/login');
    if (newToken) {
      const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
      const retry = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers: retryHeaders });
      if (!retry.ok) {
        const errorData = await retry.json().catch(() => null);
        throw new Error(errorData?.message || `Request failed (${retry.status})`);
      }
      return retry.json();
    }
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || `Request failed (${response.status})`);
  }

  return response.json();
}
