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
  const baseClasses = 'inline-block px-2.5 py-1 rounded-full text-xs font-semibold';
  switch (status.toLowerCase()) {
    case 'completed':
    case 'success':
      return `${baseClasses} bg-nocturne-success/15 text-nocturne-success`;
    case 'pending':
      return `${baseClasses} bg-nocturne-warning/15 text-nocturne-warning`;
    case 'failed':
      return `${baseClasses} bg-nocturne-error/15 text-nocturne-error`;
    default:
      return `${baseClasses} bg-nocturne-surface-2 text-nocturne-text-secondary`;
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-nocturne-text-primary">Payment History</h1>
        <p className="text-nocturne-text-secondary mt-1">View and manage all your booking payments</p>
      </div>

      {payments.length === 0 ? (
        <div className="bg-nocturne-surface rounded-lg border border-nocturne-border-subtle p-12 text-center">
          <p className="text-nocturne-text-tertiary">No payments yet</p>
          <p className="text-sm text-nocturne-text-tertiary mt-1">Your payment history will appear here</p>
        </div>
      ) : (
        <div className="bg-nocturne-surface rounded-lg border border-nocturne-border-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-nocturne-surface-2 border-b border-nocturne-border-subtle">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-nocturne-text-secondary uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-nocturne-text-secondary uppercase">Artist</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-nocturne-text-secondary uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-nocturne-text-secondary uppercase">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-nocturne-text-secondary uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-nocturne-text-secondary uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-nocturne-border-subtle hover:bg-nocturne-glass-panel transition-colors">
                    <td className="px-6 py-4 text-sm text-nocturne-text-primary">
                      {new Date(payment.confirmed_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-sm text-nocturne-text-primary">{payment.artist_name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-nocturne-text-primary">
                      ₹{formatINR(payment.amount_paise)}
                    </td>
                    <td className="px-6 py-4 text-sm text-nocturne-text-secondary capitalize">
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
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-nocturne-accent hover:bg-nocturne-glass-panel rounded-lg transition-colors"
                        title="View booking details"
                      >
                        <Eye size={14} />
                        View
                      </button>
                      <button
                        onClick={() => handleDownloadInvoice(payment.id)}
                        disabled={downloading === payment.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-nocturne-accent hover:bg-nocturne-glass-panel rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Download invoice"
                      >
                        {downloading === payment.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-600" />
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
