'use client';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-6">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">500</h1>
        <p className="text-xl text-gray-600 mb-8">Something went wrong</p>
        <button onClick={reset} className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
          Try Again
        </button>
      </div>
    </div>
  );
}
