'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiClient } from '../../../../lib/api-client';

interface AgentBooking {
  id: string;
  artist_name: string;
  client_name: string;
  event_type: string;
  event_city: string;
  event_date: string;
  status: string;
  final_amount_paise?: number;
  quoted_amount_paise?: number;
}

const STATUS_COLORS: Record<string, string> = {
  inquiry: 'bg-blue-100 text-blue-700',
  quoted: 'bg-yellow-100 text-yellow-700',
  negotiating: 'bg-orange-100 text-orange-700',
  confirmed: 'bg-green-100 text-green-700',
  pre_event: 'bg-purple-100 text-purple-700',
  event_day: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-teal-100 text-teal-700',
  settled: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  disputed: 'bg-red-100 text-red-700',
};

type FilterKey = 'all' | 'active' | 'completed' | 'cancelled';

const ACTIVE_STATUSES = ['inquiry', 'quoted', 'negotiating', 'confirmed', 'pre_event', 'event_day'];
const COMPLETED_STATUSES = ['completed', 'settled'];
const CANCELLED_STATUSES = ['cancelled'];

export default function AgentBookingsPage() {
  const [bookings, setBookings] = useState<AgentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');

  useEffect(() => {
    apiClient<AgentBooking[]>('/v1/bookings?role=agent')
      .then((res) => {
        if (res.success) setBookings(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = bookings.filter((b) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ACTIVE_STATUSES.includes(b.status);
    if (filter === 'completed') return COMPLETED_STATUSES.includes(b.status);
    if (filter === 'cancelled') return CANCELLED_STATUSES.includes(b.status);
    return true;
  });

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
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
      <h1 className="text-2xl font-bold text-gray-900">Booking Pipeline</h1>

      {/* Filter Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
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
          </button>
        ))}
      </div>

      {/* Booking List */}
      {filtered.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No bookings in this status.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => {
            const amount = b.final_amount_paise ?? b.quoted_amount_paise;
            return (
              <Link
                key={b.id}
                href={`/agent/bookings/${b.id}`}
                className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">{b.artist_name}</h3>
                      <span className="text-gray-400 text-sm">&middot;</span>
                      <span className="text-sm text-gray-500">{b.client_name}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {b.event_type} &middot; {b.event_city} &middot;{' '}
                      {new Date(b.event_date).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-700'}`}
                    >
                      {b.status.replace(/_/g, ' ')}
                    </span>
                    {amount != null && (
                      <span className="text-sm font-medium text-gray-700">
                        ₹{(amount / 100).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
