'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Calendar, MapPin, Clock, FileText, CheckCircle, XCircle, Lightbulb, Send, Zap } from 'lucide-react';
import { apiClient } from '../../../../../lib/api-client';
import { StateTimeline } from '../../../../../components/booking/StateTimeline';
import { QuoteBreakdown } from '../../../../../components/booking/QuoteBreakdown';

interface BookingDetail {
  id: string;
  artist_name: string;
  client_name: string;
  event_type: string;
  event_date: string;
  event_city: string;
  event_venue?: string;
  event_duration_hours: number;
  guest_count?: number;
  status: string;
  special_requirements?: string;
  quotes: Array<{
    round: number;
    amount_paise: number;
    submitted_by: string;
    notes?: string;
    is_final: boolean;
    breakdown: {
      base_amount_paise: number;
      travel_surcharge_paise: number;
      platform_fee_paise: number;
      tds_paise: number;
      gst_on_platform_fee_paise: number;
      total_client_pays_paise: number;
      artist_receives_paise: number;
    };
    created_at: string;
  }>;
  events: Array<{
    from_status: string;
    to_status: string;
    triggered_by: string;
    created_at: string;
  }>;
}

interface AutoQuote {
  base_amount_paise: number;
  travel_surcharge_paise: number;
  platform_fee_paise: number;
  tds_paise: number;
  gst_on_platform_fee_paise: number;
  total_client_pays_paise: number;
  artist_receives_paise: number;
}

