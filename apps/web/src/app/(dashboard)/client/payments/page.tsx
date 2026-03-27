'use client';

import { useEffect, useState } from 'react';
import { Download, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';

interface PaymentRecord {
  id: string;
  booking_id: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  amount_paise: number;
  currency: string;
  payment_method?: string;
  status: string;
  confirmed_at: string;
  artist_name?: string;
}

function formatINR(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

function getStatusBadge(status: string) {
  const baseClasses = 'inline-block px-2.5 py-1 rounded-full text-xs font-semibold border';
  switch (status.toLowerCase()) {
    case 'completed':
    case 'success':
      return `${baseClasses} bg-[#4ade80]/20 text-[#4ade80] border-[#4ade80]/30`;
    case 'pending':
      return `${baseClasses} bg-[#ffbf00]/20 text-[#ffbf00] border-[#ffbf00]/30`;
    case 'failed':
      return `${baseClasses} bg-[#ff6e84]/20 text-[#ff6e84] border-[#ff6e84]/30`;
    default:
      return `${baseClasses} bg-white/10 text-white/60 border-white/10`;
  }
}

export default function PaymentHistoryPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const res = await apiClient<PaymentRecord[]>('/v1/payments/history');
      if (res.success) {
        setPayments(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load payments', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (paymentId: string) => {
    setDownloading(paymentId);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const res = await fetch(`${apiBase}/v1/payments/invoice/${paymentId}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${paymentId.slice(0, 8)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to download invoice', err);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c39bff]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      {/* Ambient glows */}
      <div className="absolute -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-40 -left-20 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10">
        <div className="glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden animate-fade-in-up">
          <div className="absolute -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tighter text-white">Payment History</h1>
          </div>
        </div>
        <p className="text-white/40 mt-1">View and manage all your booking payments</p>
      </div>

      {payments.length === 0 ? (
        <div className="glass-card rounded-xl border border-white/5 p-12 text-center relative z-10">
          <p className="text-white/40">No payments yet</p>
          <p className="text-sm text-white/40 mt-1">Your payment history will appear here</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-white/5 overflow-hidden relative z-10">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/5 border-b border-white/5">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-widest">Artist</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-widest">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-white/60 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-sm text-white">
                      {new Date(payment.confirmed_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-sm text-white">{payment.artist_name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-white">
                      ₹{formatINR(payment.amount_paise)}
                    </td>
                    <td className="px-6 py-4 text-sm text-white/60 capitalize">
                      {payment.payment_method || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={getStatusBadge(payment.status)}>
                        {payment.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 flex items-center justify-end">
                      <button
                        onClick={() => router.push(`/client/bookings/${payment.booking_id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#a1faff] hover:bg-white/10 rounded-lg transition-colors"
                        title="View booking details"
                      >
                        <Eye size={14} />
                        View
                      </button>
                      <button
                        onClick={() => handleDownloadInvoice(payment.id)}
                        disabled={downloading === payment.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#a1faff] hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Download invoice"
                      >
                        {downloading === payment.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#c39bff]" />
                        ) : (
                          <Download size={14} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
