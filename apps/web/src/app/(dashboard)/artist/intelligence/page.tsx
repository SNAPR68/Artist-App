'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
  if (trend === 'up') return <span className="text-green-500 ml-1">&#9650;</span>;
  if (trend === 'stable') return <span className="text-gray-400 ml-1">&#9644;</span>;
  // Never show decline — frame as opportunity
  return <span className="text-yellow-500 ml-1">&#9654;</span>;
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
      <h1 className="text-2xl font-bold text-gray-900">Career Intelligence</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Trust Score</p>
          <p className="text-xl font-bold text-gray-900">
            {data.trust_score ?? 0}
            {trendArrow(data.trust_score_trend ?? 'stable')}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Booking Velocity</p>
          <p className="text-xl font-bold text-gray-900">{data.booking_velocity_30d ?? 0}</p>
          <p className="text-xs text-gray-400">30d / {data.booking_velocity_90d ?? 0} over 90d</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Rebook Rate</p>
          <p className="text-xl font-bold text-gray-900">{data.rebook_rate ?? 0}%</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Demand Alignment</p>
          <p className="text-xl font-bold text-gray-900">{data.demand_alignment ?? 0}%</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Total Bookings (This Year)</p>
          <p className="text-xl font-bold text-gray-900">{data.total_bookings_this_year ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Avg Crowd Energy</p>
          <p className="text-xl font-bold text-gray-900">{data.avg_crowd_energy ?? 0}</p>
        </div>
      </div>

      {/* Top Cities */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Top Cities</h2>
        <div className="flex flex-wrap gap-2">
          {(data.top_cities ?? []).length === 0 ? (
            <p className="text-sm text-gray-500">No city data yet. Keep performing to build your city presence!</p>
          ) : (
            data.top_cities.map((c) => (
              <span
                key={c.city}
                className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1.5 rounded-full"
              >
                {c.city}
                <span className="bg-blue-200 text-blue-800 text-xs px-1.5 py-0.5 rounded-full">{c.count}</span>
              </span>
            ))
          )}
        </div>
      </section>

      {/* Top Event Types */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Top Event Types</h2>
        <div className="flex flex-wrap gap-2">
          {(data.top_event_types ?? []).length === 0 ? (
            <p className="text-sm text-gray-500">No event type data yet. Your specialties will appear here.</p>
          ) : (
            data.top_event_types.map((e) => (
              <span
                key={e.event_type}
                className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-sm font-medium px-3 py-1.5 rounded-full"
              >
                {e.event_type}
                <span className="bg-purple-200 text-purple-800 text-xs px-1.5 py-0.5 rounded-full">{e.count}</span>
              </span>
            ))
          )}
        </div>
      </section>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/artist/intelligence/gig-advisor"
          className="bg-white rounded-lg p-4 border border-gray-200 hover:border-primary-300 transition-colors text-center"
        >
          <span className="block text-sm font-medium text-gray-700">Gig Advisor</span>
          <span className="text-xs text-gray-400">Smart gig recommendations</span>
        </Link>
        <Link
          href="/artist/intelligence/reputation"
          className="bg-white rounded-lg p-4 border border-gray-200 hover:border-primary-300 transition-colors text-center"
        >
          <span className="block text-sm font-medium text-gray-700">Reputation Insights</span>
          <span className="text-xs text-gray-400">Reviews & ratings</span>
        </Link>
        <Link
          href="/artist/seasonal"
          className="bg-white rounded-lg p-4 border border-gray-200 hover:border-primary-300 transition-colors text-center"
        >
          <span className="block text-sm font-medium text-gray-700">Seasonal Trends</span>
          <span className="text-xs text-gray-400">Demand & timing</span>
        </Link>
        <Link
          href="/artist/financial"
          className="bg-white rounded-lg p-4 border border-gray-200 hover:border-primary-300 transition-colors text-center"
        >
          <span className="block text-sm font-medium text-gray-700">Financial Center</span>
          <span className="text-xs text-gray-400">Cash flow & taxes</span>
        </Link>
      </div>
    </div>
  );
}
