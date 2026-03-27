'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CreditCard, Smartphone, Building2, Wallet, Check, X } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-display font-bold text-gradient">Complete Payment</h1>
          <p className="text-nocturne-text-secondary">Secure transaction powered by Razorpay</p>
        </div>

        {status === 'success' && (
          <div className="glass-card border border-white/10 p-8 text-center space-y-4 animate-fade-in-up">
            <div className="flex justify-center">
              <div className="relative w-16 h-16 bg-gradient-nocturne rounded-full flex items-center justify-center shadow-nocturne-glow-sm">
                <Check className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-gradient mb-2">Payment Successful!</h2>
              <p className="text-nocturne-text-secondary">Your booking has been confirmed. Redirecting...</p>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="glass-card border border-white/10 p-8 text-center space-y-4 animate-fade-in-up">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/30">
                <X className="w-8 h-8 text-red-400" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-red-300 mb-2">Payment Failed</h2>
              <p className="text-sm text-red-200 mb-4">{error}</p>
            </div>
            <button
              onClick={createOrder}
              className="w-full bg-gradient-nocturne hover-glow text-white px-6 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105"
            >
              Try Again
            </button>
          </div>
        )}

        {(status === 'idle' || status === 'loading') && (
          <div className="glass-card border border-white/10 p-8 space-y-6 animate-fade-in-up">
            {order && (
              <div className="text-center space-y-2 py-4">
                <p className="text-nocturne-text-secondary text-sm uppercase tracking-wide">Amount to Pay</p>
                <p className="text-5xl font-display font-bold text-gradient">₹{formatINR(order.amount_paise)}</p>
              </div>
            )}

            <div className="bg-nocturne-surface-2/50 backdrop-blur-md rounded-lg p-4 border border-white/10 space-y-3">
              <h3 className="text-sm font-semibold text-nocturne-text-primary">Payment Methods Accepted</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-nocturne-text-secondary">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-xs">Credit/Debit Cards</span>
                </div>
                <div className="flex items-center gap-2 text-nocturne-text-secondary">
                  <Smartphone className="w-4 h-4" />
                  <span className="text-xs">UPI & Mobile Wallets</span>
                </div>
                <div className="flex items-center gap-2 text-nocturne-text-secondary">
                  <Building2 className="w-4 h-4" />
                  <span className="text-xs">Net Banking</span>
                </div>
                <div className="flex items-center gap-2 text-nocturne-text-secondary">
                  <Wallet className="w-4 h-4" />
                  <span className="text-xs">Digital Wallets</span>
                </div>
              </div>
            </div>

            <button
              onClick={createOrder}
              disabled={status === 'loading'}
              className="w-full bg-gradient-nocturne hover-glow text-white py-4 rounded-full font-display font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
            >
              {status === 'loading' ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Creating Order...</span>
                </>
              ) : (
                'Pay Now'
              )}
            </button>

            <p className="text-center text-xs text-nocturne-text-secondary">Secure payment powered by Razorpay. Your data is encrypted.</p>
          </div>
        )}

        {status === 'verifying' && (
          <div className="glass-card border border-white/10 p-8 text-center space-y-4 animate-fade-in-up">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-500/20 border-t-primary-500" />
            </div>
            <p className="text-nocturne-text-primary font-medium">Verifying your payment...</p>
          </div>
        )}

        {status === 'checkout' && (
          <div className="glass-card border border-white/10 p-8 text-center space-y-4 animate-fade-in-up">
            <div className="flex justify-center">
              <div className="shimmer-overlay w-12 h-12 rounded-full" />
            </div>
            <p className="text-nocturne-text-primary font-medium">Complete the payment in the Razorpay window...</p>
          </div>
        )}
      </div>
    </div>
  );
}
