'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Brain, Shield, BarChart3, MapPin, Target, Zap, ArrowRight } from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';

interface IntelligenceSummary {
  trust_score: number;
  trust_score_trend: 'up' | 'down' | 'stable';
  booking_velocity_30d: number;
  booking_velocity_90d: number;
  rebook_rate: number;
  demand_alignment: number;
  total_bookings_this_year: number;
  avg_crowd_energy: number;
  top_cities: { city: string; count: number }[];
  top_event_types: { event_type: string; count: number }[];
}

interface CareerData {
  trust_score: number;
  trust_score_trend: 'up' | 'down' | 'stable';
  booking_velocity_30d: number;
  booking_velocity_90d: number;
  rebook_rate: number;
  demand_alignment: number;
  total_bookings_this_year: number;
  avg_crowd_energy: number;
  top_cities: { city: string; count: number }[];
  top_event_types: { event_type: string; count: number }[];
}

function trendArrow(trend: 'up' | 'down' | 'stable') {
  if (trend === 'up') return <span className="text-green-400 ml-1">↑</span>;
  if (trend === 'stable') return <span className="text-white/40 ml-1">—</span>;
  return <span className="text-[#ffbf00] ml-1">↗</span>;
}

export default function IntelligenceHubPage() {
  const [data, setData] = useState<IntelligenceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      apiClient<IntelligenceSummary>('/v1/artists/me/intelligence/summary'),
      apiClient<CareerData>('/v1/artists/me/intelligence/career'),
    ])
      .then(([summaryRes, careerRes]) => {
        if (summaryRes.success) {
          setData(summaryRes.data);
        } else if (careerRes.success) {
          setData(careerRes.data as IntelligenceSummary);
        } else {
          setError(true);
        }
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

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <p className="text-white/40">Unable to load intelligence data right now. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Ambient Glows ─── */}
      <div className="fixed -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed -bottom-40 -left-20 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full pointer-events-none" />

      {/* ─── Bento Hero ─── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
        <div className="md:col-span-8 glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <span className="text-[#a1faff] font-bold text-xs tracking-widest uppercase mb-2 block">AI Insights</span>
            <h1 className="text-3xl font-display font-extrabold tracking-tighter text-white mb-1">Career Intelligence</h1>
            <p className="text-white/40 text-sm">Data-driven insights about your performance and growth</p>
          </div>
        </div>
        <div className="md:col-span-4 glass-card rounded-xl p-6 border border-white/5 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-[#a1faff] animate-pulse shadow-[0_0_12px_rgba(161,250,255,0.5)]" />
            <h3 className="text-xs font-black uppercase tracking-widest text-[#a1faff]">Backstage AI</h3>
          </div>
          <p className="text-sm text-white/40 italic">&quot;Your booking velocity is trending up. Keep accepting gigs in your top cities to maintain momentum.&quot;</p>
          <Brain className="w-5 h-5 text-[#c39bff] mt-4 opacity-50" />
        </div>
      </div>

      {/* Core Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 relative z-10">
        {/* Trust Score */}
        <div className="glass-card bg-gradient-to-br from-[#c39bff]/10 to-transparent p-5 border border-[#c39bff]/20 rounded-xl">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-black uppercase tracking-widest text-white/60">Trust Score</p>
            <Shield size={16} className="text-[#c39bff]" />
          </div>
          <p className="text-2xl font-black text-white">
            {data.trust_score ?? 0}
            {trendArrow(data.trust_score_trend ?? 'stable')}
          </p>
          <p className="text-xs text-white/50 mt-2">Community rating</p>
        </div>

        {/* Booking Velocity */}
        <div className="glass-card bg-gradient-to-br from-[#a1faff]/10 to-transparent p-5 border border-[#a1faff]/20 rounded-xl">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-black uppercase tracking-widest text-white/60">Booking Velocity</p>
            <Zap size={16} className="text-[#a1faff]" />
          </div>
          <p className="text-2xl font-black text-[#a1faff]">{data.booking_velocity_30d ?? 0}</p>
          <p className="text-xs text-white/50 mt-2">30 days / {data.booking_velocity_90d ?? 0} over 90d</p>
        </div>

        {/* Rebook Rate */}
        <div className="glass-card bg-gradient-to-br from-green-500/10 to-transparent p-5 border border-green-400/20 rounded-xl">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-black uppercase tracking-widest text-white/60">Rebook Rate</p>
            <BarChart3 size={16} className="text-green-400" />
          </div>
          <p className="text-2xl font-black text-green-300">{data.rebook_rate ?? 0}%</p>
          <p className="text-xs text-white/50 mt-2">Client loyalty</p>
        </div>

        {/* Demand Alignment */}
        <div className="glass-card bg-gradient-to-br from-[#ffbf00]/10 to-transparent p-5 border border-[#ffbf00]/20 rounded-xl">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-black uppercase tracking-widest text-white/60">Demand Alignment</p>
            <Target size={16} className="text-[#ffbf00]" />
          </div>
          <p className="text-2xl font-black text-[#ffbf00]">{data.demand_alignment ?? 0}%</p>
          <p className="text-xs text-white/50 mt-2">Market fit</p>
        </div>

        {/* Total Bookings */}
        <div className="glass-card bg-gradient-to-br from-[#ff8b9a]/10 to-transparent p-5 border border-[#ff8b9a]/20 rounded-xl">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-black uppercase tracking-widest text-white/60">Total Bookings</p>
            <BarChart3 size={16} className="text-[#ff8b9a]" />
          </div>
          <p className="text-2xl font-black text-[#ff8b9a]">{data.total_bookings_this_year ?? 0}</p>
          <p className="text-xs text-white/50 mt-2">This year</p>
        </div>

        {/* Crowd Energy */}
        <div className="glass-card bg-gradient-to-br from-[#a1faff]/10 to-transparent p-5 border border-[#a1faff]/20 rounded-xl">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-black uppercase tracking-widest text-white/60">Crowd Energy</p>
            <Zap size={16} className="text-[#a1faff]" />
          </div>
          <p className="text-2xl font-black text-[#a1faff]">{data.avg_crowd_energy ?? 0}/5</p>
          <p className="text-xs text-white/50 mt-2">Audience feedback</p>
        </div>
      </div>

      {/* Top Cities */}
      <section className="space-y-4 relative z-10">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold uppercase tracking-widest text-white">Top Cities</h2>
          <MapPin size={20} className="text-[#c39bff] opacity-60" />
        </div>
        <div className="flex flex-wrap gap-2">
          {(data.top_cities ?? []).length === 0 ? (
            <div className="glass-card w-full p-6 text-center rounded-xl border border-white/5">
              <p className="text-white/50 text-sm">No city data yet. Keep performing to build your city presence!</p>
            </div>
          ) : (
            data.top_cities.map((c) => (
              <span
                key={c.city}
                className="inline-flex items-center gap-2 glass-card border border-white/10 px-4 py-2 rounded-full text-white/70 text-sm font-bold hover:border-white/20 transition-colors duration-300"
              >
                <MapPin size={14} className="text-[#a1faff]" />
                {c.city}
                <span className="bg-[#c39bff]/20 border border-[#c39bff]/30 text-[#c39bff] text-xs px-2 py-0.5 rounded-full font-black">
                  {c.count}
                </span>
              </span>
            ))
          )}
        </div>
      </section>

      {/* Top Event Types */}
      <section className="space-y-4 relative z-10">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold uppercase tracking-widest text-white">Top Event Types</h2>
          <Target size={20} className="text-[#c39bff] opacity-60" />
        </div>
        <div className="flex flex-wrap gap-2">
          {(data.top_event_types ?? []).length === 0 ? (
            <div className="glass-card w-full p-6 text-center rounded-xl border border-white/5">
              <p className="text-white/50 text-sm">No event data yet. More performances = better insights!</p>
            </div>
          ) : (
            data.top_event_types.map((e) => (
              <span
                key={e.event_type}
                className="inline-flex items-center gap-2 glass-card border border-white/10 px-4 py-2 rounded-full text-white/70 text-sm font-bold hover:border-white/20 transition-colors duration-300"
              >
                <Target size={14} className="text-[#a1faff]" />
                {e.event_type}
                <span className="bg-[#a1faff]/20 border border-[#a1faff]/30 text-[#a1faff] text-xs px-2 py-0.5 rounded-full font-black">
                  {e.count}
                </span>
              </span>
            ))
          )}
        </div>
      </section>

      {/* Links to sub-pages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
        <Link href="/artist/intelligence/gig-advisor" className="glass-card rounded-xl p-6 border border-white/5 hover:border-white/15 group cursor-pointer transition-all">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white mb-1">Gig Advisor</h3>
              <p className="text-xs text-white/50">AI-powered matching & recommendations</p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#c39bff] group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
        <Link href="/artist/intelligence/reputation" className="glass-card rounded-xl p-6 border border-white/5 hover:border-white/15 group cursor-pointer transition-all">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white mb-1">Reputation Score</h3>
              <p className="text-xs text-white/50">Your trust & reliability rating</p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#c39bff] group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  );
}
