'use client';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-nocturne-base">
      <div className="text-center px-6">
        <h1 className="text-6xl font-bold text-nocturne-text-primary mb-4">500</h1>
        <p className="text-xl text-nocturne-text-secondary mb-8">Something went wrong</p>
        <button onClick={reset} className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
          Try Again
        </button>
      </div>
    </div>
  );
}
