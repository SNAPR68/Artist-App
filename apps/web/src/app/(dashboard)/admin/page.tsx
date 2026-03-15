'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api-client';

type Tab = 'users' | 'bookings' | 'payments';

interface BookingRecord {
  id: string;
  status: string;
  event_type: string;
  event_city: string;
  event_date: string;
  final_amount_paise: number;
  artist_stage_name: string;
}

function formatINR(paise: number | null): string {
  if (!paise) return '0.00';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

const STATUS_COLORS: Record<string, string> = {
  inquiry: 'bg-blue-100 text-blue-700',
  quoted: 'bg-indigo-100 text-indigo-700',
  negotiating: 'bg-purple-100 text-purple-700',
  confirmed: 'bg-cyan-100 text-cyan-700',
  pre_event: 'bg-teal-100 text-teal-700',
  event_day: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  settled: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-600',
  disputed: 'bg-orange-100 text-orange-700',
};

export default function AdminDashboardPage() {
  const [tab, setTab] = useState<Tab>('bookings');
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (tab === 'bookings') {
      // Admin would use a dedicated admin endpoint; for MVP, use the existing list
      apiClient<BookingRecord[]>('/v1/bookings')
        .then((res) => {
          if (res.success) setBookings(res.data);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [tab]);

  const filteredBookings = statusFilter === 'all'
    ? bookings
    : bookings.filter((b) => b.status === statusFilter);

  const statuses = ['all', ...new Set(bookings.map((b) => b.status))];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['bookings', 'users', 'payments'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-md capitalize transition-colors ${
              tab === t
                ? 'bg-white text-primary-600 font-medium shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      )}

      {/* Bookings Tab */}
      {!loading && tab === 'bookings' && (
        <div className="space-y-4">
          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  statusFilter === s
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                }`}
              >
                {s === 'all' ? 'All' : s.replace('_', ' ')}
                {s !== 'all' && ` (${bookings.filter((b) => b.status === s).length})`}
              </button>
            ))}
          </div>

          {/* Booking Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Booking ID</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Artist</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Event</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No bookings found
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {b.id.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3 text-gray-900">{b.artist_stage_name ?? '-'}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {b.event_type} &middot; {b.event_city}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {new Date(b.event_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </td>
                        <td className="px-4 py-3 text-gray-900">
                          {b.final_amount_paise ? `₹${formatINR(b.final_amount_paise)}` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {b.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {!loading && tab === 'users' && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          <p className="text-lg font-medium mb-2">User Management</p>
          <p className="text-sm">View and manage platform users. Search by phone or role, suspend accounts.</p>
          <p className="text-xs text-gray-400 mt-4">Admin user endpoints will be available after production deploy.</p>
        </div>
      )}

      {/* Payments Tab */}
      {!loading && tab === 'payments' && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          <p className="text-lg font-medium mb-2">Payment Overview</p>
          <p className="text-sm">Monitor captured, settled, and refunded payments. View platform revenue.</p>
          <p className="text-xs text-gray-400 mt-4">Admin payment endpoints will be available after production deploy.</p>
        </div>
      )}
    </div>
  );
}
