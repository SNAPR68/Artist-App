'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '../../../../../lib/api-client';

interface ReputationData {
  overall_rating: number;
  venue_adjusted_rating?: number;
  rebook_rate: number;
  avg_crowd_energy: number;
  trend: 'improving' | 'stable' | 'growing';
  review_count_6m: number;
  avg_rating_6m: number;
}

interface WeightedRating {
  weighted_rating: number;
  venue_adjusted_rating?: number;
}

interface Dispute {
  id: string;
  review_excerpt: string;
  reason: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'UPHELD' | 'OVERTURNED' | 'DISMISSED';
  created_at: string;
  resolution?: string;
}

interface DisputeList {
  disputes: Dispute[];
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    SUBMITTED: 'bg-[#a1faff]/15 text-[#a1faff]',
    UNDER_REVIEW: 'bg-[#ffbf00]/15 text-[#ffbf00]',
    UPHELD: 'bg-green-400/15 text-green-400',
    OVERTURNED: 'bg-[#c39bff]/15 text-[#c39bff]',
    DISMISSED: 'bg-white/10 text-white/60',
  };
  const labels: Record<string, string> = {
    SUBMITTED: 'Submitted',
    UNDER_REVIEW: 'Under Review',
    UPHELD: 'Upheld',
    OVERTURNED: 'Overturned',
    DISMISSED: 'Dismissed',
  };
  return (
    <span className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest ${map[status] ?? 'bg-white/10 text-white/60'}`}>
      {labels[status] ?? status}
    </span>
  );
}

function trendText(trend: string): string {
  if (trend === 'improving') return 'Your ratings are improving — great momentum!';
  if (trend === 'growing') return 'Your reputation is growing steadily.';
  return 'Your ratings are holding steady — consistency is key.';
}

export default function ReputationPage() {
  const [reputation, setReputation] = useState<ReputationData | null>(null);
  const [weighted, setWeighted] = useState<WeightedRating | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      apiClient<ReputationData>('/v1/artists/me/intelligence/reputation'),
      apiClient<WeightedRating>('/v1/reputation/artist/weighted-rating'),
      apiClient<DisputeList>('/v1/reputation/disputes'),
    ])
      .then(([repRes, wtRes, dispRes]) => {
        if (repRes.success) setReputation(repRes.data);
        if (wtRes.success) setWeighted(wtRes.data);
        if (dispRes.success && dispRes.data?.disputes) setDisputes(dispRes.data.disputes);
        if (!repRes.success && !wtRes.success) setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c39bff]" />
      </div>
    );
  }

  if (error || !reputation) {
    return (
      <div className="text-center py-20">
        <p className="text-white/40">Unable to load reputation data. Please try again later.</p>
      </div>
    );
  }

  const overallRating = weighted?.weighted_rating ?? reputation.overall_rating ?? 0;
  const venueAdjusted = weighted?.venue_adjusted_rating ?? reputation.venue_adjusted_rating;
  const showVenueAdjusted = venueAdjusted != null && venueAdjusted !== overallRating;

  return (
    <div className="space-y-6">
      {/* ─── Ambient Glows ─── */}
      <div className="fixed -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed -bottom-40 -left-20 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden animate-fade-in-up relative z-10">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <span className="text-[#a1faff] font-bold text-xs tracking-widest uppercase mb-2 block">Trust & Reliability</span>
          <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tighter text-white">Reputation & Reviews</h1>
          <p className="text-white/40 text-sm mt-1">Your community rating and client feedback</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Overall Rating</p>
          <p className="text-3xl font-black text-white flex items-center gap-1 mt-2">
            <svg className="h-5 w-5 text-[#ffbf00]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {Number(overallRating ?? 0).toFixed(1)}
          </p>
        </div>
        {showVenueAdjusted && (
          <div className="glass-card rounded-xl p-4 border border-white/5">
            <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Venue-Adjusted</p>
            <p className="text-3xl font-black text-[#a1faff] mt-2">{Number(venueAdjusted ?? 0).toFixed(1)}</p>
          </div>
        )}
        {!showVenueAdjusted && (
          <div className="glass-card rounded-xl p-4 border border-white/5">
            <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Venue-Adjusted</p>
            <p className="text-xl font-black text-white/60 mt-2">Same</p>
          </div>
        )}
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Rebook Rate</p>
          <p className="text-3xl font-black text-green-400 mt-2">{reputation.rebook_rate ?? 0}%</p>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Crowd Energy</p>
          <p className="text-3xl font-black text-[#a1faff] mt-2">{reputation.avg_crowd_energy ?? 0}/5</p>
        </div>
      </div>

      {/* Review Trend */}
      <section className="glass-card rounded-xl border border-white/5 p-6 relative z-10">
        <h2 className="text-lg font-bold uppercase tracking-widest text-white mb-2">Review Trend</h2>
        <p className="text-sm text-white/60">{trendText(reputation.trend)}</p>
        <div className="flex items-center gap-4 mt-3 text-sm text-white/50 font-bold">
          <span>{reputation.review_count_6m ?? 0} reviews in the last 6 months</span>
          <span>•</span>
          <span>Avg rating: {Number(reputation.avg_rating_6m ?? 0).toFixed(1)}</span>
        </div>
      </section>

      {/* Review Disputes */}
      <section className="relative z-10">
        <h2 className="text-lg font-bold uppercase tracking-widest text-white mb-3">Review Disputes</h2>
        {disputes.length === 0 ? (
          <div className="glass-card rounded-xl border border-white/5 p-6 text-center">
            <p className="text-white/50">No active review disputes.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {disputes.map((d) => (
              <div key={d.id} className="glass-card rounded-xl border border-white/5 p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm text-white/60 italic line-clamp-2">"{ d.review_excerpt}"</p>
                  {statusBadge(d.status)}
                </div>
                <p className="text-sm text-white/60 mt-1"><span className="font-bold">Reason:</span> {d.reason}</p>
                <p className="text-xs text-white/40 mt-1">
                  Filed {new Date(d.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
                {d.resolution && (
                  <p className="text-sm text-white/60 mt-2 bg-white/5 rounded p-2">
                    <span className="font-bold">Resolution:</span> {d.resolution}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
