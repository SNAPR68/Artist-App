'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '../../../../../../lib/api-client';
import { Download, Check, AlertCircle, Home, FileText } from 'lucide-react';

interface BookingDetails {
  id: string;
  artist_id: string;
  artist_name?: string;
  event_date: string;
  event_type?: string;
}

interface PaymentConfirmation {
  payment_id: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  booking_id: string;
  amount_paise: number;
  currency: string;
  payment_method?: string;
  status: string;
  confirmed_at: string;
  invoice_url?: string;
}

function formatINR(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function PaymentConfirmationPage() {
  const { id: bookingId } = useParams<{ id: string }>();
  const router = useRouter();
  const [confirmation, setConfirmation] = useState<PaymentConfirmation | null>(null);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [downloadingContract, setDownloadingContract] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [paymentRes, bookingRes] = await Promise.all([
        apiClient<PaymentConfirmation>(`/v1/payments/booking/${bookingId}`),
        apiClient<BookingDetails>(`/v1/bookings/${bookingId}`),
      ]);

      if (paymentRes.success) {
        setConfirmation(paymentRes.data);
      } else {
        setError('Payment details not found');
      }

      if (bookingRes.success) {
        setBooking(bookingRes.data);
      }
    } catch {
      setError('Failed to load confirmation details');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDownloadInvoice = async () => {
    if (!confirmation) return;
    setDownloadingInvoice(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const res = await fetch(`${apiBase}/v1/payments/invoice/${confirmation.payment_id}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${confirmation.payment_id.slice(0, 8)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to download invoice', err);
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const handleDownloadContract = async () => {
    if (!bookingId) return;
    setDownloadingContract(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const res = await fetch(`${apiBase}/v1/payments/contract/${bookingId}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contract-${bookingId.slice(0, 8)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to download contract', err);
    } finally {
      setDownloadingContract(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c39bff]" />
      </div>
    );
  }

  if (error || !confirmation) {
    return (
      <div className="max-w-md mx-auto py-10">
        <div className="glass-card bg-gradient-to-br from-[#ff6e84]/10 to-transparent p-8 text-center space-y-3 border border-[#ff6e84]/30 rounded-xl">
          <div className="flex justify-center">
            <div className="rounded-full p-3 bg-[#ff6e84]/20">
              <AlertCircle className="text-[#ff6e84]" size={32} />
            </div>
          </div>
          <h2 className="text-lg font-semibold text-white">Error</h2>
          <p className="text-sm text-white/60">{error}</p>
          <button
            onClick={() => router.push(`/client/bookings/${bookingId}`)}
            className="mt-4 w-full px-4 py-2 bg-gradient-to-br from-[#c39bff] to-[#8A2BE2] hover:shadow-[0_0_20px_rgba(195,155,255,0.3)] text-white rounded-lg font-medium transition-all duration-300"
          >
            Back to Booking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 relative overflow-hidden bg-[#1a191b]">
      {/* Ambient glows */}
      <div className="absolute -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-40 -left-20 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-2xl mx-auto space-y-6 relative z-10">
        {/* Success Checkmark Animation */}
        <div className="flex justify-center mb-2">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-[#c39bff] to-[#8A2BE2] rounded-full opacity-20 animate-pulse" />
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#c39bff] to-[#8A2BE2] flex items-center justify-center shadow-[0_0_20px_rgba(195,155,255,0.3)]">
              <Check className="text-white" size={32} strokeWidth={3} />
            </div>
          </div>
        </div>

        {/* Success Header */}
        <div className="text-center space-y-2 animate-fade-in-up">
          <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tighter text-white">Booking Confirmed!</h1>
          <p className="text-white/60 text-lg">Your booking has been confirmed and payment received</p>
        </div>

        {/* Booking Summary Card */}
        {booking && (
          <div className="glass-card p-6 space-y-4 animate-fade-in-up border border-white/10 rounded-xl">
            <h2 className="text-lg font-display font-semibold text-white">Booking Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-white/40 text-sm font-medium">Booking ID</p>
                <p className="text-white font-display font-semibold truncate">{booking.id.slice(0, 12)}...</p>
              </div>
              {booking.artist_name && (
                <div className="space-y-1">
                  <p className="text-white/40 text-sm font-medium">Artist</p>
                  <p className="text-white font-display font-semibold">{booking.artist_name}</p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-white/40 text-sm font-medium">Event Date</p>
                <p className="text-white font-display font-semibold">{formatDate(booking.event_date)}</p>
              </div>
              {booking.event_type && (
                <div className="space-y-1">
                  <p className="text-white/40 text-sm font-medium">Event Type</p>
                  <p className="text-white font-display font-semibold capitalize">{booking.event_type}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment Details Card */}
        <div className="glass-card p-6 space-y-4 animate-fade-in-up border border-white/10 rounded-xl">
          <h2 className="text-lg font-display font-semibold text-white">Payment Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-white/40 text-sm font-medium">Amount Paid</p>
              <p className="text-2xl font-display font-extrabold text-[#c39bff]">₹{formatINR(confirmation.amount_paise)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-white/40 text-sm font-medium">Payment Method</p>
              <p className="text-white font-display font-semibold capitalize">
                {confirmation.payment_method || 'Card'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-white/40 text-sm font-medium">Payment Status</p>
              <span className="inline-block px-3 py-1 rounded-full bg-[#c39bff]/20 border border-[#c39bff]/30 text-[#a1faff] text-xs font-semibold">
                {confirmation.status.toUpperCase()}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-white/40 text-sm font-medium">Date & Time</p>
              <p className="text-white/60 text-sm">{new Date(confirmation.confirmed_at).toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Documents Download Section */}
        <div className="glass-card p-6 space-y-3 animate-fade-in-up border border-white/10 rounded-xl">
          <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
            <FileText size={20} className="text-[#a1faff]" />
            Download Documents
          </h2>

          <button
            onClick={handleDownloadInvoice}
            disabled={downloadingInvoice}
            className="w-full flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3">
              <Download size={20} className="text-[#a1faff]" />
              <div className="text-left">
                <p className="font-display font-semibold text-white">Invoice</p>
                <p className="text-xs text-white/40">PDF receipt and tax invoice</p>
              </div>
            </div>
            {downloadingInvoice ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#a1faff]" />
            ) : (
              <div className="text-white/40 text-xs font-medium">Download</div>
            )}
          </button>

          <button
            onClick={handleDownloadContract}
            disabled={downloadingContract}
            className="w-full flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3">
              <Download size={20} className="text-[#a1faff]" />
              <div className="text-left">
                <p className="font-display font-semibold text-white">Contract</p>
                <p className="text-xs text-white/40">Booking terms and conditions</p>
              </div>
            </div>
            {downloadingContract ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#a1faff]" />
            ) : (
              <div className="text-white/40 text-xs font-medium">Download</div>
            )}
          </button>
        </div>

        {/* Next Steps */}
        <div className="glass-card bg-gradient-to-br from-[#c39bff]/10 to-transparent p-6 space-y-3 animate-fade-in-up border border-white/10 rounded-xl">
          <h2 className="text-lg font-display font-semibold text-white">What&apos;s Next?</h2>
          <ul className="space-y-2 text-sm text-white/60">
            <li className="flex gap-3">
              <span className="text-[#a1faff] font-bold">1</span>
              <span>Check your email for payment confirmation and invoice</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#a1faff] font-bold">2</span>
              <span>Review the booking contract for event details and terms</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#a1faff] font-bold">3</span>
              <span>The artist will contact you closer to the event date</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#a1faff] font-bold">4</span>
              <span>Save your payment receipt and contract for records</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 animate-fade-in-up">
          <button
            onClick={() => router.push(`/client/bookings/${bookingId}`)}
            className="flex items-center justify-center gap-2 py-3 bg-gradient-to-br from-[#c39bff] to-[#8A2BE2] hover:shadow-[0_0_20px_rgba(195,155,255,0.3)] text-white rounded-lg font-display font-semibold transition-all duration-300"
          >
            <FileText size={18} />
            View Booking
          </button>
          <button
            onClick={() => router.push('/client')}
            className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 text-white rounded-lg font-display font-semibold transition-all duration-300 hover:bg-white/10"
          >
            <Home size={18} />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
