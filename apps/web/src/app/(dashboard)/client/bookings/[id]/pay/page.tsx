'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '../../../../../../lib/api-client';

interface OrderData {
  payment_id: string;
  razorpay_order_id: string;
  amount_paise: number;
  currency: string;
  key_id: string;
}

type PaymentStatus = 'idle' | 'loading' | 'checkout' | 'verifying' | 'success' | 'failed';

declare global {
  interface Window {
    Razorpay: any;
  }
}

function formatINR(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export default function PaymentPage() {
  const { id: bookingId } = useParams<{ id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [order, setOrder] = useState<OrderData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load Razorpay script
  useEffect(() => {
    if (document.getElementById('razorpay-sdk')) return;
    const script = document.createElement('script');
    script.id = 'razorpay-sdk';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  async function createOrder() {
    setStatus('loading');
    setError(null);
    try {
      const res = await apiClient<OrderData>('/v1/payments/orders', {
        method: 'POST',
        body: JSON.stringify({ booking_id: bookingId }),
      });
      if (!res.success) {
        setError(res.errors?.[0]?.message ?? 'Failed to create order');
        setStatus('failed');
        return;
      }
      setOrder(res.data);
      openCheckout(res.data);
    } catch {
      setError('Network error. Please try again.');
      setStatus('failed');
    }
  }

  function openCheckout(orderData: OrderData) {
    setStatus('checkout');

    if (!window.Razorpay) {
      setError('Payment SDK not loaded. Please refresh and try again.');
      setStatus('failed');
      return;
    }

    const rzp = new window.Razorpay({
      key: orderData.key_id,
      amount: orderData.amount_paise,
      currency: orderData.currency,
      name: 'ArtistBooking',
      description: `Booking Payment`,
      order_id: orderData.razorpay_order_id,
      handler: async function (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) {
        await verifyPayment(response);
      },
      modal: {
        ondismiss: () => setStatus('idle'),
      },
      theme: {
        color: '#1A56DB',
      },
    });

    rzp.open();
  }

  async function verifyPayment(params: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) {
    setStatus('verifying');
    try {
      const res = await apiClient('/v1/payments/verify', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      if (res.success) {
        setStatus('success');
        setTimeout(() => router.push(`/client/bookings/${bookingId}/confirmation`), 2000);
      } else {
        setError('Payment verification failed. Contact support if amount was deducted.');
        setStatus('failed');
      }
    } catch {
      setError('Verification failed. Contact support if amount was deducted.');
      setStatus('failed');
    }
  }

  return (
    <div className="max-w-md mx-auto py-10 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 text-center">Complete Payment</h1>

      {status === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-3">✓</div>
          <h2 className="text-lg font-semibold text-green-800">Payment Successful!</h2>
          <p className="text-sm text-green-600 mt-1">Your booking has been confirmed. Redirecting...</p>
        </div>
      )}

      {status === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800">Payment Failed</h2>
          <p className="text-sm text-red-600 mt-1">{error}</p>
          <button
            onClick={createOrder}
            className="mt-4 bg-primary-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {(status === 'idle' || status === 'loading') && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          {order && (
            <div className="text-center">
              <p className="text-sm text-gray-500">Amount to Pay</p>
              <p className="text-3xl font-bold text-gray-900">₹{formatINR(order.amount_paise)}</p>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-2">
            <p>Secure payment powered by Razorpay</p>
            <p>Supports UPI, cards, net banking, and wallets</p>
          </div>

          <button
            onClick={createOrder}
            disabled={status === 'loading'}
            className="w-full bg-primary-500 text-white py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Creating Order...
              </span>
            ) : (
              'Pay Now'
            )}
          </button>
        </div>
      )}

      {status === 'verifying' && (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4" />
          <p className="text-gray-600">Verifying your payment...</p>
        </div>
      )}

      {status === 'checkout' && (
        <div className="text-center py-10">
          <p className="text-gray-600">Complete the payment in the Razorpay window...</p>
        </div>
      )}
    </div>
  );
}
