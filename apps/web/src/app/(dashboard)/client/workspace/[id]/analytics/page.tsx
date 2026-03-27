'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '../../../../../../lib/api-client';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// ─── Types ────────────────────────────────────────────────────

interface TopArtist {
  artist_id: string;
  stage_name: string;
  booking_count: number;
  total_revenue_paise: number;
}

interface MonthlyRevenue {
  month: string;
  revenue_paise: number;
  booking_count: number;
}

interface AnalyticsData {
  total_spend_paise: number;
  booking_count: number;
  completion_rate: number;
  top_artists: TopArtist[];
  monthly_revenue: MonthlyRevenue[];
}

interface WorkspaceEvents {
  events: { id: string; status: string; event_type: string }[];
  pagination: { total: number };
}

// ─── Helpers ──────────────────────────────────────────────────

type DateRangeKey = '3m' | '6m' | '12m' | 'all';

const DATE_RANGE_LABELS: Record<DateRangeKey, string> = {
  '3m': 'Last 3 months',
  '6m': 'Last 6 months',
  '12m': 'Last 12 months',
  all: 'All time',
};

function formatINR(paise: number): string {
  if (!paise) return '0.00';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

function getDateRange(key: DateRangeKey): { start_date?: string; end_date?: string } {
  if (key === 'all') return {};
  const months = key === '3m' ? 3 : key === '6m' ? 6 : 12;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months, 1);
  return {
    start_date: start.toISOString().split('T')[0],
    end_date: now.toISOString().split('T')[0],
  };
}

