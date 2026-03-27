'use client';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-nocturne-base">
      {/* Ambient glows */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#c39bff]/5 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#a1faff]/5 blur-3xl rounded-full pointer-events-none" />

      <div className="glass-card rounded-2xl border border-white/10 p-12 text-center space-y-6 relative z-10 max-w-md">
        <div>
          <h1 className="text-7xl font-display font-extrabold tracking-tighter text-[#c39bff] mb-3">500</h1>
          <p className="text-2xl font-display font-bold text-white mb-2">Oops! Something went wrong</p>
          <p className="text-white/50">An unexpected error occurred. Our team has been notified.</p>
        </div>
        <button
          onClick={reset}
          className="btn-nocturne-primary w-full py-3 rounded-lg font-semibold"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