export default function ArtistBookingDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [autoQuote, setAutoQuote] = useState<AutoQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBooking();
  }, [id]);

  const loadBooking = async () => {
    const [bookingRes, quoteRes] = await Promise.all([
      apiClient<BookingDetail>(`/v1/bookings/${id}`),
      apiClient<AutoQuote>(`/v1/bookings/${id}/auto-quote`),
    ]);
    if (bookingRes.success) setBooking(bookingRes.data);
    if (quoteRes.success) setAutoQuote(quoteRes.data);
    setLoading(false);
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const amountPaise = Math.round(parseFloat(quoteAmount) * 100);
    await apiClient(`/v1/bookings/${id}/quotes`, {
      method: 'POST',
      body: JSON.stringify({ amount_paise: amountPaise, notes: quoteNotes || undefined }),
    });
    setQuoteAmount('');
    setQuoteNotes('');
    setSubmitting(false);
    loadBooking();
  };

  const handleUseAutoQuote = () => {
    if (autoQuote) {
      setQuoteAmount(String(autoQuote.base_amount_paise / 100));
    }
  };

  const handleTransition = async (state: string) => {
    if (state === 'cancelled' && !confirm('Cancel this booking?')) return;
    setSubmitting(true);
    await apiClient(`/v1/bookings/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify({ state }),
    });
    setSubmitting(false);
    loadBooking();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c39bff]" />
      </div>
    );
  }
  if (!booking) return <p className="text-center py-10 text-white/50">Booking not found</p>;

  const canQuote = ['inquiry', 'quoted', 'negotiating'].includes(booking.status);
  const canConfirm = ['quoted', 'negotiating'].includes(booking.status);
  const canCancel = ['inquiry', 'quoted', 'negotiating', 'confirmed'].includes(booking.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up relative">
      {/* ─── Ambient Glows ─── */}
      <div className="fixed -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed -bottom-40 -left-20 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10">
        <h1 className="text-4xl font-display font-extrabold tracking-tighter text-white mb-2">Booking from {booking.client_name ?? 'Client'}</h1>
        <p className="text-white/50 text-sm">Review event details and submit your quote</p>
      </div>

      {/* ─── Event Details Hero ─── */}
      <div className="glass-card rounded-xl p-8 border border-white/5 backdrop-blur-xl relative z-10">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#a1faff] mb-6">Event Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-[#a1faff] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wide font-bold">Type</p>
              <p className="text-white font-semibold">{booking.event_type}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-[#a1faff] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wide font-bold">Date</p>
              <p className="text-white font-semibold">{new Date(booking.event_date).toLocaleDateString('en-IN')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-[#a1faff] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wide font-bold">City</p>
              <p className="text-white font-semibold">{booking.event_city}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-[#a1faff] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wide font-bold">Duration</p>
              <p className="text-white font-semibold">{booking.event_duration_hours}h</p>
            </div>
          </div>
          {booking.guest_count && <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-[#a1faff] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wide font-bold">Guests</p>
              <p className="text-white font-semibold">{booking.guest_count}</p>
            </div>
          </div>}
          {booking.special_requirements && <div className="col-span-2 flex items-start gap-3">
            <FileText className="w-5 h-5 text-[#a1faff] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wide font-bold">Special Requirements</p>
              <p className="text-white font-semibold">{booking.special_requirements}</p>
            </div>
          </div>}
        </div>
      </div>

      {/* ─── Timeline ─── */}
      <div className="glass-card rounded-xl p-8 border border-white/5 backdrop-blur-xl relative z-10">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#a1faff] mb-6">Status Timeline</h2>
        <StateTimeline currentStatus={booking.status} events={booking.events} />
      </div>

      {/* ─── Auto-Quote Suggestion ─── */}
      {canQuote && autoQuote && booking.quotes.length === 0 && (
        <div className="glass-card rounded-xl p-6 border-2 border-[#a1faff]/30 bg-gradient-to-r from-[#a1faff]/10 to-transparent backdrop-blur-xl relative z-10 shadow-[0_0_20px_rgba(161,250,255,0.1)]">
          <div className="flex items-start gap-3 mb-4">
            <Lightbulb className="w-6 h-6 text-[#a1faff] flex-shrink-0 mt-0.5 animate-pulse" />
            <div>
              <h2 className="text-sm font-bold text-[#a1faff]">Suggested Quote</h2>
              <p className="text-xs text-white/50 mt-0.5">Based on your pricing settings</p>
            </div>
          </div>
          <div className="mb-4 p-4 bg-white/5 rounded-lg backdrop-blur-md border border-white/10">
            <QuoteBreakdown breakdown={autoQuote} />
          </div>
          <button
            onClick={handleUseAutoQuote}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-[#c39bff] to-[#8A2BE2] text-white rounded-lg text-sm font-bold uppercase tracking-widest hover:shadow-[0_0_20px_rgba(195,155,255,0.3)] transition-all"
          >
            Use this Amount
          </button>
        </div>
      )}

      {/* ─── Existing Quotes ─── */}
      {booking.quotes.length > 0 && (
        <div className="glass-card rounded-xl p-8 border border-white/5 backdrop-blur-xl relative z-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#a1faff] mb-6">Negotiation History</h2>
          {booking.quotes.map((q, idx) => (
            <div key={q.round} className={`bg-[#1a191b] rounded-lg p-4 border border-white/10 backdrop-blur-md mb-4 ${
              idx % 2 === 0 ? 'ml-0 mr-auto' : 'ml-auto mr-0'
            } w-full md:w-5/6`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-sm font-bold text-white">Round {q.round} {q.is_final ? '• Final Offer' : ''}</span>
                  <p className="text-xs text-white/50 mt-1">{new Date(q.created_at).toLocaleString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-[#c39bff]">₹{(q.amount_paise / 100).toLocaleString('en-IN')}</p>
                </div>
              </div>
              <QuoteBreakdown breakdown={q.breakdown} />
              {q.notes && <p className="text-sm text-white/60 mt-3 italic">{q.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* ─── Submit Quote / Counter ─── */}
      {canQuote && (
        <div className="glass-card rounded-xl p-8 border border-white/5 backdrop-blur-xl relative z-10">
          <h3 className="text-sm font-bold text-white mb-6">
            {booking.quotes.length === 0 ? 'Submit Your Quote' : 'Counter-Offer'}
          </h3>
          <form onSubmit={handleSubmitQuote} className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-bold">₹</span>
                <input
                  type="number"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-6 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#c39bff] transition-all"
                  required
                />
              </div>
              <button type="submit" disabled={submitting} className="px-4 py-2.5 bg-gradient-to-r from-[#c39bff] to-[#8A2BE2] text-white rounded-lg text-sm font-bold uppercase tracking-widest hover:shadow-[0_0_20px_rgba(195,155,255,0.3)] disabled:opacity-50 transition-all flex items-center gap-2 whitespace-nowrap">
                <Send className="w-4 h-4" />
                {submitting ? 'Sending...' : 'Send Quote'}
              </button>
            </div>
            <input
              value={quoteNotes}
              onChange={(e) => setQuoteNotes(e.target.value)}
              placeholder="Add notes for the client (optional)"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#c39bff] transition-all"
            />
          </form>
        </div>
      )}

      {/* ─── Actions ─── */}
      <div className="flex gap-3 flex-col sm:flex-row relative z-10">
        {canConfirm && (
          <button onClick={() => handleTransition('confirmed')} disabled={submitting} className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-bold uppercase tracking-widest hover:shadow-[0_0_20px_rgba(74,222,128,0.3)] disabled:opacity-50 transition-all flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Accept & Confirm
          </button>
        )}
        {canCancel && (
          <button onClick={() => handleTransition('cancelled')} disabled={submitting} className="py-2.5 px-4 bg-[#ff8b9a]/15 border border-[#ff8b9a]/30 text-[#ff8b9a] rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-[#ff8b9a]/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
            <XCircle className="w-4 h-4" />
            Decline
          </button>
        )}
      </div>
    </div>
  );
}