function formatMonth(yyyyMM: string): string {
  const [year, month] = yyyyMM.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

// ─── Page ─────────────────────────────────────────────────────

export default function WorkspaceAnalyticsPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [activeEvents, setActiveEvents] = useState(0);
  const [eventTypeBreakdown, setEventTypeBreakdown] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRangeKey>('12m');

  useEffect(() => {
    setLoading(true);
    const dateRange = getDateRange(range);
    const qs = dateRange.start_date
      ? `?start_date=${dateRange.start_date}&end_date=${dateRange.end_date}`
      : '';

    Promise.all([
      apiClient<AnalyticsData>(`/v1/workspaces/${workspaceId}/analytics${qs}`),
      apiClient<WorkspaceEvents>(`/v1/workspaces/${workspaceId}/events?per_page=200`),
    ])
      .then(([analyticsRes, eventsRes]) => {
        if (analyticsRes.success) setAnalytics(analyticsRes.data);
        if (eventsRes.success) {
          const evts = eventsRes.data.events ?? [];
          const active = evts.filter(
            (e) => e.status !== 'cancelled' && e.status !== 'completed',
          ).length;
          setActiveEvents(active);

          // Build event_type breakdown
          const breakdown: Record<string, number> = {};
          for (const e of evts) {
            breakdown[e.event_type] = (breakdown[e.event_type] ?? 0) + 1;
          }
          setEventTypeBreakdown(breakdown);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [workspaceId, range]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!analytics) {
    return <p className="text-center py-10 text-nocturne-text-tertiary">Failed to load analytics.</p>;
  }

  const avgBookingValue =
    analytics.booking_count > 0
      ? Math.round(analytics.total_spend_paise / analytics.booking_count)
      : 0;

  return (
    <ErrorBoundary>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/client/workspace/${workspaceId}`}
            className="text-sm text-primary-500 hover:underline"
          >
            &larr; Back to Workspace
          </Link>
          <h1 className="text-2xl font-display font-extrabold tracking-tighter text-white mt-1">Analytics</h1>
        </div>

        {/* Date Range Filter */}
        <div className="flex gap-1 glass-card rounded-xl p-1">
          {(Object.keys(DATE_RANGE_LABELS) as DateRangeKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                range === key
                  ? 'bg-nocturne-surface text-nocturne-accent font-medium shadow-sm'
                  : 'text-nocturne-text-secondary hover:text-nocturne-text-primary'
              }`}
            >
              {DATE_RANGE_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <p className="text-sm text-nocturne-text-tertiary">Total Spend</p>
          <p className="text-xl font-bold text-nocturne-text-primary">
            ₹{formatINR(analytics.total_spend_paise)}
          </p>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <p className="text-sm text-nocturne-text-tertiary">Total Bookings</p>
          <p className="text-xl font-bold text-nocturne-text-primary">{analytics.booking_count}</p>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/5">
          <p className="text-sm text-nocturne-text-tertiary">Avg Booking Value</p>
          <p className="text-xl font-bold text-nocturne-text-primary">₹{formatINR(avgBookingValue)}</p>
        </div>
        <div className="bg-nocturne-info/15 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-nocturne-info">Active Events</p>
          <p className="text-xl font-bold text-nocturne-info">{activeEvents}</p>
        </div>
      </div>

      {/* Spend by Month */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5">
          <h2 className="text-lg font-semibold text-nocturne-text-primary">Spend by Month</h2>
        </div>
        {analytics.monthly_revenue.length === 0 ? (
          <div className="p-8 text-center text-nocturne-text-tertiary">No monthly data available</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  <th className="px-4 py-2 font-medium text-nocturne-text-tertiary">Month</th>
                  <th className="px-4 py-2 font-medium text-nocturne-text-tertiary text-right">Bookings</th>
                  <th className="px-4 py-2 font-medium text-nocturne-text-tertiary text-right">Total Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {analytics.monthly_revenue.map((m) => (
                  <tr key={m.month} className="hover:bg-nocturne-base">
                    <td className="px-4 py-2 text-nocturne-text-primary">{formatMonth(m.month)}</td>
                    <td className="px-4 py-2 text-nocturne-text-primary text-right">{m.booking_count}</td>
                    <td className="px-4 py-2 text-nocturne-text-primary text-right font-medium">
                      ₹{formatINR(m.revenue_paise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Artists */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5">
          <h2 className="text-lg font-semibold text-nocturne-text-primary">Top Artists</h2>
        </div>
        {analytics.top_artists.length === 0 ? (
          <div className="p-8 text-center text-nocturne-text-tertiary">No artist data yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  <th className="px-4 py-2 font-medium text-nocturne-text-tertiary">#</th>
                  <th className="px-4 py-2 font-medium text-nocturne-text-tertiary">Artist</th>
                  <th className="px-4 py-2 font-medium text-nocturne-text-tertiary text-right">Bookings</th>
                  <th className="px-4 py-2 font-medium text-nocturne-text-tertiary text-right">Total Spend</th>
                  <th className="px-4 py-2 font-medium text-nocturne-text-tertiary text-right">Avg per Booking</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {analytics.top_artists.map((a, idx) => (
                  <tr key={a.artist_id} className="hover:bg-nocturne-base">
                    <td className="px-4 py-2 text-nocturne-text-tertiary">{idx + 1}</td>
                    <td className="px-4 py-2 text-nocturne-text-primary font-medium">{a.stage_name}</td>
                    <td className="px-4 py-2 text-nocturne-text-primary text-right">{a.booking_count}</td>
                    <td className="px-4 py-2 text-nocturne-text-primary text-right">
                      ₹{formatINR(a.total_revenue_paise)}
                    </td>
                    <td className="px-4 py-2 text-nocturne-text-primary text-right">
                      ₹{formatINR(a.booking_count > 0 ? Math.round(a.total_revenue_paise / a.booking_count) : 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Event Type Breakdown */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5">
          <h2 className="text-lg font-semibold text-nocturne-text-primary">Event Type Breakdown</h2>
        </div>
        {Object.keys(eventTypeBreakdown).length === 0 ? (
          <div className="p-8 text-center text-nocturne-text-tertiary">No event data yet</div>
        ) : (
          <div className="p-4 space-y-3">
            {Object.entries(eventTypeBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => {
                const total = Object.values(eventTypeBreakdown).reduce((s, v) => s + v, 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-nocturne-text-primary capitalize">
                        {type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm text-nocturne-text-tertiary">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-nocturne-surface rounded-full h-2">
                      <div
                        className="bg-nocturne-primary h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
}
