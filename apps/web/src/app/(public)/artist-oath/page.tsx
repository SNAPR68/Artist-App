'use client';

import { useEffect, useState } from 'react';
import { Shield, Check, Heart } from 'lucide-react';
import { apiClient } from '../../../lib/api-client';

interface OathSigner {
  id: string;
  stage_name: string;
  signed_at: string;
}

export default function ArtistOathPage() {
  const [signers, setSigners] = useState<OathSigner[]>([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    apiClient<OathSigner[]>('/v1/artists/oath/signers').then((res) => {
      if (res.success && Array.isArray(res.data)) setSigners(res.data);
      setLoading(false);
    });
  }, []);

  const sign = async () => {
    setSigning(true);
    const res = await apiClient('/v1/artists/oath/sign', { method: 'POST' });
    if (res.success) {
      setSigned(true);
      const list = await apiClient<OathSigner[]>('/v1/artists/oath/signers');
      if (list.success && Array.isArray(list.data)) setSigners(list.data);
    }
    setSigning(false);
  };

  return (
    <div className="min-h-screen bg-[#0e0e0f] text-white">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#c39bff]/10 border border-[#c39bff]/20 mb-6">
            <Shield size={14} className="text-[#c39bff]" />
            <span className="text-xs uppercase tracking-widest font-bold text-[#c39bff]">GRID Artist Oath</span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold tracking-tighter mb-4">
            We don&apos;t take a cut of what you earn.
          </h1>
          <p className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Every other platform charges artists 10–25% commission per booking. GRID charges zero.
            Agencies pay a monthly subscription. Artists keep 100%.
          </p>
        </div>

        {/* The pledge */}
        <div className="glass-card rounded-2xl p-8 md:p-10 border border-white/10 space-y-6 mb-10">
          <h2 className="text-2xl font-display font-extrabold text-[#c39bff]">The Pledge</h2>
          <ul className="space-y-4">
            {[
              'GRID will never charge artists a commission, booking fee, or take-rate on performance fees — ever.',
              'Artists are not locked in. You can export your full calendar, client list, and earnings history at any time.',
              'Agencies that route work through GRID pay a fixed monthly subscription. The artist&apos;s fee flows through without deduction.',
              'If GRID ever introduces a per-booking charge on artists, this pledge gives every signed artist a permanent grandfather-free account.',
              'Payment terms: 70% escrow-released on event-day arrival, 30% on completion. No delayed settlements.',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#c39bff]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Check size={13} className="text-[#c39bff]" />
                </div>
                <span className="text-white/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: item }} />
              </li>
            ))}
          </ul>
        </div>

        {/* Sign CTA */}
        <div className="glass-card rounded-2xl p-8 border border-[#c39bff]/20 text-center mb-10">
          {signed ? (
            <div className="space-y-2">
              <Heart size={24} className="text-[#c39bff] mx-auto" />
              <p className="text-lg font-bold">Thank you — your name is on the pledge.</p>
              <p className="text-sm text-white/60">This commitment is public and permanent.</p>
            </div>
          ) : (
            <>
              <p className="text-white/70 mb-4">Are you a GRID artist? Add your name to the public pledge.</p>
              <button
                onClick={sign}
                disabled={signing}
                className="bg-[#c39bff] text-black font-bold px-8 py-3 rounded-xl hover:bg-[#b48af0] disabled:opacity-40 transition-all"
              >
                {signing ? 'Signing…' : 'Sign the Oath'}
              </button>
            </>
          )}
        </div>

        {/* Signers */}
        <div>
          <h3 className="text-sm uppercase tracking-widest font-bold text-white/50 mb-4">
            {loading ? 'Loading signers…' : `${signers.length} artists have signed`}
          </h3>
          {signers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {signers.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-sm"
                >
                  <Check size={11} className="text-[#c39bff]" />
                  {s.stage_name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
