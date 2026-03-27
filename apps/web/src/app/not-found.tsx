import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-nocturne-base">
      {/* Ambient glows */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#c39bff]/5 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#a1faff]/5 blur-3xl rounded-full pointer-events-none" />

      <div className="glass-card rounded-2xl border border-white/10 p-12 text-center space-y-6 relative z-10 max-w-md">
        <div>
          <h1 className="text-7xl font-display font-extrabold tracking-tighter text-[#c39bff] mb-3">404</h1>
          <p className="text-2xl font-display font-bold text-white mb-2">Page not found</p>
          <p className="text-white/50">The page you're looking for doesn't exist or has been moved.</p>
        </div>
        <div className="space-y-3 pt-4">
          <Link
            href="/"
            className="block btn-nocturne-primary py-3 rounded-lg font-semibold"
          >
            Go Home
          </Link>
          <Link
            href="/search"
            className="block bg-white/5 hover:bg-white/10 text-white py-3 rounded-lg font-semibold border border-white/10 transition-colors"
          >
            Search Artists
          </Link>
        </div>
      </div>
    </div>
  );
}
