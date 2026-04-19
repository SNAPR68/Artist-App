'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Download, Vault, TrendingUp, Users, Briefcase, Lock } from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';

interface DealRow {
  booking_id: string;
  event_id: string;
  event_name: string;
  event_date: string;
  event_city: string;
  event_type: string;
  stage_name: string | null;
  artist_id: string;
  client_name: string | null;
  state: string;
  quoted_amount_paise: number | null;
  final_amount_paise: number | null;
  created_at: string;
}

interface Summary {
  total_deals: number;
  completed_deals: number;
  gross_volume_paise: number;
  unique_artists: number;
  unique_clients: number;
}

interface Workspace {
  id: string;
  name: string;
  metadata?: { plan?: string };
}

const STATE_COLORS: Record<string, string> = {
  inquiry: 'bg-white/10 text-white/60',
  quoted: 'bg-[#a1faff]/20 text-[#a1faff]',
  negotiating: 'bg-[#ffbf00]/20 text-[#ffbf00]',
  confirmed: 'bg-[#c39bff]/20 text-[#c39bff]',
  pre_event: 'bg-[#c39bff]/20 text-[#c39bff]',
  event_day: 'bg-[#c39bff]/20 text-[#c39bff]',
  completed: 'bg-green-500/20 text-green-300',
  cancelled: 'bg-red-500/20 text-red-300',
};

const fmtINR = (paise: number | null) => {
  if (paise == null) return '—';
  const rupees = paise / 100;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(0)}K`;
  return `₹${rupees.toFixed(0)}`;
};

export default function DealVaultPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Load workspace
  useEffect(() => {
    (async () => {
      const res = await apiClient<Workspace[]>('/v1/workspaces');
      if (res.success && res.data && res.data.length > 0) {
        setWorkspace(res.data[0]);
      } else {
        setLoading(false);
      }
    })();
  }, []);

  const load = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (stateFilter) params.set('state', stateFilter);
    params.set('page', String(page));
    params.set('per_page', '25');

    const [dealsRes, summaryRes] = await Promise.all([
      apiClient<DealRow[]>(`/v1/workspaces/${workspace.id}/deals?${params}`),
      apiClient<Summary>(`/v1/workspaces/${workspace.id}/deals/summary`),
    ]);

    if (dealsRes.success) {
      setDeals(Array.isArray(dealsRes.data) ? dealsRes.data : []);
      const meta = (dealsRes as unknown as { meta?: { total?: number } }).meta;
      setTotal(meta?.total ?? 0);
    }
    if (summaryRes.success && summaryRes.data) setSummary(summaryRes.data);
    setLoading(false);
  }, [workspace, query, stateFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const isPro = workspace?.metadata?.plan === 'pro' || workspace?.metadata?.plan === 'enterprise';

  const exportCsv = async () => {
    if (!workspace || !isPro) return;
    setExporting(true);
    const token = localStorage.getItem('access_token');
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (stateFilter) params.set('state', stateFilter);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/v1/workspaces/${workspace.id}/deals/export.csv?${params}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grid-deals-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (!workspace && !loading) {
    return (
      <div className="glass-card p-8 rounded-xl border border-white/10 text-center">
        <Vault className="mx-auto text-white/30 mb-4" size={48} />
        <p className="text-white/60">No workspace found. Create one to start building your deal vault.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="fixed -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Hero */}
      <section className="relative z-10 flex items-center justify-between">
        <div>
          <span className="text-[#a1faff] font-bold text-xs tracking-widest uppercase mb-2 block">Deal Vault</span>
          <h1 className="text-3xl font-display font-extrabold tracking-tighter text-white">Deal History</h1>
          <p className="text-white/40 text-sm mt-1">Every artist booking your agency has ever made. Searchable, exportable, yours forever.</p>
        </div>
        <Vault className="text-[#c39bff] opacity-50" size={32} />
      </section>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
          <StatCard icon={Briefcase} label="Total Deals" value={String(summary.total_deals)} color="text-[#c39bff]" />
          <StatCard icon={TrendingUp} label="Gross Volume" value={fmtINR(summary.gross_volume_paise)} color="text-[#a1faff]" />
          <StatCard icon={Users} label="Unique Artists" value={String(summary.unique_artists)} color="text-[#ffbf00]" />
          <StatCard icon={Users} label="Unique Clients" value={String(summary.unique_clients)} color="text-green-300" />
        </div>
      )}

      {/* Search + filters + export */}
      <div className="glass-card p-4 rounded-xl border border-white/5 relative z-10 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input
              type="text"
              value={query}
              onChange={(e) => { setPage(1); setQuery(e.target.value); }}
              placeholder="Search artist, event, client, city..."
              className="input-nocturne pl-10 w-full"
            />
          </div>
          <select
            value={stateFilter}
            onChange={(e) => { setPage(1); setStateFilter(e.target.value); }}
            className="input-nocturne min-w-[160px]"
          >
            <option value="">All states</option>
            <option value="inquiry">Inquiry</option>
            <option value="quoted">Quoted</option>
            <option value="negotiating">Negotiating</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={exportCsv}
            disabled={exporting || !isPro}
            title={isPro ? 'Export to CSV' : 'Pro plan required'}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              isPro
                ? 'bg-[#c39bff] text-black hover:bg-[#b48af0]'
                : 'bg-white/5 border border-white/10 text-white/40 cursor-not-allowed'
            } ${exporting ? 'opacity-50' : ''}`}
          >
            {isPro ? <Download size={14} /> : <Lock size={14} />}
            {exporting ? 'Exporting…' : isPro ? 'Export CSV' : 'Pro to Export'}
          </button>
        </div>
        {!isPro && (
          <p className="text-xs text-white/40 flex items-center gap-2">
            <Lock size={12} /> CSV export is a Pro feature. Upgrade to download your entire deal history.
          </p>
        )}
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl border border-white/5 relative z-10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] border-b border-white/10">
              <tr className="text-left text-xs uppercase tracking-widest text-white/50">
                <th className="px-4 py-3 font-bold">Date</th>
                <th className="px-4 py-3 font-bold">Artist</th>
                <th className="px-4 py-3 font-bold">Event</th>
                <th className="px-4 py-3 font-bold">Client</th>
                <th className="px-4 py-3 font-bold">City</th>
                <th className="px-4 py-3 font-bold">State</th>
                <th className="px-4 py-3 font-bold text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-white/40">Loading deals…</td></tr>
              ) : deals.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-white/40">No deals match your search.</td></tr>
              ) : (
                deals.map((d) => (
                  <tr key={d.booking_id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-white/80">{new Date(d.event_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                    <td className="px-4 py-3 text-white font-medium">{d.stage_name ?? '—'}</td>
                    <td className="px-4 py-3 text-white/70">{d.event_name}</td>
                    <td className="px-4 py-3 text-white/70">{d.client_name ?? '—'}</td>
                    <td className="px-4 py-3 text-white/60">{d.event_city}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${STATE_COLORS[d.state] ?? 'bg-white/10 text-white/60'}`}>
                        {d.state}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[#c39bff]">
                      {fmtINR(d.final_amount_paise ?? d.quoted_amount_paise)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 25 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 text-xs text-white/60">
            <span>Showing {((page - 1) * 25) + 1}–{Math.min(page * 25, total)} of {total}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 25 >= total}
                className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: typeof Vault;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="glass-card p-4 rounded-xl border border-white/5">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={color} />
        <span className="text-xs uppercase tracking-widest text-white/50 font-bold">{label}</span>
      </div>
      <p className={`text-2xl font-display font-extrabold tracking-tight ${color}`}>{value}</p>
    </div>
  );
}
