'use client';

import type { VoiceEarningsCard } from '@artist-booking/shared';

export function EarningsSummaryCard({ earnings }: { earnings: VoiceEarningsCard }) {
  const totalRupees = earnings.total_paise / 100;
  const changePct = earnings.change_pct;

  return (
    <div className="rounded-xl border border-white/10 bg-[#1a191b]/80 backdrop-blur-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">{earnings.period}</span>
        {changePct != null && (
          <span className={`text-[11px] font-medium ${changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {changePct >= 0 ? '↑' : '↓'} {Math.abs(changePct).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Total */}
      <div className="mb-2">
        <p className="text-2xl font-bold text-white">₹{totalRupees.toLocaleString('en-IN')}</p>
        <p className="text-[11px] text-white/30 mt-0.5">{earnings.booking_count} booking{earnings.booking_count !== 1 ? 's' : ''}</p>
      </div>

      {/* Top Gigs */}
      {earnings.top_gigs && earnings.top_gigs.length > 0 && (
        <div className="border-t border-white/5 pt-2 mt-2 space-y-1.5">
          <span className="text-[10px] text-white/20 uppercase tracking-widest">Top Gigs</span>
          {earnings.top_gigs.slice(0, 3).map((gig, i) => (
            <div key={i} className="flex items-center justify-between text-[11px]">
              <span className="text-white/50 truncate flex-1">
                {gig.event_type || 'Gig'} · {new Date(gig.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
              <span className="text-white/60 font-medium ml-2">₹{(gig.amount_paise / 100).toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
