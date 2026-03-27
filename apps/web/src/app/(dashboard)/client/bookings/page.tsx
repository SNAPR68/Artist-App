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
  inquiry: { bg: 'booking-inquiry', badge: 'bg-[#a1faff]/20 text-[#a1faff] border-[#a1faff]/30', text: 'Inquiry' },
  quoted: { bg: 'booking-quoted', badge: 'bg-[#ffbf00]/20 text-[#ffbf00] border-[#ffbf00]/30', text: 'Quoted' },
  negotiating: { bg: 'booking-quoted', badge: 'bg-[#ffbf00]/20 text-[#ffbf00] border-[#ffbf00]/30', text: 'Negotiating' },
  confirmed: { bg: 'booking-confirmed', badge: 'bg-[#4ade80]/20 text-[#4ade80] border-[#4ade80]/30', text: 'Confirmed' },
  completed: { bg: 'booking-completed', badge: 'bg-[#c39bff]/20 text-[#c39bff] border-[#c39bff]/30', text: 'Completed' },
  cancelled: { bg: 'booking-cancelled', badge: 'bg-[#ff6e84]/20 text-[#ff6e84] border-[#ff6e84]/30', text: 'Cancelled' },
  expired: { bg: 'booking-cancelled', badge: 'bg-white/10 text-white/40 border-white/10', text: 'Expired' },
};

function SkeletonCard() {
  return (
    <div className="glass-card p-5 space-y-3 animate-fade-in border border-white/5 rounded-xl">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-5 bg-white/10 rounded-lg w-32" />
          <div className="h-3 bg-white/10 rounded w-24" />
        </div>
        <div className="h-6 bg-white/10 rounded-full w-20" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-3 bg-white/10 rounded w-20" />
        <div className="h-3 bg-white/10 rounded w-24" />
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
    <div className="space-y-6 relative">
      {/* Ambient glows */}
      <div className="absolute -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-40 -left-20 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full pointer-events-none" />

      {/* ─── Bento Hero ─── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fade-in-up relative z-10">
        <div className="md:col-span-8 glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden">
          <div className="absolute -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <span className="text-[#a1faff] font-bold text-xs tracking-widest uppercase mb-2 block">Bookings</span>
            <h1 className="text-3xl font-display font-extrabold tracking-tighter text-white mb-1">My Bookings</h1>
            <p className="text-white/40 text-sm">Track and manage all your artist bookings</p>
            <div className="flex gap-6 mt-4">
              <div>
                <p className="text-white/40 text-xs">Total</p>
                <p className="text-xl font-bold text-white">{bookings.length}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs">Confirmed</p>
                <p className="text-xl font-bold text-[#4ade80]">{bookings.filter(b => b.status === 'confirmed').length}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="md:col-span-4 glass-card rounded-xl p-6 border border-white/5 flex items-center justify-center">
          <Link
            href="/search"
            className="w-full py-3 bg-gradient-to-br from-[#c39bff] to-[#8A2BE2] text-white rounded-xl text-sm font-bold text-center hover:shadow-[0_0_20px_rgba(195,155,255,0.3)] transition-all"
          >
            Book an Artist
          </Link>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 animate-fade-in-up relative z-10" style={{ animationDelay: '50ms' }}>
        {['', 'inquiry', 'quoted', 'confirmed', 'completed', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => { setFilter(s); setLoading(true); }}
            className={`px-4 py-2 text-sm rounded-full whitespace-nowrap transition-all font-medium border ${
              filter === s
                ? 'glass-card bg-white/10 text-[#c39bff] border-[#c39bff]/30'
                : 'glass-card text-white/60 border-white/10 hover:border-white/20'
            }`}
          >
            {s ? STATUS_COLORS[s]?.text ?? s : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-3 animate-fade-in relative z-10" style={{ animationDelay: '100ms' }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl animate-fade-in-up border border-white/5 relative z-10" style={{ animationDelay: '100ms' }}>
          <Music className="w-12 h-12 text-white/30 mx-auto mb-3" />
          <p className="text-lg font-medium text-white mb-1">No bookings yet</p>
          <p className="text-white/40 text-sm">Search for artists to create your first booking</p>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in relative z-10" style={{ animationDelay: '100ms' }}>
          {bookings.map((b, idx) => {
            const statusInfo = STATUS_COLORS[b.status] ?? { badge: 'bg-white/10 text-white/40 border-white/10', text: b.status };
            return (
              <Link
                key={b.id}
                href={`/client/bookings/${b.id}`}
                className="glass-card group hover:bg-white/5 border border-white/10 hover:border-white/20 rounded-xl p-5 transition-all duration-300 cursor-pointer block animate-fade-in-up"
                style={{ animationDelay: `${50 + idx * 25}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white group-hover:text-[#c39bff] transition-colors">{b.artist_name}</h3>
                    <p className="text-white/60 text-sm">{b.event_type}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${statusInfo.badge} whitespace-nowrap ml-2`}>
                    {statusInfo.text}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-white/60">
                    <Calendar className="w-4 h-4 text-[#a1faff]" />
                    <span>{new Date(b.event_date).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/60">
                    <MapPin className="w-4 h-4 text-[#a1faff]" />
                    <span>{b.event_city}</span>
                  </div>
                  {b.quoted_amount_paise && (
                    <div className="flex items-center gap-2 text-white font-semibold pt-1">
                      <IndianRupee className="w-4 h-4 text-[#ffbf00]" />
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
