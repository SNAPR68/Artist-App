'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AuthError({ error, reset }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    // Log error details for monitoring
    console.error('Auth error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-surface-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="text-2xl font-heading font-bold text-gradient inline-block">
            ArtistBook
          </Link>
        </div>

        {/* Error content */}
        <div className="bg-surface-200 rounded-lg p-8 space-y-6">
          {/* Error icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-danger/10 rounded-full blur-lg" />
              <AlertCircle className="relative w-14 h-14 text-danger" />
            </div>
          </div>

          {/* Error message */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-heading font-bold text-text-primary">
              Authentication Error
            </h1>
            <p className="text-text-secondary">
              {error.message || 'An error occurred during authentication'}
            </p>
          </div>

          {/* Error code (if available) */}
          {error.digest && (
            <div className="bg-surface-300/50 rounded p-3 text-center">
              <p className="text-xs text-text-secondary font-mono break-all">
                Error ID: {error.digest}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 w-full bg-primary text-white font-medium py-3 rounded-lg hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>

            <button
              onClick={() => router.push('/')}
              className="flex items-center justify-center gap-2 w-full bg-surface-300 text-text-primary font-medium py-3 rounded-lg hover:bg-surface-400 transition-colors"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </button>
          </div>

          {/* Help links */}
          <div className="text-center text-sm text-text-secondary space-y-2">
            <p>Having trouble signing in?</p>
            <Link href="/help" className="text-primary hover:underline">
              Get help with your account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
