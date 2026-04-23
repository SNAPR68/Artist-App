/**
 * Vendor decline tap-through. Token IS the credential — no auth.
 */
import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function decline(token: string): Promise<'ok' | 'invalid'> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/v1/vendor-confirm/${token}?response=declined`,
      { cache: 'no-store' },
    );
    return res.ok ? 'ok' : 'invalid';
  } catch {
    return 'invalid';
  }
}

export default async function VendorDeclinePage({ params }: { params: { token: string } }) {
  const result = await decline(params.token);

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6">
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-[#ff8fb1]/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="relative glass-card rounded-2xl p-10 md:p-14 border border-white/5 max-w-lg text-center">
        {result === 'ok' ? (
          <>
            <div className="text-6xl mb-4">✕</div>
            <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tighter text-white mb-3">
              Marked as declined
            </h1>
            <p className="text-white/60 mb-6">
              Got it — the production team has been notified. They’ll reach out if they
              need to chat or find a replacement.
            </p>
          </>
        ) : (
          <>
            <div className="text-6xl mb-4">·</div>
            <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tighter text-white mb-3">
              Link expired
            </h1>
            <p className="text-white/60 mb-6">
              This link isn’t valid anymore. Reply to the WhatsApp message with{' '}
              <strong>NO</strong> instead.
            </p>
          </>
        )}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 hover:bg-white/10 transition-colors"
        >
          Back to GRID
        </Link>
      </div>
    </div>
  );
}
