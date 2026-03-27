'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '../../../../lib/api-client';

interface CommissionStats {
  total_commission_earned_paise: number;
  total_commission_pending_paise: number;
  total_commission_paid_paise: number;
}

interface CommissionHistory {
  id: string;
  booking_id: string;
  artist_stage_name: string;
  booking_amount_paise: number;
  commission_amount_paise: number;
  commission_pct: number;
  payment_status: string;
  event_date: string;
  settled_at: string | null;
}

type FilterKey = 'all' | 'pending' | 'paid';

export default function AgentCommissionDashboard() {
  const [stats, setStats] = useState<CommissionStats | null>(null);
  const [history, setHistory] = useState<CommissionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');

  useEffect(() => {
    Promise.all([
      apiClient<CommissionStats>('/v1/agents/commissions'),
      apiClient<CommissionHistory[]>('/v1/agents/commissions/history'),
    ]).then(([statsRes, historyRes]) => {
      if (statsRes.success) setStats(statsRes.data);
      if (historyRes.success) setHistory(historyRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = history.filter((h) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return h.payment_status === 'pending' || h.payment_status === 'processing';
    if (filter === 'paid') return h.payment_status === 'paid';
    return true;
  });

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'paid', label: 'Paid' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden animate-fade-in-up"><div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" /><div className="relative z-10"><h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tighter text-white">Commission Dashboard</h1></div></div>
        <p className="text-nocturne-text-tertiary mt-1">Track your earnings and commission history</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-nocturne-surface border border-white/5 rounded-lg p-6">
            <p className="text-sm font-medium text-nocturne-text-secondary uppercase tracking-wide">Total Earned</p>
            <p className="text-3xl font-bold text-nocturne-success mt-2">
              ₹{(stats.total_commission_earned_paise / 100).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-nocturne-text-tertiary mt-2">All time earnings</p>
          </div>

          <div className="bg-nocturne-surface border border-white/5 rounded-lg p-6">
            <p className="text-sm font-medium text-nocturne-text-secondary uppercase tracking-wide">Pending Payment</p>
            <p className="text-3xl font-bold text-nocturne-warning mt-2">
              ₹{(stats.total_commission_pending_paise / 100).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-nocturne-text-tertiary mt-2">Awaiting settlement</p>
          </div>

          <div className="bg-nocturne-surface border border-white/5 rounded-lg p-6">
            <p className="text-sm font-medium text-nocturne-text-secondary uppercase tracking-wide">Already Paid</p>
            <p className="text-3xl font-bold text-nocturne-info mt-2">
              ₹{(stats.total_commission_paid_paise / 100).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-nocturne-text-tertiary mt-2">Successfully settled</p>
          </div>
        </div>
      )}

      {/* Commission History */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-nocturne-text-primary">Commission History</h2>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b border-white/5">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                filter === f.key
                  ? 'border-nocturne-accent text-nocturne-accent'
                  : 'border-transparent text-nocturne-text-tertiary hover:text-nocturne-text-secondary'
              }`}
            >
              {f.label}
              <span className="text-xs text-nocturne-text-tertiary ml-1">
                ({history.filter((h) => {
                  if (f.key === 'all') return true;
                  if (f.key === 'pending') return h.payment_status === 'pending' || h.payment_status === 'processing';
                  if (f.key === 'paid') return h.payment_status === 'paid';
                  return false;
                }).length})
              </span>
            </button>
          ))}
        </div>

        {/* Commission Table */}
        {filtered.length === 0 ? (
          <div className="bg-nocturne-surface-2 border border-white/5 rounded-lg p-8 text-center">
            <p className="text-nocturne-text-tertiary">No commissions in this category.</p>
          </div>
        ) : (
          <div className="bg-nocturne-surface border border-white/5 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-nocturne-surface-2 border-b border-white/5">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-nocturne-text-secondary">Artist</th>
                    <th className="text-left px-4 py-3 font-medium text-nocturne-text-secondary">Event Date</th>
                    <th className="text-right px-4 py-3 font-medium text-nocturne-text-secondary">Booking Amount</th>
                    <th className="text-right px-4 py-3 font-medium text-nocturne-text-secondary">Commission</th>
                    <th className="text-center px-4 py-3 font-medium text-nocturne-text-secondary">Rate</th>
                    <th className="text-left px-4 py-3 font-medium text-nocturne-text-secondary">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-nocturne-text-secondary">Settled Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nocturne-border-subtle">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-nocturne-glass-panel">
                      <td className="px-4 py-3 text-nocturne-text-primary font-medium">{c.artist_stage_name}</td>
                      <td className="px-4 py-3 text-nocturne-text-secondary">
                        {new Date(c.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-right text-nocturne-text-primary">
                        ₹{(c.booking_amount_paise / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-nocturne-success">
                        ₹{(c.commission_amount_paise / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-center text-nocturne-text-secondary">{c.commission_pct}%</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          c.payment_status === 'paid'
                            ? 'bg-nocturne-success/15 text-nocturne-success'
                            : c.payment_status === 'pending'
                            ? 'bg-nocturne-warning/15 text-nocturne-warning'
                            : 'bg-nocturne-info/15 text-nocturne-info'
                        }`}>
                          {c.payment_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-nocturne-text-secondary">
                        {c.settled_at
                          ? new Date(c.settled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
