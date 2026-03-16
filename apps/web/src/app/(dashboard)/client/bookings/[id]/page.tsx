'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  status: string;
  quoted_amount_paise?: number;
  final_amount_paise?: number;
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

export default function ClientBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterNotes, setCounterNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Review state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    loadBooking();
  }, [id]);

  const loadBooking = async () => {
    const res = await apiClient<BookingDetail>(`/v1/bookings/${id}`);
    if (res.success) setBooking(res.data);
    setLoading(false);
  };

  const handleCounterOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const amountPaise = Math.round(parseFloat(counterAmount) * 100);
    await apiClient(`/v1/bookings/${id}/quotes`, {
      method: 'POST',
      body: JSON.stringify({ amount_paise: amountPaise, notes: counterNotes || undefined }),
    });
    setCounterAmount('');
    setCounterNotes('');
    setSubmitting(false);
    loadBooking();
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    await apiClient(`/v1/bookings/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify({ state: 'confirmed' }),
    });
    setSubmitting(false);
    loadBooking();
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this booking?')) return;
    setSubmitting(true);
    await apiClient(`/v1/bookings/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify({ state: 'cancelled' }),
    });
    setSubmitting(false);
    loadBooking();
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await apiClient('/v1/reviews', {
      method: 'POST',
      body: JSON.stringify({
        booking_id: id,
        overall_rating: reviewRating,
        dimensions: {
          professionalism: reviewRating,
          punctuality: reviewRating,
          performance_quality: reviewRating,
          value_for_money: reviewRating,
        },
        comment: reviewComment || undefined,
      }),
    });
    setSubmitting(false);
    if (res.success) setReviewSubmitted(true);
  };

  const handleDownloadContract = async () => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const res = await fetch(`${apiBase}/v1/payments/contract/${id}/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contract-${id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;
  }
  if (!booking) return <p className="text-center py-10 text-gray-500">Booking not found</p>;

  const latestQuote = booking.quotes[booking.quotes.length - 1];
  const canNegotiate = ['inquiry', 'quoted', 'negotiating'].includes(booking.status);
  const canConfirm = ['quoted', 'negotiating'].includes(booking.status) && latestQuote;
  const canCancel = ['inquiry', 'quoted', 'negotiating', 'confirmed'].includes(booking.status);
  const canPay = booking.status === 'confirmed';
  const canReview = ['completed', 'settled'].includes(booking.status);
  const canDownloadContract = ['confirmed', 'pre_event', 'event_day', 'completed', 'settled'].includes(booking.status);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Booking with {booking.artist_name}</h1>

      {/* Event Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase">Event Details</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">Type:</span> <span className="font-medium">{booking.event_type}</span></div>
          <div><span className="text-gray-500">Date:</span> <span className="font-medium">{new Date(booking.event_date).toLocaleDateString('en-IN')}</span></div>
          <div><span className="text-gray-500">City:</span> <span className="font-medium">{booking.event_city}</span></div>
          <div><span className="text-gray-500">Duration:</span> <span className="font-medium">{booking.event_duration_hours}h</span></div>
          {booking.event_venue && <div className="col-span-2"><span className="text-gray-500">Venue:</span> <span className="font-medium">{booking.event_venue}</span></div>}
          {booking.special_requirements && <div className="col-span-2"><span className="text-gray-500">Notes:</span> <span className="font-medium">{booking.special_requirements}</span></div>}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Status</h2>
        <StateTimeline currentStatus={booking.status} events={booking.events} />
      </div>

      {/* Quotes / Negotiation */}
      {booking.quotes.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase">Quotes</h2>
          {booking.quotes.map((q) => (
            <div key={q.round} className="border border-gray-100 rounded-lg p-3">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Round {q.round} {q.is_final ? '(Final)' : ''}</span>
                <span className="text-xs text-gray-400">{new Date(q.created_at).toLocaleString('en-IN')}</span>
              </div>
              <QuoteBreakdown breakdown={q.breakdown} />
              {q.notes && <p className="text-sm text-gray-600 mt-2">{q.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Payment CTA for confirmed bookings */}
      {canPay && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-5 text-center">
          <h3 className="text-lg font-semibold text-green-800 mb-2">Booking Confirmed!</h3>
          <p className="text-sm text-green-700 mb-4">
            Complete your payment of {booking.final_amount_paise
              ? `₹${(booking.final_amount_paise / 100).toLocaleString('en-IN')}`
              : 'the agreed amount'} to secure the booking.
          </p>
          <button
            onClick={() => router.push(`/client/bookings/${id}/pay`)}
            className="px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
          >
            Proceed to Payment
          </button>
        </div>
      )}

      {/* Contract Download */}
      {canDownloadContract && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Booking Contract</h3>
            <p className="text-xs text-gray-500">Download the terms and financial details for this booking.</p>
          </div>
          <button
            onClick={handleDownloadContract}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            Download
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        {canNegotiate && (
          <form onSubmit={handleCounterOffer} className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Submit Counter-Offer</h3>
            <div className="flex gap-2">
              <input
                type="number"
                value={counterAmount}
                onChange={(e) => setCounterAmount(e.target.value)}
                placeholder="Amount (INR)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 disabled:opacity-50">
                {submitting ? 'Sending...' : 'Send Offer'}
              </button>
            </div>
            <input
              value={counterNotes}
              onChange={(e) => setCounterNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </form>
        )}

        <div className="flex gap-3">
          {canConfirm && (
            <button onClick={handleConfirm} disabled={submitting} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              Confirm Booking
            </button>
          )}
          {canCancel && (
            <button onClick={handleCancel} disabled={submitting} className="py-2 px-4 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Review Form for completed bookings */}
      {canReview && !reviewSubmitted && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Leave a Review</h2>
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className={`text-2xl ${star <= reviewRating ? 'text-yellow-400' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Comment (optional)</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3}
                placeholder="How was the performance?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        </div>
      )}

      {reviewSubmitted && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-5 text-center">
          <p className="text-green-700 font-medium">Thank you! Your review has been submitted.</p>
        </div>
      )}
    </div>
  );
}
