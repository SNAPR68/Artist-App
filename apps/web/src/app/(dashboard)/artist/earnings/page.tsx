'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '../../../../lib/api-client';

interface EarningsSummary {
  gross_total: number | null;
  total_tds: number | null;
  total_platform_fee: number | null;
  net_total: number | null;
  transaction_count: number | null;
}

interface PaymentRecord {
  id: string;
  booking_id: string;
  amount_paise: number;
  artist_payout_paise: number;
  tds_paise: number;
  platform_fee_paise: number;
  status: string;
  created_at: string;
  event_type: string;
  event_date: string;
  event_city: string;
}

function formatINR(paise: number | null): string {
  if (!paise) return '0.00';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

function getMonthRange(monthsBack: number): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const end = monthsBack === 0 ? now : new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 0);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default function EarningsPage() {
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [transactions, setTransactions] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'current' | '1m' | '3m' | '6m'>('6m');

  useEffect(() => {
    setLoading(true);
    const monthsBack = period === 'current' ? 0 : period === '1m' ? 1 : period === '3m' ? 3 : 6;
    const { start, end } = getMonthRange(monthsBack);

    Promise.all([
      apiClient<EarningsSummary>(`/v1/payments/earnings?start_date=${start}&end_date=${end}`),
      apiClient<PaymentRecord[]>('/v1/payments/history?role=artist'),
    ])
      .then(([earningsRes, historyRes]) => {
        if (earningsRes.success) setSummary(earningsRes.data);
        if (historyRes.success) setTransactions(historyRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['current', '1m', '3m', '6m'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                period === p
                  ? 'bg-white text-primary-600 font-medium shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {p === 'current' ? 'This Month' : p === '1m' ? 'Last Month' : p === '3m' ? '3 Months' : '6 Months'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Gross Earnings</p>
          <p className="text-xl font-bold text-gray-900">₹{formatINR(summary?.gross_total ?? null)}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-500">TDS Deducted</p>
          <p className="text-xl font-bold text-red-600">-₹{formatINR(summary?.total_tds ?? null)}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Platform Fee</p>
          <p className="text-xl font-bold text-gray-500">-₹{formatINR(summary?.total_platform_fee ?? null)}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-sm text-green-700">Net Payout</p>
          <p className="text-xl font-bold text-green-700">₹{formatINR(summary?.net_total ?? null)}</p>
        </div>
      </div>

      {/* Transaction Count */}
      <div className="text-sm text-gray-500">
        {summary?.transaction_count ?? 0} settled transaction{(summary?.transaction_count ?? 0) !== 1 ? 's' : ''} in this period
      </div>

      {/* Transaction List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
        </div>
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No transactions yet</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map((txn) => (
              <div key={txn.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{txn.event_type}</p>
                  <p className="text-sm text-gray-500">
                    {txn.event_city} &middot; {new Date(txn.event_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <div>
                    <p className="font-medium text-gray-900">₹{formatINR(txn.artist_payout_paise)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      txn.status === 'settled' ? 'bg-green-100 text-green-700' :
                      txn.status === 'captured' ? 'bg-blue-100 text-blue-700' :
                      txn.status === 'refund_initiated' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {txn.status}
                    </span>
                  </div>
                  {txn.status === 'settled' && (
                    <button
                      onClick={async () => {
                        const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
                        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
                        const res = await fetch(`${apiBase}/v1/payments/invoice/${txn.id}/pdf`, {
                          headers: token ? { Authorization: `Bearer ${token}` } : {},
                        });
                        if (res.ok) {
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `invoice-${txn.id.slice(0, 8)}.pdf`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }
                      }}
                      className="text-xs text-primary-500 hover:text-primary-600"
                      title="Download Invoice"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
