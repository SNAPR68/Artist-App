import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-6">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">Page not found</p>
        <div className="space-x-4">
          <Link href="/" className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 inline-block">
            Go Home
          </Link>
          <Link href="/search" className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 inline-block">
            Search Artists
          </Link>
        </div>
      </div>
    </div>
  );
}
