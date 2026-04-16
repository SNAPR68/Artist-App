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
    Razorpay: new (options: Record<string, unknown>) => { open: () => void; on?: (event: string, handler: (response: Record<string, unknown>) => void) => void };
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
        color: '#c39bff',
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
    <div className="min-h-screen bg-[#1a191b] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-40 -left-20 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md space-y-6 animate-fade-in relative z-10">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-display font-extrabold tracking-tighter text-white">Complete Payment</h1>
          <p className="text-white/60">Secure transaction powered by Razorpay</p>
        </div>

        {status === 'success' && (
          <div className="glass-card border border-white/10 p-8 text-center space-y-4 animate-fade-in-up">
            <div className="flex justify-center">
              <div className="relative w-16 h-16 bg-gradient-to-br from-[#c39bff] to-[#8A2BE2] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(195,155,255,0.3)]">
                <Check className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-display font-extrabold text-white mb-2">Payment Successful!</h2>
              <p className="text-white/60">Your booking has been confirmed. Redirecting...</p>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="glass-card border border-white/10 p-8 text-center space-y-4 animate-fade-in-up">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-[#ff6e84]/20 rounded-full flex items-center justify-center border border-[#ff6e84]/30">
                <X className="w-8 h-8 text-[#ff6e84]" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-display font-extrabold text-[#ff6e84] mb-2">Payment Failed</h2>
              <p className="text-sm text-[#ff6e84]/80 mb-4">{error}</p>
            </div>
            <button
              onClick={createOrder}
              className="w-full bg-gradient-to-br from-[#c39bff] to-[#8A2BE2] hover:shadow-[0_0_20px_rgba(195,155,255,0.3)] text-white px-6 py-3 rounded-full font-display font-semibold transition-all duration-300 transform hover:scale-105"
            >
              Try Again
            </button>
          </div>
        )}

        {(status === 'idle' || status === 'loading') && (
          <div className="glass-card border border-white/10 p-8 space-y-6 animate-fade-in-up">
            {order && (
              <div className="text-center space-y-2 py-4">
                <p className="text-white/40 text-sm uppercase tracking-widest">Amount to Pay</p>
                <p className="text-5xl font-display font-extrabold text-[#c39bff]">₹{formatINR(order.amount_paise)}</p>
              </div>
            )}

            <div className="bg-white/5 backdrop-blur-md rounded-lg p-4 border border-white/10 space-y-3">
              <h3 className="text-sm font-semibold text-white">Payment Methods Accepted</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-white/60">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-xs">Credit/Debit Cards</span>
                </div>
                <div className="flex items-center gap-2 text-white/60">
                  <Smartphone className="w-4 h-4" />
                  <span className="text-xs">UPI & Mobile Wallets</span>
                </div>
                <div className="flex items-center gap-2 text-white/60">
                  <Building2 className="w-4 h-4" />
                  <span className="text-xs">Net Banking</span>
                </div>
                <div className="flex items-center gap-2 text-white/60">
                  <Wallet className="w-4 h-4" />
                  <span className="text-xs">Digital Wallets</span>
                </div>
              </div>
            </div>

            <button
              onClick={createOrder}
              disabled={status === 'loading'}
              className="w-full bg-gradient-to-br from-[#c39bff] to-[#8A2BE2] hover:shadow-[0_0_20px_rgba(195,155,255,0.3)] text-white py-4 rounded-full font-display font-extrabold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
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

            <p className="text-center text-xs text-white/40">Secure payment powered by Razorpay. Your data is encrypted.</p>
          </div>
        )}

        {status === 'verifying' && (
          <div className="glass-card border border-white/10 p-8 text-center space-y-4 animate-fade-in-up">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#c39bff]/20 border-t-[#c39bff]" />
            </div>
            <p className="text-white font-medium">Verifying your payment...</p>
          </div>
        )}

        {status === 'checkout' && (
          <div className="glass-card border border-white/10 p-8 text-center space-y-4 animate-fade-in-up">
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-gradient-to-br from-[#c39bff]/20 to-[#8A2BE2]/20 rounded-full animate-pulse" />
            </div>
            <p className="text-white font-medium">Complete the payment in the Razorpay window...</p>
          </div>
        )}
      </div>
    </div>
  );
}
