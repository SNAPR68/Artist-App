'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onSessionExpired } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth';

/**
 * SessionExpiredModal
 *
 * Listens for session-expired events from the API client and shows a dialog
 * instead of silently redirecting the user. The user sees what happened and
 * can click "Log in again" to go to /login with a redirect back to the
 * current page.
 */
export function SessionExpiredModal() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      setOpen(true);
    });
    return unsubscribe;
  }, []);

  const handleLogin = useCallback(() => {
    setOpen(false);
    // Clear auth state without calling the API (token is already dead)
    useAuthStore.setState({ user: null, isAuthenticated: false });
    router.replace(`/login?redirect=${encodeURIComponent(pathname ?? '/')}`);
  }, [router, pathname]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 p-6 animate-in fade-in zoom-in-95">
        {/* Icon */}
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h2
          id="session-expired-title"
          className="text-lg font-semibold text-gray-900 text-center"
        >
          Session Expired
        </h2>
        <p className="mt-2 text-sm text-gray-600 text-center">
          Your session has expired for security reasons. Please log in again to
          continue where you left off.
        </p>

        <button
          onClick={handleLogin}
          className="mt-6 w-full rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
        >
          Log in again
        </button>
      </div>
    </div>
  );
}
