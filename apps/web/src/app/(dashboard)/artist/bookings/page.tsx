'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, IndianRupee, Sparkles, Music } from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';

interface Booking {
  id: string;
  client_name: string;
  event_type: string;
  event_date: string;
  event_city: string;
  status: string;
  quoted_amount_paise?: number;
  created_at: string;
}

const STATUS_COLORS: Record<string, { badge: string; borderColor: string; text: string }> = {
  inquiry: { badge: 'bg-[#a1faff]/15 text-[#a1faff]', borderColor: 'border-l-[#a1faff]', text: 'New Inquiry' },
  quoted: { badge: 'bg-[#ffbf00]/15 text-[#ffbf00]', borderColor: 'border-l-[#ffbf00]', text: 'Quoted' },
  negotiating: { badge: 'bg-[#ffbf00]/15 text-[#ffbf00]', borderColor: 'border-l-[#ffbf00]', text: 'Negotiating' },
  confirmed: { badge: 'bg-green-400/15 text-green-400', borderColor: 'border-l-green-400', text: 'Confirmed' },
  pre_event: { badge: 'bg-green-400/15 text-green-400', borderColor: 'border-l-green-400', text: 'Pre-Event' },
  event_day: { badge: 'bg-[#c39bff]/15 text-[#c39bff]', borderColor: 'border-l-[#c39bff]', text: 'Event Day' },
  completed: { badge: 'bg-[#c39bff]/15 text-[#c39bff]', borderColor: 'border-l-[#c39bff]', text: 'Completed' },
  settled: { badge: 'bg-green-400/15 text-green-400', borderColor: 'border-l-green-400', text: 'Settled' },
  cancelled: { badge: 'bg-[#ff8b9a]/15 text-[#ff8b9a]', borderColor: 'border-l-[#ff8b9a]', text: 'Cancelled' },
  expired: { badge: 'bg-white/5 text-white/40', borderColor: 'border-l-white/20', text: 'Expired' },
};

function SkeletonCard() {
  return (
    <div className="glass-card p-5 space-y-3 animate-fade-in rounded-lg border border-white/5">
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

export default function ArtistBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ role: 'artist' });
    if (filter) params.set('status', filter);

    apiClient<Booking[]>(`/v1/bookings?${params}`)
      .then((res) => { if (res.success) setBookings(res.data); })
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="space-y-6">
      {/* ─── Ambient Glows ─── */}
      <div className="fixed -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed -bottom-40 -left-20 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full pointer-events-none" />

      {/* ─── Hero Section ─── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fade-in-up relative z-10">
        <div className="md:col-span-8 glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <span className="text-[#a1faff] font-bold text-xs tracking-widest uppercase mb-2 block">Your Gigs</span>
            <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tighter text-white mb-2">Bookings</h1>
            <p className="text-white/40 text-sm">Manage inquiries, confirmed shows, and past performances</p>
            <div className="flex gap-8 mt-6">
              <div>
                <p className="text-white/40 text-xs mb-1 font-bold uppercase tracking-widest">Total</p>
                <p className="text-2xl font-black text-white">{bookings.length}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs mb-1 font-bold uppercase tracking-widest">Confirmed</p>
                <p className="text-2xl font-black text-green-400">{bookings.filter(b => ['confirmed', 'pre_event'].includes(b.status)).length}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs mb-1 font-bold uppercase tracking-widest">Pending</p>
                <p className="text-2xl font-black text-[#ffbf00]">{bookings.filter(b => ['inquiry', 'quoted', 'negotiating'].includes(b.status)).length}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="md:col-span-4 glass-card rounded-xl p-6 border border-white/5 border-l-4 border-l-[#c39bff] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Earnings Snapshot</h3>
            <IndianRupee className="w-5 h-5 text-[#c39bff]" />
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-2xl font-black text-white">
                ₹{bookings.filter(b => b.quoted_amount_paise).reduce((sum, b) => sum + Number(b.quoted_amount_paise ?? 0), 0) > 0
                  ? (bookings.reduce((sum, b) => sum + Number(b.quoted_amount_paise ?? 0), 0) / 100).toLocaleString('en-IN')
                  : '0'}
              </p>
              <p className="text-xs text-white/40">Total quoted value</p>
            </div>
            <div className="pt-4 border-t border-white/5">
              <p className="text-lg font-black text-[#a1faff]">{bookings.filter(b => b.status === 'completed' || b.status === 'settled').length}</p>
              <p className="text-xs text-white/40">Completed this period</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Filter Pills ─── */}
      <div className="flex gap-2 overflow-x-auto pb-2 animate-fade-in-up relative z-10" style={{ animationDelay: '50ms' }}>
        {['', 'inquiry', 'confirmed', 'completed', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => { setFilter(s); setLoading(true); }}
            className={`px-4 py-2 text-sm rounded-full whitespace-nowrap transition-all font-bold uppercase tracking-widest text-xs ${
              filter === s
                ? 'bg-gradient-to-r from-[#c39bff] to-[#8A2BE2] text-white shadow-[0_0_20px_rgba(195,155,255,0.3)]'
                : 'glass-card text-white/60 hover:border-white/20 border border-white/5'
            }`}
          >
            {s ? STATUS_COLORS[s]?.text ?? s : 'All'}
          </button>
        ))}
      </div>

      {/* ─── Bookings List ─── */}
      {loading ? (
        <div className="grid gap-3 animate-fade-in relative z-10" style={{ animationDelay: '100ms' }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-xl animate-fade-in-up relative z-10 border border-white/5" style={{ animationDelay: '100ms' }}>
          <Music className="w-12 h-12 text-white/30 mx-auto mb-3" />
          <p className="text-lg font-semibold text-white mb-1">No bookings</p>
          <p className="text-white/50 text-sm">New inquiries will appear here</p>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in relative z-10" style={{ animationDelay: '100ms' }}>
          {bookings.map((b, idx) => {
            const statusInfo = STATUS_COLORS[b.status] ?? { badge: 'bg-white/5 text-white/40', borderColor: 'border-l-white/20', text: b.status };
            const isNew = b.status === 'inquiry';
            return (
              <Link
                key={b.id}
                href={`/artist/bookings/${b.id}`}
                className={`glass-card group hover:bg-white/10 backdrop-blur-xl rounded-xl p-5 transition-all duration-300 shadow-nocturne-glow-sm cursor-pointer block animate-fade-in-up border ${
                  isNew
                    ? `${statusInfo.borderColor} border-l-4 bg-gradient-to-r from-[#a1faff]/10 to-transparent shadow-[0_0_20px_rgba(161,250,255,0.1)]`
                    : `${statusInfo.borderColor} border-l-4 border-b border-r border-white/5 hover:border-white/10`
                }`}
                style={{ animationDelay: `${50 + idx * 25}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white group-hover:text-[#c39bff] transition-colors">{b.client_name ?? 'Client'}</h3>
                      {isNew && <Sparkles className="w-4 h-4 text-[#a1faff] animate-pulse" />}
                    </div>
                    <p className="text-white/50 text-sm">{b.event_type}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-widest ${statusInfo.badge} whitespace-nowrap ml-2`}>
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
                      <IndianRupee className="w-4 h-4 text-[#c39bff]" />
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
