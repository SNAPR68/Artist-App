'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>Something went wrong</h1>
          <p style={{ color: '#71717A', marginBottom: '2rem' }}>An unexpected error occurred. Please try again.</p>
          <button onClick={reset} style={{ padding: '0.75rem 2rem', backgroundColor: '#8B5CF6', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', cursor: 'pointer' }}>
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
