'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sparkles, Check, X, CreditCard, Zap, Crown } from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

type PlanKey = 'free' | 'pro' | 'enterprise';

interface Subscription {
  id: string;
  plan: 'pro' | 'enterprise';
  status: string;
  razorpay_subscription_id: string | null;
  amount_paise: number;
  current_start: string | null;
  current_end: string | null;
  cancel_at_cycle_end: boolean;
  paid_count: number;
  remaining_count: number | null;
}

interface StatusData {
  plan: PlanKey;
  name: string;
  briefs_per_month: number;
  briefs_used?: number;
  features: string[];
  trial_ends_at: string | null;
  subscription: Subscription | null;
}

interface InvoiceRow {
  id: string;
  amount_paise: number;
  status: string;
  billing_start: string | null;
  billing_end: string | null;
  paid_at: string | null;
  invoice_pdf_url: string | null;
}

const rupees = (p: number) => '₹' + (p / 100).toLocaleString('en-IN');
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const PLAN_CARDS: Array<{
  key: PlanKey; name: string; price: string; tagline: string; features: string[]; accent: string; icon: React.ElementType;
}> = [
  {
    key: 'free',
    name: 'Free',
    price: '₹0',
    tagline: 'Try the decision engine',
    features: ['5 briefs/month', 'Basic recommendations', 'Solo only'],
    accent: 'white/20',
    icon: Sparkles,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '₹15,000',
    tagline: 'Everything to run an agency',
    features: [
      'Unlimited briefs', 'Branded proposals', 'Deal pipeline + vault',
      'Team collaboration', 'GST invoices + Tally export', 'Priority concierge',
    ],
    accent: '[#c39bff]',
    icon: Zap,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: '₹50,000',
    tagline: 'White-label + SLA',
    features: ['Everything in Pro', 'Unlimited team', 'API access', 'White-label', 'SLA + dedicated support'],
    accent: '[#ffbf00]',
    icon: Crown,
  },
];

