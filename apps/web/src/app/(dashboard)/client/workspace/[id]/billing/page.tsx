'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Check, Sparkles, Mail, FileText, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface SubscriptionStatus {
  plan: 'free' | 'pro' | 'enterprise';
  plan_name: string;
  trial_ends_at?: string | null;
  trial_used?: boolean;
  briefs_used?: number;
  briefs_limit?: number;
  team_size?: number;
  team_limit?: number;
  features: string[];
}

interface Plan {
  name: string;
  price_paise?: number | null;
  briefs_per_month: number;
  max_team_members: number;
  features: string[];
}

export default function BillingPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [plans, setPlans] = useState<Record<string, Plan> | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [sRes, pRes] = await Promise.all([
      apiClient<SubscriptionStatus>('/v1/subscription/status'),
      apiClient<Record<string, Plan>>('/v1/subscription/plans'),
    ]);
    if (sRes.success) setStatus(sRes.data);
    if (pRes.success) setPlans(pRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleTrial = async () => {
    setActivating(true);
    setError(null);
    const res = await apiClient<{ plan: string; trial_ends_at: string; message: string }>(
      '/v1/subscription/activate-trial', { method: 'POST', body: JSON.stringify({}) },
    );
    if (res.success) {
      setSuccess(res.data.message);
      loadData();
    } else {
      setError(res.errors?.[0]?.message ?? 'Failed to activate trial');
    }
    setActivating(false);
  };

  const daysLeft = status?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(status.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  if (loading) {
    return <div className="p-8 text-white/50 text-sm">Loading billing…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-8">
      <header className="space-y-1">
        <p className="text-xs text-white/30 uppercase tracking-widest font-bold">Workspace</p>
        <h1 className="text-2xl md:text-3xl font-display font-extrabold text-white">Billing &amp; Plan</h1>
        <p className="text-white/50 text-sm">Manage your subscription and usage.</p>
      </header>

      {error && (
        <div className="glass-card rounded-xl p-4 border border-red-500/20 flex items-center gap-3">
          <AlertCircle size={16} className="text-red-400" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="glass-card rounded-xl p-4 border border-green-500/20 flex items-center gap-3">
          <Check size={16} className="text-green-400" />
          <p className="text-green-300 text-sm">{success}</p>
        </div>
      )}

      {/* Current plan card */}
      <div className="glass-card rounded-2xl p-6 md:p-8 border border-white/10 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[10px] text-[#a1faff] uppercase tracking-widest font-bold mb-1">Current plan</p>
            <h2 className="text-3xl font-extrabold text-white">{status?.plan_name ?? 'Free'}</h2>
            {status?.trial_ends_at && status.plan === 'pro' && (
              <p className="text-xs text-[#ffbf00] mt-2">
                Pro Trial — {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
              </p>
            )}
          </div>
          {status?.plan === 'free' && !status.trial_used && (
            <button
              onClick={handleTrial}
              disabled={activating}
              className="flex items-center gap-2 px-5 py-3 rounded-lg bg-gradient-to-r from-[#c39bff] to-[#8A2BE2] text-white text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-all"
            >
              <Sparkles size={15} />
              {activating ? 'Activating…' : 'Start 14-day Pro trial'}
            </button>
          )}
          {status?.plan === 'free' && status.trial_used && (
            <a
              href="mailto:raj@thesingularitycovenant.com?subject=GRID%20Pro%20Upgrade"
              className="flex items-center gap-2 px-5 py-3 rounded-lg bg-[#c39bff] text-black text-sm font-bold hover:bg-[#b48af0] transition-all"
            >
              <Mail size={15} /> Upgrade to Pro
            </a>
          )}
        </div>

        {/* Usage metrics */}
        {status && (
          <div className="relative z-10 grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/10">
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Briefs this month</p>
              <p className="text-xl text-white font-bold mt-1">
                {status.briefs_used ?? 0}
                <span className="text-sm text-white/30 font-normal">
                  {' '}/ {status.briefs_limit === -1 ? '∞' : status.briefs_limit ?? 5}
                </span>
              </p>
            </div>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Team members</p>
              <p className="text-xl text-white font-bold mt-1">
                {status.team_size ?? 1}
                <span className="text-sm text-white/30 font-normal">
                  {' '}/ {status.team_limit === -1 ? '∞' : status.team_limit ?? 1}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Available plans */}
      {plans && (
        <div>
          <h3 className="text-xs text-white/40 uppercase tracking-widest font-bold mb-4">Available Plans</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(plans).map(([key, plan]) => {
              const isCurrent = status?.plan === key;
              return (
                <div key={key} className={`rounded-xl p-6 border flex flex-col ${
                  isCurrent ? 'border-[#c39bff]/50 bg-[#c39bff]/5' : 'border-white/10 bg-white/[0.02]'
                }`}>
                  <h4 className="text-lg font-bold text-white">{plan.name}</h4>
                  <p className="text-white/40 text-sm mt-1">
                    {plan.price_paise === null ? 'Custom' : plan.price_paise === undefined ? '₹0' : `₹${(plan.price_paise / 100).toLocaleString('en-IN')}/mo`}
                  </p>
                  <ul className="mt-4 space-y-2 flex-1">
                    {plan.features.slice(0, 5).map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-white/60">
                        <Check size={12} className="text-[#c39bff] mt-0.5 shrink-0" />
                        <span className="capitalize">{f.replace(/_/g, ' ')}</span>
                      </li>
                    ))}
                  </ul>
                  {isCurrent && (
                    <p className="mt-4 text-[10px] text-[#c39bff] uppercase tracking-widest font-bold">Current plan</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invoices placeholder */}
      <div className="glass-card rounded-xl p-6 border border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText size={18} className="text-white/40" />
          <div>
            <p className="text-sm font-bold text-white">GST Invoices</p>
            <p className="text-xs text-white/40">Tax invoices for subscription payments.</p>
          </div>
        </div>
        <Link
          href={`/client/workspace/${workspaceId}/billing/invoices`}
          className="text-xs text-[#c39bff] hover:text-[#b48af0] font-bold transition-colors"
        >
          View all →
        </Link>
      </div>
    </div>
  );
}
