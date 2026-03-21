'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '../../../../../../lib/api-client';
import { Download, Check, AlertCircle } from 'lucide-react';

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

export default function PaymentConfirmationPage() {
  const { id: bookingId } = useParams<{ id: string }>();
  const router = useRouter();
  const [confirmation, setConfirmation] = useState<PaymentConfirmation | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [downloadingContract, setDownloadingContract] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConfirmation();
  }, [bookingId]);

  const loadConfirmation = async () => {
    try {
      // Try to load the most recent payment for this booking
      const res = await apiClient<PaymentConfirmation>(`/v1/payments/booking/${bookingId}`);
      if (res.success) {
        setConfirmation(res.data);
      } else {
        setError('Payment details not found');
      }
    } catch (err) {
      setError('Failed to load payment confirmation');
    } finally {
      setLoading(false);
    }
  };

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
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (error || !confirmation) {
    return (
      <div className="max-w-md mx-auto py-10">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center space-y-2">
          <AlertCircle className="mx-auto text-red-500" size={32} />
          <h2 className="text-lg font-semibold text-red-800">Error</h2>
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => router.push(`/client/bookings/${bookingId}`)}
            className="mt-4 w-full px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
          >
            Back to Booking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10 space-y-6">
      {/* Success Banner */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center space-y-3">
        <div className="flex justify-center">
          <div className="bg-green-100 rounded-full p-3">
            <Check className="text-green-600" size={24} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-green-800">Payment Successful!</h1>
        <p className="text-sm text-green-700">Your booking has been confirmed and payment received.</p>
      </div>

      {/* Payment Details Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Payment Details</h2>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Payment ID</p>
            <p className="font-medium text-gray-900 break-all">{confirmation.payment_id}</p>
          </div>
          <div>
            <p className="text-gray-500">Razorpay Payment ID</p>
            <p className="font-medium text-gray-900">{confirmation.razorpay_payment_id.slice(0, 12)}...</p>
          </div>
          <div>
            <p className="text-gray-500">Amount Paid</p>
            <p className="text-xl font-bold text-green-600">₹{formatINR(confirmation.amount_paise)}</p>
          </div>
          <div>
            <p className="text-gray-500">Payment Method</p>
            <p className="font-medium text-gray-900 capitalize">{confirmation.payment_method || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-gray-500">Status</p>
            <p className="font-medium">
              <span className="inline-block px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                {confirmation.status.toUpperCase()}
              </span>
            </p>
          </div>
          <div>
            <p className="text-gray-500">Date & Time</p>
            <p className="font-medium text-gray-900">
              {new Date(confirmation.confirmed_at).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      {/* Downloads Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Documents</h2>

        <button
          onClick={handleDownloadInvoice}
          disabled={downloadingInvoice}
          className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-3">
            <Download size={20} className="text-primary-500" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Invoice</p>
              <p className="text-xs text-gray-500">PDF receipt and tax invoice</p>
            </div>
          </div>
          {downloadingInvoice && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500" />}
        </button>

        <button
          onClick={handleDownloadContract}
          disabled={downloadingContract}
          className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-3">
            <Download size={20} className="text-primary-500" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Contract</p>
              <p className="text-xs text-gray-500">Booking terms and conditions</p>
            </div>
          </div>
          {downloadingContract && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500" />}
        </button>
      </div>

      {/* Next Steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-3">
        <h2 className="text-lg font-semibold text-blue-900">What's Next?</h2>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex gap-2">
            <span className="font-bold">•</span>
            <span>Check your email for payment confirmation and invoice</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">•</span>
            <span>Review the booking contract for event details and terms</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">•</span>
            <span>The artist will contact you closer to the event date</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">•</span>
            <span>Save your payment receipt and contract for records</span>
          </li>
        </ul>
      </div>

      {/* Action Button */}
      <button
        onClick={() => router.push(`/client/bookings/${bookingId}`)}
        className="w-full py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
      >
        Back to Booking
      </button>
    </div>
  );
}
