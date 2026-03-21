'use client';

import { create } from 'zustand';
import type { UserRole } from '@artist-booking/shared';
import { apiClient, setTokens, clearTokens } from './api-client';

// Decode JWT payload without a library
function decodeJWT(token: string): { user_id: string; role: UserRole; phone?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.user_id || !payload.role) return null;
    return payload;
  } catch {
    return null;
  }
}

interface AuthState {
  user: {
    id: string;
    phone: string;
    role: UserRole;
    is_new: boolean;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _initialized: boolean;

  initialize: () => void;
  generateOTP: (phone: string) => Promise<{ expiresInSeconds: number }>;
  verifyOTP: (phone: string, otp: string, role?: UserRole) => Promise<void>;
  refreshToken: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthState['user']) => void;
}

// Eagerly compute initial auth state from localStorage (runs once at module load)
function getInitialAuthState(): Pick<AuthState, 'user' | 'isAuthenticated' | '_initialized'> {
  if (typeof window === 'undefined') {
    return { user: null, isAuthenticated: false, _initialized: false };
  }
  const token = localStorage.getItem('access_token');
  if (!token) {
    return { user: null, isAuthenticated: false, _initialized: true };
  }
  const payload = decodeJWT(token);
  if (payload?.user_id && payload?.role) {
    return {
      user: {
        id: payload.user_id,
        phone: payload.phone ?? '',
        role: payload.role as UserRole,
        is_new: false,
      },
      isAuthenticated: true,
      _initialized: true,
    };
  }
  clearTokens();
  return { user: null, isAuthenticated: false, _initialized: true };
}

const initialAuth = getInitialAuthState();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialAuth.user,
  isAuthenticated: initialAuth.isAuthenticated,
  isLoading: false,
  _initialized: initialAuth._initialized,

  initialize: () => {
    if (get()._initialized) return;
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('access_token');
    if (!token) {
      set({ _initialized: true });
      return;
    }

    const payload = decodeJWT(token);
    if (payload?.user_id && payload?.role) {
      set({
        user: {
          id: payload.user_id,
          phone: payload.phone ?? '',
          role: payload.role,
          is_new: false,
        },
        isAuthenticated: true,
        _initialized: true,
      });
    } else {
      clearTokens();
      set({ _initialized: true });
    }
  },

  generateOTP: async (phone: string) => {
    set({ isLoading: true });
    try {
      const res = await apiClient<{ message: string; expires_in_seconds: number }>(
        '/v1/auth/otp/generate',
        { method: 'POST', body: JSON.stringify({ phone }) },
      );
      if (!res.success) throw new Error(res.errors[0]?.message ?? 'Failed to send OTP');
      return { expiresInSeconds: res.data.expires_in_seconds };
    } finally {
      set({ isLoading: false });
    }
  },

  verifyOTP: async (phone: string, otp: string, role?: UserRole) => {
    set({ isLoading: true });
    try {
      const res = await apiClient<{
        access_token: string;
        refresh_token: string;
        expires_in: number;
        user: AuthState['user'];
      }>('/v1/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, otp, role }),
      });

      if (!res.success) throw new Error(res.errors[0]?.message ?? 'Verification failed');

      setTokens(res.data.access_token, res.data.refresh_token);
      set({ user: res.data.user, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshToken: async () => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
    if (!stored) return;

    try {
      const res = await apiClient<{
        access_token: string;
        refresh_token: string;
      }>('/v1/auth/token/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: stored }),
      });

      if (res.success) {
        setTokens(res.data.access_token, res.data.refresh_token);
        set({ isAuthenticated: true });
      }
    } catch {
      clearTokens();
      set({ user: null, isAuthenticated: false });
    }
  },

  logout: async () => {
    try {
      await apiClient('/v1/auth/logout', { method: 'POST' });
    } catch {
      // Best-effort — token may already be expired
    } finally {
      clearTokens();
      set({ user: null, isAuthenticated: false });
      // Redirect to homepage after logout
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));
