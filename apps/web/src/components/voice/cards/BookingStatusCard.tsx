'use client';

import Link from 'next/link';
import type { VoiceBookingCard } from '@artist-booking/shared';

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending_quote: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Pending Quote' },
  quoted: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Quoted' },
  negotiating: { bg: 'bg-purple-500/15', text: 'text-purple-400', label: 'Negotiating' },
  confirmed: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Confirmed' },
  advance_paid: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Advance Paid' },
  in_progress: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', label: 'In Progress' },
  completed: { bg: 'bg-green-500/15', text: 'text-green-400', label: 'Completed' },
  cancelled: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Cancelled' },
  disputed: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Disputed' },
};

export function BookingStatusCard({ booking }: { booking: VoiceBookingCard }) {
  const statusInfo = STATUS_COLORS[booking.status] ?? { bg: 'bg-white/10', text: 'text-white/50', label: booking.status };

  return (
    <Link
      href={`/client/bookings/${booking.id}`}
      className="block rounded-xl border border-white/10 bg-[#1a191b]/80 backdrop-blur-sm p-3 hover:border-white/20 transition-all"
    >
      <div className="flex gap-3">
        {/* Artist thumbnail */}
        <div className="w-10 h-10 rounded-lg bg-white/5 flex-shrink-0 overflow-hidden">
          {booking.artist_thumbnail ? (
            <img src={booking.artist_thumbnail} alt={booking.artist_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20 text-sm font-bold">
              {booking.artist_name.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-white truncate">{booking.artist_name}</h4>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusInfo.bg} ${statusInfo.text}`}>
              {statusInfo.label}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1 text-[10px] text-white/30">
            {booking.event_type && <span>{booking.event_type}</span>}
            {booking.event_date && <span>· {new Date(booking.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
            {booking.venue_city && <span>· {booking.venue_city}</span>}
          </div>

          {booking.amount_paise && (
            <p className="text-xs text-white/50 mt-1">
              ₹{(booking.amount_paise / 100).toLocaleString('en-IN')}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
