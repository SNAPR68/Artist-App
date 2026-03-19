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
  }
}

export function clearTokens() {
  accessToken = null;
  refreshTokenVar = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
}

async function refreshAccessToken(): Promise<boolean> {
  const stored = getRefreshToken();
  if (!stored) return false;

  try {
    const res = await fetch(`${API_BASE_URL}/v1/auth/token/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: stored }),
    });

    if (!res.ok) {
      clearTokens();
      return false;
    }

    const data = await res.json();
    setTokens(data.data.access_token, data.data.refresh_token);
    return true;
  } catch {
    clearTokens();
    return false;
  }
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
      // Don't hard-redirect — let callers handle auth failures gracefully.
      // Return error response instead of nuking the session.
      return { success: false, data: {} as T, errors: [{ code: 'UNAUTHORIZED', message: 'Session expired. Please log in again.' }] } as ApiResponse<T>;
    }
  }

  const json = await response.json();
  return json as ApiResponse<T>;
}