export default function BillingPage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<PlanKey | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const refresh = useCallback(async () => {
    const [s, inv] = await Promise.all([
      apiClient<StatusData>('/v1/subscription/status'),
      apiClient<InvoiceRow[]>('/v1/subscription/invoices'),
    ]);
    if (s.success) setStatus(s.data ?? null);
    if (inv.success) setInvoices(Array.isArray(inv.data) ? inv.data : []);
  }, []);

  useEffect(() => { (async () => { setLoading(true); await refresh(); setLoading(false); })(); }, [refresh]);

  // Load Razorpay script once
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.Razorpay) return;
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    document.body.appendChild(s);
  }, []);

  const onCheckout = async (plan: 'pro' | 'enterprise') => {
    setCheckingOut(plan);
    try {
      const res = await apiClient<{
        razorpay_subscription_id: string; razorpay_key_id: string; short_url: string; amount_paise: number;
      }>('/v1/subscription/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      });
      if (!res.success || !res.data) {
        alert(res.errors?.[0]?.message ?? 'Checkout failed');
        return;
      }
      // Prefer Razorpay Checkout in-browser; fall back to short_url
      if (window.Razorpay && res.data.razorpay_key_id && !res.data.razorpay_key_id.includes('placeholder')) {
        const rzp = new window.Razorpay({
          key: res.data.razorpay_key_id,
          subscription_id: res.data.razorpay_subscription_id,
          name: 'GRID',
          description: plan === 'pro' ? 'GRID Pro — monthly' : 'GRID Enterprise — monthly',
          theme: { color: '#c39bff' },
          handler: async () => { await refresh(); },
        });
        rzp.open();
      } else if (res.data.short_url) {
        window.open(res.data.short_url, '_blank');
      } else {
        alert('Subscription created but checkout URL not available. Refresh in a minute.');
        await refresh();
      }
    } finally {
      setCheckingOut(null);
    }
  };

  const onActivateTrial = async () => {
    const res = await apiClient<{ plan: string; trial_ends_at: string }>('/v1/subscription/activate-trial', { method: 'POST' });
    if (!res.success) { alert(res.errors?.[0]?.message ?? 'Trial activation failed'); return; }
    await refresh();
  };

  const onCancel = async () => {
    if (!status?.subscription) return;
    if (!confirm('Cancel subscription at end of current cycle? You keep access until then.')) return;
    setCancelling(true);
    try {
      const res = await apiClient('/v1/subscription/cancel', {
        method: 'POST',
        body: JSON.stringify({ subscription_id: status.subscription.id, immediate: false }),
      });
      if (!res.success) { alert(res.errors?.[0]?.message ?? 'Cancel failed'); return; }
      await refresh();
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-white/50">Loading billing…</div>;
  }

  const currentPlan = status?.plan ?? 'free';
  const sub = status?.subscription;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tighter text-white">Billing</h1>
        <p className="text-white/50 mt-1">Manage your plan, payment method and invoices.</p>
      </div>

      {/* Current plan card */}
      <section className="glass-card rounded-xl p-6 border border-white/5 relative overflow-hidden mb-8">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs tracking-widest uppercase font-bold text-[#a1faff]">Current Plan</div>
            <div className="mt-2 flex items-center gap-3">
              <h2 className="font-display text-2xl font-extrabold text-white">{status?.name ?? 'Free'}</h2>
              {sub && (
                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                  sub.status === 'active' ? 'border-emerald-400/30 text-emerald-300' :
                  sub.status === 'halted' ? 'border-rose-400/30 text-rose-300' :
                  'border-white/20 text-white/60'
                }`}>{sub.status}</span>
              )}
              {status?.trial_ends_at && (
                <span className="text-xs px-2 py-0.5 rounded-full border border-[#ffbf00]/30 text-[#ffbf00]">
                  Trial ends {fmtDate(status.trial_ends_at)}
                </span>
              )}
            </div>
            {sub && (
              <div className="text-sm text-white/60 mt-2">
                {rupees(sub.amount_paise)}/month · Next charge {fmtDate(sub.current_end)}
                {sub.cancel_at_cycle_end && <span className="ml-2 text-rose-300">(cancels at cycle end)</span>}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {currentPlan === 'free' && !status?.trial_ends_at && (
              <button onClick={onActivateTrial} className="btn-nocturne-secondary">
                Start 14-day trial
              </button>
            )}
            {sub && !sub.cancel_at_cycle_end && (
              <button onClick={onCancel} disabled={cancelling}
                className="px-4 py-2 rounded-lg border border-white/10 text-white/70 hover:bg-white/5 disabled:opacity-50">
                {cancelling ? 'Cancelling…' : 'Cancel subscription'}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Plans grid */}
      <section className="mb-10">
        <h2 className="font-display text-xl font-extrabold text-white mb-4">Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLAN_CARDS.map((p) => {
            const Icon = p.icon;
            const isCurrent = currentPlan === p.key;
            const isPaid = p.key === 'pro' || p.key === 'enterprise';
            return (
              <div key={p.key}
                className={`glass-card rounded-xl p-6 border ${isCurrent ? `border-${p.accent}` : 'border-white/5'} relative overflow-hidden`}>
                <div className={`absolute -top-10 -right-10 w-32 h-32 bg-${p.accent}/10 blur-[80px] rounded-full pointer-events-none`} />
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={18} className={`text-${p.accent}`} />
                  <span className="font-display text-lg font-extrabold text-white">{p.name}</span>
                </div>
                <div className="text-3xl font-extrabold text-white">{p.price}<span className="text-sm font-normal text-white/40">/mo</span></div>
                <div className="text-sm text-white/50 mt-1">{p.tagline}</div>
                <ul className="mt-4 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/70">
                      <Check size={14} className="text-[#a1faff] mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {isCurrent ? (
                    <div className="text-center text-sm text-white/50 py-2">Current plan</div>
                  ) : isPaid ? (
                    <button
                      onClick={() => onCheckout(p.key as 'pro' | 'enterprise')}
                      disabled={checkingOut === p.key}
                      className={p.key === 'pro' ? 'btn-nocturne-primary w-full' : 'btn-nocturne-secondary w-full'}>
                      {checkingOut === p.key ? 'Opening checkout…' : `Upgrade to ${p.name}`}
                    </button>
                  ) : (
                    <div className="text-center text-sm text-white/30 py-2">—</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Invoices */}
      <section>
        <h2 className="font-display text-xl font-extrabold text-white mb-4">Billing history</h2>
        {invoices.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center text-white/40 border border-white/5">
            <CreditCard size={28} className="mx-auto mb-2 opacity-40" />
            No invoices yet. They appear after your first charge.
          </div>
        ) : (
          <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
            <table className="nocturne-table w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-3 text-xs tracking-widest uppercase font-bold text-white/30">Period</th>
                  <th className="text-left p-3 text-xs tracking-widest uppercase font-bold text-white/30">Amount</th>
                  <th className="text-left p-3 text-xs tracking-widest uppercase font-bold text-white/30">Status</th>
                  <th className="text-left p-3 text-xs tracking-widest uppercase font-bold text-white/30">Paid at</th>
                  <th className="text-right p-3 text-xs tracking-widest uppercase font-bold text-white/30">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id} className="border-t border-white/5">
                    <td className="p-3 text-white/70">{fmtDate(i.billing_start)} → {fmtDate(i.billing_end)}</td>
                    <td className="p-3 text-white font-semibold">{rupees(i.amount_paise)}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        i.status === 'paid' ? 'border-emerald-400/30 text-emerald-300' :
                        i.status === 'failed' ? 'border-rose-400/30 text-rose-300' :
                        'border-white/20 text-white/60'
                      }`}>{i.status}</span>
                    </td>
                    <td className="p-3 text-white/50">{fmtDate(i.paid_at)}</td>
                    <td className="p-3 text-right">
                      {i.invoice_pdf_url ? (
                        <a href={i.invoice_pdf_url} target="_blank" rel="noreferrer"
                          className="text-[#c39bff] hover:underline">Download</a>
                      ) : <span className="text-white/30">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-10 text-xs text-white/30 flex items-center gap-2">
        <X size={12} />
        Need to change seats, billing email, or move to annual? Email billing@grid.live
      </div>
    </div>
  );
}
