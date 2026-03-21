'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth';

export function AuthInitializer() {
  const initialize = useAuthStore((s) => s.initialize);
  const _initialized = useAuthStore((s) => s._initialized);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Remove the inline auth-loading skeleton once the store has resolved.
  // This prevents the white flash on initial load for authenticated users.
  useEffect(() => {
    if (_initialized) {
      const root = document.documentElement;
      root.classList.remove('auth-loading');
      root.classList.add('auth-ready');
      // After the CSS transition finishes, clean up entirely
      const timer = setTimeout(() => {
        root.classList.remove('auth-ready');
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [_initialized]);

  return null;
}
