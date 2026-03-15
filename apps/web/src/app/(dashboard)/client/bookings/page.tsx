'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api-client';

interface Booking {
  id: string;
  artist_name: string;
  event_type: string;
  event_date: string;
  event_city: string;
  status: string;
  quoted_amount_paise?: number;
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  inquiry: { label: 'Inquiry', className: 'bg-blue-100 text-blue-700' },
  quoted: { label: 'Quoted', className: 'bg-yellow-100 text-yellow-700' },
  negotiating: { label: 'Negotiating', className: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmed', className: 'bg-green-100 text-green-700' },
  completed: { label: 'Completed', className: 'bg-purple-100 text-purple-700' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
  expired: { label: 'Expired', className: 'bg-gray-100 text-gray-600' },
};

export default function ClientBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ role: 'client' });
    if (filter) params.set('status', filter);

    apiClient<Booking[]>(`/v1/bookings?${params}`)
      .then((res) => { if (res.success) setBookings(res.data); })
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
        <Link
          href="/search"
          className="text-sm bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600"
        >
          Book an Artist
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto">
        {['', 'inquiry', 'quoted', 'confirmed', 'completed', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => { setFilter(s); setLoading(true); }}
            className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap ${
              filter === s ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 border border-gray-300'
            }`}
          >
            {s ? STATUS_LABELS[s]?.label ?? s : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-1">No bookings yet</p>
          <p className="text-sm">Search for artists to create your first booking</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const statusInfo = STATUS_LABELS[b.status] ?? { label: b.status, className: 'bg-gray-100 text-gray-600' };
            return (
              <Link
                key={b.id}
                href={`/client/bookings/${b.id}`}
                className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-primary-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{b.artist_name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.className}`}>
                    {statusInfo.label}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{b.event_type}</span>
                  <span>{new Date(b.event_date).toLocaleDateString('en-IN')}</span>
                  <span>{b.event_city}</span>
                  {b.quoted_amount_paise && (
                    <span className="font-medium text-gray-700">
                      ₹{(b.quoted_amount_paise / 100).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
