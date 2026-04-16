'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Calendar, MapPin, Clock, FileText, CheckCircle, XCircle, Download, Send } from 'lucide-react';
import { apiClient } from '../../../../../lib/api-client';
import { StateTimeline } from '../../../../../components/booking/StateTimeline';
import { QuoteBreakdown } from '../../../../../components/booking/QuoteBreakdown';
import { ReviewForm } from '../../../../../components/booking/ReviewForm';
import CancellationModal from '../../../../../components/payment/CancellationModal';

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
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Cancellation modal state
  const [showCancellationModal, setShowCancellationModal] = useState(false);

  const loadBooking = useCallback(async () => {
    const res = await apiClient<BookingDetail>(`/v1/bookings/${id}`);
    if (res.success) setBooking(res.data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

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

  const handleCancelClick = () => {
    setShowCancellationModal(true);
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
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c39bff]" /></div>;
  }
  if (!booking) return <p className="text-center py-10 text-white/40">Booking not found</p>;

  const latestQuote = booking.quotes[booking.quotes.length - 1];
  const canNegotiate = ['inquiry', 'quoted', 'negotiating'].includes(booking.status);
  const canConfirm = ['quoted', 'negotiating'].includes(booking.status) && latestQuote;
  const canCancel = ['inquiry', 'quoted', 'negotiating', 'confirmed'].includes(booking.status);
  const canPay = booking.status === 'confirmed';
  const canReview = ['completed', 'settled'].includes(booking.status);
  const canDownloadContract = ['confirmed', 'pre_event', 'event_day', 'completed', 'settled'].includes(booking.status);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up relative">
      {/* Ambient glows */}
      <div className="absolute -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-40 -left-20 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10">
        <h1 className="text-3xl font-display font-extrabold tracking-tighter text-white">Booking with {booking.artist_name}</h1>
        <p className="text-white/40 text-sm mt-1">Track your performance booking and negotiate details</p>
      </div>

      {/* Event Details */}
      <div className="glass-card rounded-xl p-6 space-y-4 border border-white/10 relative z-10">
        <h2 className="text-sm font-semibold text-[#c39bff] uppercase tracking-wide font-display">Event Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-[#a1faff] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wide">Type</p>
              <p className="text-white font-medium">{booking.event_type}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-[#a1faff] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wide">Date</p>
              <p className="text-white font-medium">{new Date(booking.event_date).toLocaleDateString('en-IN')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-[#a1faff] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wide">City</p>
              <p className="text-white font-medium">{booking.event_city}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-[#a1faff] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wide">Duration</p>
              <p className="text-white font-medium">{booking.event_duration_hours}h</p>
            </div>
          </div>
          {booking.event_venue && <div className="col-span-2 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-[#a1faff] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wide">Venue</p>
              <p className="text-white font-medium">{booking.event_venue}</p>
            </div>
          </div>}
          {booking.special_requirements && <div className="col-span-2 flex items-start gap-3">
            <FileText className="w-5 h-5 text-[#a1faff] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wide">Special Requirements</p>
              <p className="text-white font-medium">{booking.special_requirements}</p>
            </div>
          </div>}
        </div>
      </div>

      {/* Timeline */}
      <div className="glass-card rounded-xl p-6 border border-white/10 relative z-10">
        <h2 className="text-sm font-semibold text-[#c39bff] uppercase tracking-wide mb-4 font-display">Status Timeline</h2>
        <StateTimeline currentStatus={booking.status} events={booking.events} />
      </div>

      {/* Quotes / Negotiation */}
      {booking.quotes.length > 0 && (
        <div className="glass-card rounded-xl p-6 space-y-4 border border-white/10 relative z-10">
          <h2 className="text-sm font-semibold text-[#c39bff] uppercase tracking-wide font-display">Quote History</h2>
          {booking.quotes.map((q, idx) => (
            <div key={q.round} className={`bg-white/5 rounded-lg p-4 border border-white/10 ${
              idx % 2 === 0 ? 'ml-0 mr-auto' : 'ml-auto mr-0'
            } w-full md:w-5/6`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-sm font-semibold text-white">Round {q.round} {q.is_final ? '• Final' : ''}</span>
                  <p className="text-xs text-white/40 mt-1">{new Date(q.created_at).toLocaleString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[#ffbf00]">₹{(q.amount_paise / 100).toLocaleString('en-IN')}</p>
                </div>
              </div>
              <QuoteBreakdown breakdown={q.breakdown} />
              {q.notes && <p className="text-sm text-white/60 mt-3 italic">{q.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Payment CTA for confirmed bookings */}
      {canPay && (
        <div className="glass-card rounded-xl p-6 border border-[#4ade80]/30 bg-gradient-to-r from-[#4ade80]/10 to-emerald-500/10 relative z-10">
          <div className="flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-[#4ade80] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[#4ade80] mb-1">Booking Confirmed!</h3>
              <p className="text-sm text-white/60 mb-4">
                Complete your payment of {booking.final_amount_paise
                  ? `₹${(booking.final_amount_paise / 100).toLocaleString('en-IN')}`
                  : 'the agreed amount'} to secure the booking.
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/client/bookings/${id}/pay`)}
            className="w-full px-6 py-2.5 bg-gradient-to-r from-[#4ade80] to-emerald-500 text-white rounded-lg text-sm font-semibold hover:shadow-[0_0_20px_rgba(74,222,128,0.3)] transition-all"
          >
            Proceed to Payment
          </button>
        </div>
      )}

      {/* Contract Download */}
      {canDownloadContract && (
        <div className="glass-card rounded-xl p-6 flex items-center justify-between border border-white/10 hover:bg-white/5 transition-all relative z-10">
          <div>
            <h3 className="text-sm font-semibold text-white">Booking Contract</h3>
            <p className="text-xs text-white/40 mt-1">Download the terms and financial details for this booking.</p>
          </div>
          <button
            onClick={handleDownloadContract}
            className="px-4 py-2.5 bg-[#c39bff]/20 text-[#c39bff] rounded-lg text-sm font-medium hover:bg-[#c39bff]/30 transition-colors flex items-center gap-2 border border-[#c39bff]/30"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="glass-card rounded-xl p-6 space-y-4 border border-white/10 relative z-10">
        {canNegotiate && (
          <form onSubmit={handleCounterOffer} className="space-y-3 pb-4 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white">Submit Counter-Offer</h3>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">₹</span>
                <input
                  type="number"
                  value={counterAmount}
                  onChange={(e) => setCounterAmount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-6 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[#c39bff] transition-all"
                  required
                />
              </div>
              <button type="submit" disabled={submitting} className="px-4 py-2.5 bg-gradient-to-r from-[#c39bff] to-[#8A2BE2] text-white rounded-lg text-sm font-semibold hover:shadow-[0_0_20px_rgba(195,155,255,0.3)] disabled:opacity-50 transition-all flex items-center gap-2">
                <Send className="w-4 h-4" />
                {submitting ? 'Sending...' : 'Send Offer'}
              </button>
            </div>
            <input
              value={counterNotes}
              onChange={(e) => setCounterNotes(e.target.value)}
              placeholder="Add any notes (optional)"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[#c39bff] transition-all"
            />
          </form>
        )}

        <div className="flex gap-3 flex-col sm:flex-row">
          {canConfirm && (
            <button onClick={handleConfirm} disabled={submitting} className="flex-1 py-2.5 bg-gradient-to-r from-[#4ade80] to-emerald-500 text-white rounded-lg text-sm font-semibold hover:shadow-[0_0_20px_rgba(74,222,128,0.3)] disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Confirm Booking
            </button>
          )}
          {canCancel && (
            <button onClick={handleCancelClick} disabled={submitting} className="py-2.5 px-4 bg-[#ff6e84]/20 border border-[#ff6e84]/30 text-[#ff6e84] rounded-lg text-sm font-semibold hover:bg-[#ff6e84]/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              <XCircle className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Review Form for completed bookings */}
      {canReview && !reviewSubmitted && (
        <div className="glass-card rounded-xl p-6 border border-white/10 relative z-10">
          <h2 className="text-sm font-semibold text-[#c39bff] uppercase tracking-wide mb-4 font-display">Leave a Review</h2>
          <ReviewForm
            bookingId={id}
            onSubmitSuccess={() => setReviewSubmitted(true)}
          />
        </div>
      )}

      {reviewSubmitted && (
        <div className="glass-card rounded-xl p-6 text-center border border-[#4ade80]/30 bg-gradient-to-r from-[#4ade80]/10 to-emerald-500/10 relative z-10">
          <CheckCircle className="w-8 h-8 text-[#4ade80] mx-auto mb-2" />
          <p className="text-[#4ade80] font-medium">Thank you! Your review has been submitted.</p>
        </div>
      )}

      {/* Cancellation Modal */}
      {showCancellationModal && booking && (
        <CancellationModal
          bookingId={id}
          eventDate={booking.event_date}
          onClose={() => setShowCancellationModal(false)}
          onCancelled={() => {
            setShowCancellationModal(false);
            loadBooking();
          }}
          cancellationType="BY_CLIENT"
        />
      )}
    </div>
  );
}
