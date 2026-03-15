'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
  if (!booking) return <p className="text-center py-10 text-gray-500">Booking not found</p>;

  const canQuote = ['inquiry', 'quoted', 'negotiating'].includes(booking.status);
  const canConfirm = ['quoted', 'negotiating'].includes(booking.status);
  const canCancel = ['inquiry', 'quoted', 'negotiating', 'confirmed'].includes(booking.status);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Booking from {booking.client_name ?? 'Client'}</h1>

      {/* Event Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase">Event Details</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">Type:</span> <span className="font-medium">{booking.event_type}</span></div>
          <div><span className="text-gray-500">Date:</span> <span className="font-medium">{new Date(booking.event_date).toLocaleDateString('en-IN')}</span></div>
          <div><span className="text-gray-500">City:</span> <span className="font-medium">{booking.event_city}</span></div>
          <div><span className="text-gray-500">Duration:</span> <span className="font-medium">{booking.event_duration_hours}h</span></div>
          {booking.guest_count && <div><span className="text-gray-500">Guests:</span> <span className="font-medium">{booking.guest_count}</span></div>}
          {booking.special_requirements && <div className="col-span-2"><span className="text-gray-500">Special Requirements:</span> <span className="font-medium">{booking.special_requirements}</span></div>}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Status</h2>
        <StateTimeline currentStatus={booking.status} events={booking.events} />
      </div>

      {/* Auto-Quote Suggestion */}
      {canQuote && autoQuote && booking.quotes.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-blue-700 mb-3">Suggested Quote (from your pricing)</h2>
          <QuoteBreakdown breakdown={autoQuote} />
          <button
            onClick={handleUseAutoQuote}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Use this amount
          </button>
        </div>
      )}

      {/* Existing Quotes */}
      {booking.quotes.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase">Negotiation History</h2>
          {booking.quotes.map((q) => (
            <div key={q.round} className="border border-gray-100 rounded-lg p-3">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Round {q.round} {q.is_final ? '(Final Offer)' : ''}</span>
                <span className="text-xs text-gray-400">{new Date(q.created_at).toLocaleString('en-IN')}</span>
              </div>
              <QuoteBreakdown breakdown={q.breakdown} />
              {q.notes && <p className="text-sm text-gray-600 mt-2">{q.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Submit Quote / Counter */}
      {canQuote && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <form onSubmit={handleSubmitQuote} className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">
              {booking.quotes.length === 0 ? 'Submit Your Quote' : 'Counter-Offer'}
            </h3>
            <div className="flex gap-2">
              <input
                type="number"
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
                placeholder="Your fee (INR)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 disabled:opacity-50">
                {submitting ? 'Sending...' : 'Send Quote'}
              </button>
            </div>
            <input
              value={quoteNotes}
              onChange={(e) => setQuoteNotes(e.target.value)}
              placeholder="Notes for the client (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </form>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {canConfirm && (
          <button onClick={() => handleTransition('confirmed')} disabled={submitting} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
            Accept & Confirm
          </button>
        )}
        {canCancel && (
          <button onClick={() => handleTransition('cancelled')} disabled={submitting} className="py-2 px-4 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50">
            Decline
          </button>
        )}
      </div>
    </div>
  );
}
