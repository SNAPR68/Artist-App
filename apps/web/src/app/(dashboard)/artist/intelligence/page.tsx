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
  if (trend === 'stable') return <span className="text-text-muted ml-1">—</span>;
  return <span className="text-yellow-400 ml-1">↗</span>;
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Unable to load intelligence data right now. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-text-primary">Career Intelligence</h1>
          <p className="text-text-muted text-sm mt-1">Data-driven insights about your performance</p>
        </div>
        <Brain className="text-primary-400 opacity-50" size={32} />
      </div>

      {/* Core Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {/* Trust Score */}
        <div className="glass-card bg-gradient-to-br from-purple-500/10 to-transparent p-5 border-purple-400/30 hover-glow">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-heading font-semibold text-text-muted uppercase tracking-wider">Trust Score</p>
            <Shield size={16} className="text-purple-400 opacity-60" />
          </div>
          <p className="text-2xl font-heading font-bold text-purple-300">
            {data.trust_score ?? 0}
            {trendArrow(data.trust_score_trend ?? 'stable')}
          </p>
          <p className="text-xs text-text-secondary mt-2">Community rating</p>
        </div>

        {/* Booking Velocity */}
        <div className="glass-card bg-gradient-to-br from-primary-500/10 to-transparent p-5 border-primary-400/30 hover-glow">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-heading font-semibold text-text-muted uppercase tracking-wider">Booking Velocity</p>
            <Zap size={16} className="text-primary-400 opacity-60" />
          </div>
          <p className="text-2xl font-heading font-bold text-primary-300">{data.booking_velocity_30d ?? 0}</p>
          <p className="text-xs text-text-secondary mt-2">30 days / {data.booking_velocity_90d ?? 0} over 90d</p>
        </div>

        {/* Rebook Rate */}
        <div className="glass-card bg-gradient-to-br from-green-500/10 to-transparent p-5 border-green-400/30 hover-glow">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-heading font-semibold text-text-muted uppercase tracking-wider">Rebook Rate</p>
            <BarChart3 size={16} className="text-green-400 opacity-60" />
          </div>
          <p className="text-2xl font-heading font-bold text-green-300">{data.rebook_rate ?? 0}%</p>
          <p className="text-xs text-text-secondary mt-2">Client loyalty</p>
        </div>

        {/* Demand Alignment */}
        <div className="glass-card bg-gradient-to-br from-blue-500/10 to-transparent p-5 border-blue-400/30 hover-glow">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-heading font-semibold text-text-muted uppercase tracking-wider">Demand Alignment</p>
            <Target size={16} className="text-blue-400 opacity-60" />
          </div>
          <p className="text-2xl font-heading font-bold text-blue-300">{data.demand_alignment ?? 0}%</p>
          <p className="text-xs text-text-secondary mt-2">Market fit</p>
        </div>

        {/* Total Bookings */}
        <div className="glass-card bg-gradient-to-br from-pink-500/10 to-transparent p-5 border-pink-400/30 hover-glow">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-heading font-semibold text-text-muted uppercase tracking-wider">Total Bookings</p>
            <BarChart3 size={16} className="text-pink-400 opacity-60" />
          </div>
          <p className="text-2xl font-heading font-bold text-pink-300">{data.total_bookings_this_year ?? 0}</p>
          <p className="text-xs text-text-secondary mt-2">This year</p>
        </div>

        {/* Crowd Energy */}
        <div className="glass-card bg-gradient-to-br from-orange-500/10 to-transparent p-5 border-orange-400/30 hover-glow">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-heading font-semibold text-text-muted uppercase tracking-wider">Crowd Energy</p>
            <Zap size={16} className="text-orange-400 opacity-60" />
          </div>
          <p className="text-2xl font-heading font-bold text-orange-300">{data.avg_crowd_energy ?? 0}/5</p>
          <p className="text-xs text-text-secondary mt-2">Audience feedback</p>
        </div>
      </div>

      {/* Top Cities */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-heading font-semibold text-text-primary">Top Cities</h2>
          <MapPin size={20} className="text-primary-400 opacity-60" />
        </div>
        <div className="flex flex-wrap gap-2">
          {(data.top_cities ?? []).length === 0 ? (
            <div className="glass-card w-full p-6 text-center">
              <p className="text-text-muted text-sm">No city data yet. Keep performing to build your city presence!</p>
            </div>
          ) : (
            data.top_cities.map((c) => (
              <span
                key={c.city}
                className="inline-flex items-center gap-2 glass-medium border border-glass-border px-4 py-2 rounded-pill text-text-secondary text-sm font-heading font-semibold hover:bg-glass-heavy transition-colors duration-300"
              >
                <MapPin size={14} className="text-primary-400" />
                {c.city}
                <span className="bg-gradient-accent/20 border border-primary-400/30 text-primary-300 text-xs px-2 py-0.5 rounded-pill font-bold">
                  {c.count}
                </span>
              </span>
            ))
          )}
        </div>
      </section>

      {/* Top Event Types */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-heading font-semibold text-text-primary">Top Event Types</h2>
          <Target size={20} className="text-primary-400 opacity-60" />
        </div>
        <div className="flex flex-wrap gap-2">
          {(data.top_event_types ?? []).length === 0 ? (
            <div className="glass-card w-full p-6 text-center">
              <p className="text-text-muted text-sm">No event type data yet. Your specialties will appear here.</p>
            </div>
          ) : (
            data.top_event_types.map((e) => (
              <span
                key={e.event_type}
                className="inline-flex items-center gap-2 glass-medium border border-glass-border px-4 py-2 rounded-pill text-text-secondary text-sm font-heading font-semibold hover:bg-glass-heavy transition-colors duration-300"
              >
                <Target size={14} className="text-secondary-400" />
                {e.event_type}
                <span className="bg-gradient-accent/20 border border-secondary-400/30 text-secondary-300 text-xs px-2 py-0.5 rounded-pill font-bold">
                  {e.count}
                </span>
              </span>
            ))
          )}
        </div>
      </section>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/artist/intelligence/gig-advisor"
          className="glass-card p-5 hover-glow group transition-all duration-300 flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-primary-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              <h3 className="font-heading font-semibold text-text-primary">Gig Advisor</h3>
            </div>
            <p className="text-xs text-text-secondary">Smart recommendations</p>
          </div>
          <ArrowRight size={14} className="text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity mt-3" />
        </Link>

        <Link
          href="/artist/intelligence/reputation"
          className="glass-card p-5 hover-glow group transition-all duration-300 flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-secondary-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              <h3 className="font-heading font-semibold text-text-primary">Reputation</h3>
            </div>
            <p className="text-xs text-text-secondary">Reviews & insights</p>
          </div>
          <ArrowRight size={14} className="text-secondary-400 opacity-0 group-hover:opacity-100 transition-opacity mt-3" />
        </Link>

        <Link
          href="/artist/seasonal"
          className="glass-card p-5 hover-glow group transition-all duration-300 flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              <h3 className="font-heading font-semibold text-text-primary">Seasonal</h3>
            </div>
            <p className="text-xs text-text-secondary">Trends & timing</p>
          </div>
          <ArrowRight size={14} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity mt-3" />
        </Link>

        <Link
          href="/artist/financial"
          className="glass-card p-5 hover-glow group transition-all duration-300 flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-green-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              <h3 className="font-heading font-semibold text-text-primary">Financial</h3>
            </div>
            <p className="text-xs text-text-secondary">Cash flow & taxes</p>
          </div>
          <ArrowRight size={14} className="text-green-400 opacity-0 group-hover:opacity-100 transition-opacity mt-3" />
        </Link>
      </div>
    </div>
  );
}
