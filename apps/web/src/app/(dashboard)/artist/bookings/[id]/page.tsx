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
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;
  }
  if (!booking) return <p className="text-center py-10 text-nocturne-text-tertiary">Booking not found</p>;

  const canQuote = ['inquiry', 'quoted', 'negotiating'].includes(booking.status);
  const canConfirm = ['quoted', 'negotiating'].includes(booking.status);
  const canCancel = ['inquiry', 'quoted', 'negotiating', 'confirmed'].includes(booking.status);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold text-gradient font-display">Booking from {booking.client_name ?? 'Client'}</h1>
        <p className="text-nocturne-text-tertiary text-sm mt-1">Review event details and submit your quote</p>
      </div>

      {/* Event Details */}
      <div className="glass-card rounded-xl p-6 space-y-4 backdrop-blur-xl border border-white/10">
        <h2 className="text-sm font-semibold text-gradient uppercase tracking-wide font-display">Event Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-nocturne-accent mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-nocturne-text-tertiary text-xs uppercase tracking-wide">Type</p>
              <p className="text-nocturne-text-primary font-medium">{booking.event_type}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-nocturne-accent mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-nocturne-text-tertiary text-xs uppercase tracking-wide">Date</p>
              <p className="text-nocturne-text-primary font-medium">{new Date(booking.event_date).toLocaleDateString('en-IN')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-nocturne-accent mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-nocturne-text-tertiary text-xs uppercase tracking-wide">City</p>
              <p className="text-nocturne-text-primary font-medium">{booking.event_city}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-nocturne-accent mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-nocturne-text-tertiary text-xs uppercase tracking-wide">Duration</p>
              <p className="text-nocturne-text-primary font-medium">{booking.event_duration_hours}h</p>
            </div>
          </div>
          {booking.guest_count && <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-nocturne-accent mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-nocturne-text-tertiary text-xs uppercase tracking-wide">Guests</p>
              <p className="text-nocturne-text-primary font-medium">{booking.guest_count}</p>
            </div>
          </div>}
          {booking.special_requirements && <div className="col-span-2 flex items-start gap-3">
            <FileText className="w-5 h-5 text-nocturne-accent mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-nocturne-text-tertiary text-xs uppercase tracking-wide">Special Requirements</p>
              <p className="text-nocturne-text-primary font-medium">{booking.special_requirements}</p>
            </div>
          </div>}
        </div>
      </div>

      {/* Timeline */}
      <div className="glass-card rounded-xl p-6 backdrop-blur-xl border border-white/10">
        <h2 className="text-sm font-semibold text-gradient uppercase tracking-wide mb-4 font-display">Status Timeline</h2>
        <StateTimeline currentStatus={booking.status} events={booking.events} />
      </div>

      {/* Auto-Quote Suggestion */}
      {canQuote && autoQuote && booking.quotes.length === 0 && (
        <div className="glass-card rounded-xl p-6 backdrop-blur-xl border-2 border-gradient-accent bg-gradient-to-r from-blue-500/10 to-purple-500/10 shadow-nocturne-glow-sm hover:shadow-lg transition-all">
          <div className="flex items-start gap-3 mb-4">
            <Lightbulb className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5 animate-pulse" />
            <div>
              <h2 className="text-sm font-semibold text-blue-300">Suggested Quote</h2>
              <p className="text-xs text-nocturne-text-tertiary mt-0.5">Based on your pricing settings</p>
            </div>
          </div>
          <div className="mb-4 p-4 bg-white/5 rounded-lg backdrop-blur-md border border-white/10">
            <QuoteBreakdown breakdown={autoQuote} />
          </div>
          <button
            onClick={handleUseAutoQuote}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-sm font-semibold hover-glow shadow-nocturne-glow-sm transition-all"
          >
            Use this Amount
          </button>
        </div>
      )}

      {/* Existing Quotes */}
      {booking.quotes.length > 0 && (
        <div className="glass-card rounded-xl p-6 space-y-4 backdrop-blur-xl border border-white/10">
          <h2 className="text-sm font-semibold text-gradient uppercase tracking-wide font-display">Negotiation History</h2>
          {booking.quotes.map((q, idx) => (
            <div key={q.round} className={`bg-nocturne-surface-2 rounded-lg p-4 border border-white/10 backdrop-blur-md ${
              idx % 2 === 0 ? 'ml-0 mr-auto' : 'ml-auto mr-0'
            } w-full md:w-5/6`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-sm font-semibold text-nocturne-text-primary">Round {q.round} {q.is_final ? '• Final Offer' : ''}</span>
                  <p className="text-xs text-nocturne-text-tertiary mt-1">{new Date(q.created_at).toLocaleString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-accent-magenta">₹{(q.amount_paise / 100).toLocaleString('en-IN')}</p>
                </div>
              </div>
              <QuoteBreakdown breakdown={q.breakdown} />
              {q.notes && <p className="text-sm text-nocturne-text-secondary mt-3 italic">{q.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Submit Quote / Counter */}
      {canQuote && (
        <div className="glass-card rounded-xl p-6 space-y-3 backdrop-blur-xl border border-white/10">
          <h3 className="text-sm font-semibold text-nocturne-text-primary">
            {booking.quotes.length === 0 ? 'Submit Your Quote' : 'Counter-Offer'}
          </h3>
          <form onSubmit={handleSubmitQuote} className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-nocturne-text-tertiary">₹</span>
                <input
                  type="number"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-6 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-nocturne-text-primary placeholder-nocturne-text-secondary focus:outline-none focus:ring-1 focus:ring-nocturne-primary transition-all"
                  required
                />
              </div>
              <button type="submit" disabled={submitting} className="px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-magenta text-white rounded-lg text-sm font-semibold hover-glow shadow-nocturne-glow-sm disabled:opacity-50 transition-all flex items-center gap-2 whitespace-nowrap">
                <Send className="w-4 h-4" />
                {submitting ? 'Sending...' : 'Send Quote'}
              </button>
            </div>
            <input
              value={quoteNotes}
              onChange={(e) => setQuoteNotes(e.target.value)}
              placeholder="Add notes for the client (optional)"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-nocturne-text-primary placeholder-nocturne-text-secondary focus:outline-none focus:ring-1 focus:ring-nocturne-primary transition-all"
            />
          </form>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-col sm:flex-row">
        {canConfirm && (
          <button onClick={() => handleTransition('confirmed')} disabled={submitting} className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-semibold hover-glow shadow-nocturne-glow-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Accept & Confirm
          </button>
        )}
        {canCancel && (
          <button onClick={() => handleTransition('cancelled')} disabled={submitting} className="py-2.5 px-4 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg text-sm font-semibold hover:bg-red-500/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
            <XCircle className="w-4 h-4" />
            Decline
          </button>
        )}
      </div>
    </div>
  );
}
