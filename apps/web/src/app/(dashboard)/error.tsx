'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    // Log error details for monitoring
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-nocturne-base flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Error icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-danger/10 rounded-full blur-lg" />
            <AlertCircle className="relative w-16 h-16 text-danger" />
          </div>
        </div>

        {/* Error message */}
        <div className="space-y-2">
          <h1 className="text-3xl font-display font-bold text-nocturne-text-primary">
            Oops! Something went wrong
          </h1>
          <p className="text-nocturne-text-secondary text-lg">
            {error.message || 'An unexpected error occurred on the dashboard'}
          </p>
        </div>

        {/* Error code (if available) */}
        {error.digest && (
          <div className="bg-nocturne-surface rounded-lg p-4">
            <p className="text-sm text-nocturne-text-secondary font-mono break-all">
              Error ID: {error.digest}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3 pt-4">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 w-full bg-nocturne-accent text-white font-medium py-3 rounded-lg hover:bg-nocturne-accent/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>

          <button
            onClick={() => router.push('/artist')}
            className="flex items-center justify-center gap-2 w-full bg-nocturne-surface-2 text-nocturne-text-primary font-medium py-3 rounded-lg hover:bg-nocturne-surface border border-nocturne-border transition-colors"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </button>
        </div>

        {/* Help text */}
        <div className="text-sm text-nocturne-text-secondary">
          <p>If the problem persists, please contact support or try again later.</p>
        </div>
      </div>
    </div>
  );
}
