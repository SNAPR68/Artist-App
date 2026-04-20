'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Users, CreditCard, AlertTriangle, Activity, Crown, Search, Inbox } from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';

interface FunnelData {
  funnel: {
    total_users: number; workspaces_created: number;
    briefs_submitted: number; briefs_completed: number;
    bookings_created: number; bookings_confirmed: number;
    pro_subscriptions: number;
  };
  supply: { total_artists: number };
  last_7_days: { new_users: number; new_briefs: number; new_bookings: number };
}

interface RevenueData {
  mrr_paise: number; arr_paise: number;
  active_paid: number; active_trials: number;
  by_plan: Record<string, { count: number; mrr_paise: number }>;
  revenue_30d_paise: number;
  churned_30d: number;
  scheduled_cancels: number;
}

interface AgencyRow {
  workspace_id: string; name: string;
  plan: string; trial_ends_at: string | null;
  subscription: { status: string; amount_paise: number; cancel_at_cycle_end: boolean } | null;
  briefs_30d: number; bookings_30d: number; active_members: number;
  last_activity_at: string | null; health_score: number; created_at: string;
}

const rupees = (p: number) => '₹' + (p / 100).toLocaleString('en-IN');
const rupeesShort = (p: number) => {
  const r = p / 100;
  if (r >= 10_000_000) return `₹${(r / 10_000_000).toFixed(1)}Cr`;
  if (r >= 100_000) return `₹${(r / 100_000).toFixed(1)}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(1)}K`;
  return `₹${r.toFixed(0)}`;
};
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—');

const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);

function Stat({ icon: Icon, label, value, sub, tone = 'default' }: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  tone?: 'default' | 'purple' | 'cyan' | 'gold' | 'warn';
}) {
  const accentMap = {
    default: 'text-white',
    purple: 'text-[#c39bff]',
    cyan: 'text-[#a1faff]',
    gold: 'text-[#ffbf00]',
    warn: 'text-rose-300',
  };
  return (
    <div className="glass-card rounded-xl p-5 border border-white/5 relative overflow-hidden">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className="text-white/40" />
        <span className="text-xs tracking-widest uppercase font-bold text-white/40">{label}</span>
      </div>
      <div className={`text-2xl font-extrabold ${accentMap[tone]}`}>{value}</div>
      {sub && <div className="text-xs text-white/40 mt-1">{sub}</div>}
    </div>
  );
}

function HealthBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-emerald-400' : score >= 40 ? 'bg-[#ffbf00]' : 'bg-rose-400';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-white/60 w-8 text-right">{score}</span>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [agencies, setAgencies] = useState<AgencyRow[]>([]);
  const [conciergeQueue, setConciergeQueue] = useState<{ pending: number; active: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'free' | 'pro' | 'enterprise'>('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [f, r, a, c] = await Promise.all([
        apiClient<FunnelData>('/v1/admin/analytics/funnel'),
        apiClient<RevenueData>('/v1/admin/analytics/revenue'),
        apiClient<AgencyRow[]>('/v1/admin/analytics/agencies?limit=100'),
        apiClient<Array<{ status: string }>>('/v1/admin/concierge/requests'),
      ]);
      if (f.success) setFunnel(f.data ?? null);
      if (r.success) setRevenue(r.data ?? null);
      if (a.success) setAgencies(Array.isArray(a.data) ? a.data : []);
      if (c.success && Array.isArray(c.data)) {
        setConciergeQueue({
          pending: c.data.filter((x) => x.status === 'pending').length,
          active: c.data.filter((x) => x.status === 'accepted' || x.status === 'in_progress').length,
        });
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-8 text-white/50">Loading analytics…</div>;

  const filtered = agencies.filter((a) => {
    if (planFilter !== 'all' && a.plan !== planFilter) return false;
    if (search && !a.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalProPaying = revenue?.by_plan?.pro?.count ?? 0;
  const mrrTarget = 150_000_00; // ₹1.5L MRR goal (paise)
  const mrrProgress = revenue ? Math.min(100, Math.round((revenue.mrr_paise / mrrTarget) * 100)) : 0;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tighter text-white">Analytics</h1>
        <p className="text-white/50 mt-1">MRR, activation funnel, and agency health.</p>
      </div>

      {/* MRR hero */}
      <section className="glass-card rounded-xl p-6 border border-white/5 relative overflow-hidden mb-8">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs tracking-widest uppercase font-bold text-[#a1faff]">Monthly Recurring Revenue</div>
            <div className="mt-2 font-display text-5xl font-extrabold text-white">{revenue ? rupees(revenue.mrr_paise) : '—'}</div>
            <div className="text-sm text-white/50 mt-1">
              ARR {revenue ? rupeesShort(revenue.arr_paise) : '—'} · {revenue?.active_paid ?? 0} paying · {revenue?.active_trials ?? 0} trials
            </div>
          </div>
          <div className="md:w-72">
            <div className="text-xs text-white/40 mb-1">Path to ₹1.5L MRR (10 agencies)</div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#c39bff] to-[#a1faff]" style={{ width: `${mrrProgress}%` }} />
            </div>
            <div className="text-xs text-white/60 mt-1">{totalProPaying}/10 agencies · {mrrProgress}%</div>
          </div>
        </div>
      </section>

      {/* Revenue stats row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
        <Stat icon={Crown} label="Pro" value={String(revenue?.by_plan?.pro?.count ?? 0)}
          sub={revenue?.by_plan?.pro ? rupeesShort(revenue.by_plan.pro.mrr_paise) + ' MRR' : '—'} tone="purple" />
        <Stat icon={Crown} label="Enterprise" value={String(revenue?.by_plan?.enterprise?.count ?? 0)}
          sub={revenue?.by_plan?.enterprise ? rupeesShort(revenue.by_plan.enterprise.mrr_paise) + ' MRR' : '—'} tone="gold" />
        <Stat icon={TrendingUp} label="Revenue 30d" value={revenue ? rupeesShort(revenue.revenue_30d_paise) : '—'} tone="cyan" />
        <Stat icon={AlertTriangle} label="Churned 30d" value={String(revenue?.churned_30d ?? 0)}
          sub={(revenue?.scheduled_cancels ?? 0) > 0 ? `${revenue?.scheduled_cancels} scheduled` : 'no cancels scheduled'}
          tone={revenue?.churned_30d ? 'warn' : 'default'} />
        <Stat icon={Activity} label="Trials" value={String(revenue?.active_trials ?? 0)} sub="in 14-day window" tone="gold" />
        <Stat icon={Inbox} label="Concierge queue"
          value={String((conciergeQueue?.pending ?? 0) + (conciergeQueue?.active ?? 0))}
          sub={conciergeQueue ? `${conciergeQueue.pending} pending · ${conciergeQueue.active} active` : '—'}
          tone={conciergeQueue && conciergeQueue.pending > 3 ? 'warn' : 'cyan'} />
      </div>

      {/* Funnel */}
      <section className="mb-10">
        <h2 className="font-display text-xl font-extrabold text-white mb-4">Activation funnel</h2>
        {funnel && (
          <div className="glass-card rounded-xl border border-white/5 p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <FunnelStep label="Signups" count={funnel.funnel.total_users} />
              <FunnelStep label="Workspaces" count={funnel.funnel.workspaces_created}
                conv={pct(funnel.funnel.workspaces_created, funnel.funnel.total_users)} />
              <FunnelStep label="First brief" count={funnel.funnel.briefs_submitted}
                conv={pct(funnel.funnel.briefs_submitted, funnel.funnel.workspaces_created)} />
              <FunnelStep label="Confirmed booking" count={funnel.funnel.bookings_confirmed}
                conv={pct(funnel.funnel.bookings_confirmed, funnel.funnel.briefs_submitted)} />
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-3 gap-4 text-center text-sm">
              <div><div className="text-white/40 text-xs uppercase tracking-wider">New users 7d</div><div className="text-white font-bold mt-1">{funnel.last_7_days.new_users}</div></div>
              <div><div className="text-white/40 text-xs uppercase tracking-wider">New briefs 7d</div><div className="text-white font-bold mt-1">{funnel.last_7_days.new_briefs}</div></div>
              <div><div className="text-white/40 text-xs uppercase tracking-wider">New bookings 7d</div><div className="text-white font-bold mt-1">{funnel.last_7_days.new_bookings}</div></div>
            </div>
          </div>
        )}
      </section>

      {/* Agencies table */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-display text-xl font-extrabold text-white">Agencies</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…"
                className="input-nocturne pl-9 py-2 text-sm w-48" />
            </div>
            <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value as typeof planFilter)}
              className="input-nocturne py-2 text-sm">
              <option value="all">All plans</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>

        <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
          <table className="nocturne-table w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-3 text-xs tracking-widest uppercase font-bold text-white/30">Agency</th>
                <th className="text-left p-3 text-xs tracking-widest uppercase font-bold text-white/30">Plan</th>
                <th className="text-left p-3 text-xs tracking-widest uppercase font-bold text-white/30">Health</th>
                <th className="text-right p-3 text-xs tracking-widest uppercase font-bold text-white/30">Briefs 30d</th>
                <th className="text-right p-3 text-xs tracking-widest uppercase font-bold text-white/30">Bookings 30d</th>
                <th className="text-right p-3 text-xs tracking-widest uppercase font-bold text-white/30">Team</th>
                <th className="text-left p-3 text-xs tracking-widest uppercase font-bold text-white/30">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-white/40">
                  <Users size={24} className="mx-auto mb-2 opacity-40" />
                  No agencies match this filter.
                </td></tr>
              ) : filtered.map((a) => (
                <tr key={a.workspace_id} className="border-t border-white/5">
                  <td className="p-3">
                    <div className="text-white font-semibold">{a.name || 'Unnamed'}</div>
                    <div className="text-xs text-white/30">{a.workspace_id.slice(0, 8)}</div>
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      a.plan === 'pro' ? 'border-[#c39bff]/40 text-[#c39bff]' :
                      a.plan === 'enterprise' ? 'border-[#ffbf00]/40 text-[#ffbf00]' :
                      'border-white/20 text-white/50'
                    }`}>{a.plan}</span>
                    {a.subscription?.cancel_at_cycle_end && (
                      <span className="ml-2 text-xs text-rose-300">cancelling</span>
                    )}
                    {a.trial_ends_at && (
                      <span className="ml-2 text-xs text-[#ffbf00]">trial→{fmtDate(a.trial_ends_at)}</span>
                    )}
                  </td>
                  <td className="p-3"><HealthBar score={a.health_score} /></td>
                  <td className="p-3 text-right text-white/70">{a.briefs_30d}</td>
                  <td className="p-3 text-right text-white/70">{a.bookings_30d}</td>
                  <td className="p-3 text-right text-white/70">{a.active_members}</td>
                  <td className="p-3 text-white/50">{fmtDate(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function FunnelStep({ label, count, conv }: { label: string; count: number; conv?: number }) {
  return (
    <div>
      <div className="text-xs tracking-widest uppercase font-bold text-white/40">{label}</div>
      <div className="font-display text-3xl font-extrabold text-white mt-1">{count}</div>
      {conv !== undefined && (
        <div className="text-xs text-[#a1faff] mt-1">
          <CreditCard size={10} className="inline mr-1" />
          {conv}% convert
        </div>
      )}
    </div>
  );
}
