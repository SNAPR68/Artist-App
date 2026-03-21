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
        <h1 className="text-2xl font-bold text-gray-900">Commission Dashboard</h1>
        <p className="text-gray-500 mt-1">Track your earnings and commission history</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Earned</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              ₹{(stats.total_commission_earned_paise / 100).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-gray-500 mt-2">All time earnings</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Pending Payment</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">
              ₹{(stats.total_commission_pending_paise / 100).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-gray-500 mt-2">Awaiting settlement</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Already Paid</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              ₹{(stats.total_commission_paid_paise / 100).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-gray-500 mt-2">Successfully settled</p>
          </div>
        </div>
      )}

      {/* Commission History */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Commission History</h2>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                filter === f.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {f.label}
              <span className="text-xs text-gray-400 ml-1">
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
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-500">No commissions in this category.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Artist</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Event Date</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Booking Amount</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Commission</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Rate</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Settled Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 font-medium">{c.artist_stage_name}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {new Date(c.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        ₹{(c.booking_amount_paise / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-green-600">
                        ₹{(c.commission_amount_paise / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700">{c.commission_pct}%</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          c.payment_status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : c.payment_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {c.payment_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
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
