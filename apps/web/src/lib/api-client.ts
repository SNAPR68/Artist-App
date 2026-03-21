import type { ApiResponse } from '@artist-booking/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

let accessToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
let refreshTokenVar: string | null = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;

function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window !== 'undefined') {
    accessToken = localStorage.getItem('access_token');
  }
  return accessToken;
}

function getRefreshToken(): string | null {
  if (refreshTokenVar) return refreshTokenVar;
  if (typeof window !== 'undefined') {
    refreshTokenVar = localStorage.getItem('refresh_token');
  }
  return refreshTokenVar;
}

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshTokenVar = refresh;
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    // Mirror token into a cookie so Next.js middleware can read it for route protection.
    // This is NOT httpOnly — it's a signal cookie. The actual auth is still Bearer token.
    // SameSite=Lax prevents CSRF. Path=/ makes it available to middleware on all routes.
    document.cookie = `auth_token=${access}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
  }
}

export function clearTokens() {
  accessToken = null;
  refreshTokenVar = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    // Clear the signal cookie
    document.cookie = 'auth_token=; path=/; max-age=0; SameSite=Lax';
  }
}

// ─── Session expiry event ───
// Fires when refresh fails and session is truly dead. Components can listen
// to show a modal instead of silently redirecting.
type SessionExpiredListener = () => void;
const sessionExpiredListeners: Set<SessionExpiredListener> = new Set();

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => { sessionExpiredListeners.delete(listener); };
}

function emitSessionExpired() {
  sessionExpiredListeners.forEach((fn) => fn());
}

// ─── Retry queue for concurrent 401s ───
// When multiple requests hit 401 at the same time, only ONE refresh call
// should fire. The rest queue up and replay once the single refresh resolves.
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  // If a refresh is already in flight, piggy-back on it
  if (refreshPromise) return refreshPromise;

  const stored = getRefreshToken();
  if (!stored) return false;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/v1/auth/token/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: stored }),
      });

      if (!res.ok) {
        clearTokens();
        emitSessionExpired();
        return false;
      }

      const data = await res.json();
      setTokens(data.data.access_token, data.data.refresh_token);
      return true;
    } catch {
      clearTokens();
      emitSessionExpired();
      return false;
    } finally {
      // Clear the singleton so future 401s can trigger a fresh refresh
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiClient<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(url, { ...options, headers });

  // Auto-refresh on 401
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getAccessToken()}`;
      response = await fetch(url, { ...options, headers });
    } else {
      // Don't hard-redirect — the SessionExpiredModal handles UX.
      return { success: false, data: {} as T, errors: [{ code: 'UNAUTHORIZED', message: 'Session expired. Please log in again.' }] } as ApiResponse<T>;
    }
  }

  const json = await response.json();
  return json as ApiResponse<T>;
}
