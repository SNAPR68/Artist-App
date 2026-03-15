'use client';

import { create } from 'zustand';
import type { UserRole } from '@artist-booking/shared';
import { apiClient, setTokens, clearTokens } from './api-client';

interface AuthState {
  user: {
    id: string;
    phone: string;
    role: UserRole;
    is_new: boolean;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  generateOTP: (phone: string) => Promise<{ expiresInSeconds: number }>;
  verifyOTP: (phone: string, otp: string, role?: UserRole) => Promise<void>;
  refreshToken: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthState['user']) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

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
    } finally {
      clearTokens();
      set({ user: null, isAuthenticated: false });
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));
