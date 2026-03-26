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
      {/* ─── Bento Hero ─── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[#a1faff] font-bold text-xs tracking-widest uppercase mb-2 block">Revenue</span>
                <h1 className="text-3xl font-display font-extrabold tracking-tighter text-white">Earnings</h1>
              </div>
              <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                {(['current', '1m', '3m', '6m'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                      period === p
                        ? 'bg-[#c39bff]/20 text-[#c39bff] font-medium'
                        : 'text-white/40 hover:text-white'
                    }`}
                  >
                    {p === 'current' ? 'This Month' : p === '1m' ? 'Last Month' : p === '3m' ? '3 Months' : '6 Months'}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div className="bg-white/5 p-4 rounded-lg">
                <p className="text-[10px] text-white/40 uppercase font-bold mb-1">Gross</p>
                <p className="text-lg font-bold text-white">₹{formatINR(summary?.gross_total ?? null)}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-lg">
                <p className="text-[10px] text-white/40 uppercase font-bold mb-1">TDS</p>
                <p className="text-lg font-bold text-red-400">-₹{formatINR(summary?.total_tds ?? null)}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-lg">
                <p className="text-[10px] text-white/40 uppercase font-bold mb-1">Platform Fee</p>
                <p className="text-lg font-bold text-white/40">-₹{formatINR(summary?.total_platform_fee ?? null)}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-lg border border-green-400/20">
                <p className="text-[10px] text-green-400 uppercase font-bold mb-1">Net Payout</p>
                <p className="text-lg font-bold text-green-400">₹{formatINR(summary?.net_total ?? null)}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="md:col-span-4 glass-card rounded-xl p-6 border border-white/5 border-l-4 border-l-green-400 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/40 mb-6">Summary</h3>
            <div className="space-y-4">
              <div>
                <p className="text-3xl font-extrabold text-white">₹{formatINR(summary?.net_total ?? null)}</p>
                <p className="text-xs text-white/40">Net earnings this period</p>
              </div>
              <div className="pt-4 border-t border-white/5">
                <p className="text-xl font-bold text-[#a1faff]">{summary?.transaction_count ?? 0}</p>
                <p className="text-xs text-white/40">Settled transactions</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-white">Payment History</h2>
          <span className="text-xs text-white/40">{summary?.transaction_count ?? 0} transactions</span>
        </div>
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-nocturne-text-tertiary">No transactions yet</div>
        ) : (
          <div className="divide-y divide-nocturne-border-subtle">
            {transactions.map((txn) => (
              <div key={txn.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-nocturne-text-primary">{txn.event_type}</p>
                  <p className="text-sm text-nocturne-text-tertiary">
                    {txn.event_city} &middot; {new Date(txn.event_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <div>
                    <p className="font-medium text-nocturne-text-primary">₹{formatINR(txn.artist_payout_paise)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      txn.status === 'settled' ? 'bg-nocturne-success/15 text-nocturne-success' :
                      txn.status === 'captured' ? 'bg-nocturne-info/15 text-nocturne-info' :
                      txn.status === 'refund_initiated' ? 'bg-nocturne-warning/15 text-nocturne-warning' :
                      'bg-nocturne-surface-2 text-nocturne-text-secondary'
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
