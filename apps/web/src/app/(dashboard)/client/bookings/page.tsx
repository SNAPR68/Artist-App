'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, IndianRupee, Music } from 'lucide-react';
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

const STATUS_COLORS: Record<string, { bg: string; badge: string; text: string }> = {
  inquiry: { bg: 'booking-inquiry', badge: 'bg-blue-500/20 text-blue-300', text: 'Inquiry' },
  quoted: { bg: 'booking-quoted', badge: 'bg-yellow-500/20 text-yellow-300', text: 'Quoted' },
  negotiating: { bg: 'booking-quoted', badge: 'bg-yellow-500/20 text-yellow-300', text: 'Negotiating' },
  confirmed: { bg: 'booking-confirmed', badge: 'bg-green-500/20 text-green-300', text: 'Confirmed' },
  completed: { bg: 'booking-completed', badge: 'bg-purple-500/20 text-purple-300', text: 'Completed' },
  cancelled: { bg: 'booking-cancelled', badge: 'bg-red-500/20 text-red-300', text: 'Cancelled' },
  expired: { bg: 'booking-cancelled', badge: 'bg-gray-500/20 text-gray-400', text: 'Expired' },
};

function SkeletonCard() {
  return (
    <div className="glass-card p-5 space-y-3 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-5 bg-white/10 rounded-lg w-32 shimmer-overlay" />
          <div className="h-3 bg-white/5 rounded w-24" />
        </div>
        <div className="h-6 bg-white/10 rounded-full w-20 shimmer-overlay" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-3 bg-white/5 rounded w-20" />
        <div className="h-3 bg-white/5 rounded w-24" />
      </div>
    </div>
  );
}

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
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold text-gradient font-heading">My Bookings</h1>
          <p className="text-text-muted text-sm mt-1">Track and manage all your artist bookings</p>
        </div>
        <Link
          href="/search"
          className="px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-magenta text-white rounded-full text-sm font-medium hover-glow shadow-glow-sm transition-all"
        >
          Book an Artist
        </Link>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        {['', 'inquiry', 'quoted', 'confirmed', 'completed', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => { setFilter(s); setLoading(true); }}
            className={`px-4 py-2 text-sm rounded-pill whitespace-nowrap transition-all font-medium ${
              filter === s
                ? 'glass-medium bg-gradient-accent text-white shadow-glow-sm'
                : 'glass-card text-text-secondary hover:glass-medium'
            }`}
          >
            {s ? STATUS_COLORS[s]?.text ?? s : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <Music className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium text-text-primary mb-1">No bookings yet</p>
          <p className="text-text-muted text-sm">Search for artists to create your first booking</p>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
          {bookings.map((b, idx) => {
            const statusInfo = STATUS_COLORS[b.status] ?? { badge: 'bg-gray-500/20 text-gray-400', text: b.status };
            return (
              <Link
                key={b.id}
                href={`/client/bookings/${b.id}`}
                className="glass-card group hover:glass-medium backdrop-blur-xl bg-white/5 border glass-border hover:border-white/20 rounded-xl p-5 transition-all duration-300 hover-glow shadow-glow-sm cursor-pointer block animate-fade-in-up"
                style={{ animationDelay: `${50 + idx * 25}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text-primary group-hover:text-white transition-colors">{b.artist_name}</h3>
                    <p className="text-text-muted text-sm">{b.event_type}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${statusInfo.badge} whitespace-nowrap ml-2`}>
                    {statusInfo.text}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Calendar className="w-4 h-4 text-primary-400" />
                    <span>{new Date(b.event_date).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-secondary">
                    <MapPin className="w-4 h-4 text-primary-400" />
                    <span>{b.event_city}</span>
                  </div>
                  {b.quoted_amount_paise && (
                    <div className="flex items-center gap-2 text-text-primary font-semibold pt-1">
                      <IndianRupee className="w-4 h-4 text-accent-magenta" />
                      <span>₹{(b.quoted_amount_paise / 100).toLocaleString('en-IN')}</span>
                    </div>
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
