'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '../../../../lib/api-client';
interface ReputationExport {
  artist_id: string;
  stage_name: string;
  trust_score: number;
  on_time_pct: number;
  bookings_completed: number;
  rating_avg: number;
  rating_count: number;
  disputes_lost: number;
  token: string;
}

export default function ReputationPage() {
  const [data, setData] = useState<ReputationExport | null>(null);
  const [loading, setLoading] = useState(true);
  const [notArtist, setNotArtist] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiClient<ReputationExport>('/v1/reputation/export')
      .then((res) => {
        if (res.success) setData(res.data);
        else if (res.errors?.[0]?.code === 'NOT_ARTIST') setNotArtist(true);
      })
      .catch(() => setNotArtist(true))
      .finally(() => setLoading(false));
  }, []);

  function downloadJwt() {
    if (!data) return;
    const blob = new Blob([data.token], { type: 'application/jwt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grid-reputation-${data.stage_name.replace(/\s+/g, '-').toLowerCase()}.jwt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyVerifyUrl() {
    if (!data) return;
    const url = `${process.env.NEXT_PUBLIC_API_URL}/v1/reputation/export/${data.artist_id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c39bff]" />
      </div>
    );
  }

  if (notArtist) {
    return (
      <div className="glass-card rounded-xl p-8 border border-white/5 max-w-lg">
        <p className="text-white/50 text-sm">Reputation data not available for this account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ambient glows */}
      <div className="fixed -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed -bottom-40 -left-20 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Page header */}
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tighter text-gradient-nocturne">
          Your Portable Reputation
        </h1>
        <p className="text-white/50 text-sm mt-2 max-w-xl">
          Your performance record, cryptographically signed by GRID. Agencies and platforms can
          verify your stats without going through us.
        </p>
      </div>

      {/* Metrics grid */}
      {data && (
        <div className="glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />

          <p className="text-white/30 text-xs tracking-widest uppercase font-bold mb-6">
            {data.stage_name}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Trust score */}
            <div className="bg-[#1a1a1d] rounded-xl p-4 border border-white/5 text-center">
              <p className="font-display text-3xl font-extrabold tracking-tighter text-[#c39bff]">
                {data.trust_score}
              </p>
              <p className="text-white/30 text-xs tracking-widest uppercase font-bold mt-1">
                Trust / 100
              </p>
            </div>
            {/* On-time */}
            <div className="bg-[#1a1a1d] rounded-xl p-4 border border-white/5 text-center">
              <p className="font-display text-3xl font-extrabold tracking-tighter text-[#a1faff]">
                {data.on_time_pct}%
              </p>
              <p className="text-white/30 text-xs tracking-widest uppercase font-bold mt-1">
                On Time
              </p>
            </div>
            {/* Bookings */}
            <div className="bg-[#1a1a1d] rounded-xl p-4 border border-white/5 text-center">
              <p className="font-display text-3xl font-extrabold tracking-tighter text-white">
                {data.bookings_completed}
              </p>
              <p className="text-white/30 text-xs tracking-widest uppercase font-bold mt-1">
                Bookings
              </p>
            </div>
            {/* Rating */}
            <div className="bg-[#1a1a1d] rounded-xl p-4 border border-white/5 text-center">
              <p className="font-display text-3xl font-extrabold tracking-tighter text-[#ffbf00]">
                {Number(data.rating_avg).toFixed(1)}
              </p>
              <p className="text-white/30 text-xs tracking-widest uppercase font-bold mt-1">
                Rating ({data.rating_count})
              </p>
            </div>
            {/* Disputes */}
            <div className="bg-[#1a1a1d] rounded-xl p-4 border border-white/5 text-center">
              <p className="font-display text-3xl font-extrabold tracking-tighter text-white">
                {data.disputes_lost}
              </p>
              <p className="text-white/30 text-xs tracking-widest uppercase font-bold mt-1">
                Disputes Lost
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap gap-3">
            <button className="btn-nocturne-primary px-6 py-2.5 rounded-lg text-sm" onClick={downloadJwt}>
              Download signed card (.jwt)
            </button>
            <button className="btn-nocturne-secondary px-6 py-2.5 rounded-lg text-sm" onClick={copyVerifyUrl}>
              {copied ? 'Copied!' : 'Copy public verification URL'}
            </button>
          </div>
        </div>
      )}

      {/* How verification works accordion */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden max-w-xl">
        <button
          className="w-full flex items-center justify-between p-6 text-left"
          onClick={() => setAccordionOpen((o) => !o)}
        >
          <span className="font-display text-sm font-extrabold tracking-tighter text-white">
            How verification works
          </span>
          <span className="text-white/30 text-lg leading-none">{accordionOpen ? '−' : '+'}</span>
        </button>
        {accordionOpen && (
          <div className="px-6 pb-6 space-y-2 text-white/50 text-sm border-t border-white/5 pt-4">
            <p>
              The downloaded <code className="text-[#a1faff] text-xs">.jwt</code> file is an RS256-signed
              JSON Web Token issued by GRID. Any party can independently verify it by fetching our public
              key:
            </p>
            <pre className="bg-[#1a1a1d] rounded-lg p-3 text-xs text-[#a1faff] overflow-x-auto">
              GET {process.env.NEXT_PUBLIC_API_URL}/v1/reputation/export/public-key
            </pre>
            <p>
              Use any JWT library to verify the signature. No API call to GRID is needed — the payload
              is self-contained.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
