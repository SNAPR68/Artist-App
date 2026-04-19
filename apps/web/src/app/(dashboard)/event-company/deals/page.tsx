'use client';

import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react';
import { Search, Download, Vault, TrendingUp, Users, Briefcase, Lock, LayoutGrid, List, Sparkles } from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';
import { AgencyAssistantPanel } from '../../../../components/agency/AgencyAssistantPanel';

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

// Six columns shown on the Kanban. Terminal/edge states (settled, expired, disputed) stay in the table view.
const KANBAN_COLUMNS: { state: string; label: string; accent: string }[] = [
  { state: 'inquiry', label: 'Inquiry', accent: 'text-white/60' },
  { state: 'quoted', label: 'Quoted', accent: 'text-[#a1faff]' },
  { state: 'negotiating', label: 'Negotiating', accent: 'text-[#ffbf00]' },
  { state: 'confirmed', label: 'Confirmed', accent: 'text-[#c39bff]' },
  { state: 'completed', label: 'Completed', accent: 'text-green-300' },
  { state: 'cancelled', label: 'Cancelled', accent: 'text-red-300' },
];

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

type ViewMode = 'kanban' | 'table';

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
  const [view, setView] = useState<ViewMode>('kanban');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; message: string } | null>(null);

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
    // Kanban needs a wider slice than a paginated table.
    params.set('per_page', view === 'kanban' ? '200' : '25');

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
  }, [workspace, query, stateFilter, page, view]);

  useEffect(() => { load(); }, [load]);

  const isPro = workspace?.metadata?.plan === 'pro' || workspace?.metadata?.plan === 'enterprise';

  const dealsByColumn = useMemo(() => {
    const grouped: Record<string, DealRow[]> = {};
    for (const col of KANBAN_COLUMNS) grouped[col.state] = [];
    for (const d of deals) {
      if (grouped[d.state]) grouped[d.state].push(d);
    }
    return grouped;
  }, [deals]);

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

  const moveDeal = useCallback(async (bookingId: string, toState: string) => {
    if (!workspace) return;
    const current = deals.find((d) => d.booking_id === bookingId);
    if (!current || current.state === toState) return;

    // Optimistic update
    setDeals((prev) => prev.map((d) => (d.booking_id === bookingId ? { ...d, state: toState } : d)));

    const res = await apiClient<DealRow>(
      `/v1/workspaces/${workspace.id}/deals/${bookingId}/state`,
      { method: 'PATCH', body: JSON.stringify({ state: toState }) },
    );

    if (!res.success) {
      // Revert + show error
      setDeals((prev) => prev.map((d) => (d.booking_id === bookingId ? { ...d, state: current.state } : d)));
      const msg = res.errors?.[0]?.message ?? 'Could not move deal';
      setToast({ kind: 'err', message: msg });
      setTimeout(() => setToast(null), 3500);
    } else {
      setToast({ kind: 'ok', message: `Deal moved to ${toState}` });
      setTimeout(() => setToast(null), 2000);
    }
  }, [workspace, deals]);

  const handleDragStart = (e: DragEvent<HTMLDivElement>, bookingId: string) => {
    setDraggingId(bookingId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', bookingId);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, columnState: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropTarget !== columnState) setDropTarget(columnState);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, columnState: string) => {
    e.preventDefault();
    const bookingId = e.dataTransfer.getData('text/plain') || draggingId;
    setDraggingId(null);
    setDropTarget(null);
    if (bookingId) moveDeal(bookingId, columnState);
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
          <span className="text-[#a1faff] font-bold text-xs tracking-widest uppercase mb-2 block">Agency Pipeline</span>
          <h1 className="text-3xl font-display font-extrabold tracking-tighter text-white">Deals</h1>
          <p className="text-white/40 text-sm mt-1">Your entire pipeline. Drag cards across columns to move deals forward.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAssistantOpen((v) => !v)}
            className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all ${
              assistantOpen
                ? 'bg-[#c39bff] text-black border-[#c39bff]'
                : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
            }`}
          >
            <Sparkles size={14} /> Assistant
          </button>
          <Vault className="text-[#c39bff] opacity-50" size={32} />
        </div>
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

      {/* Search + filters + export + view toggle */}
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

          {/* View toggle */}
          <div className="flex rounded-lg border border-white/10 bg-white/5 overflow-hidden">
            <button
              onClick={() => setView('kanban')}
              className={`px-3 py-2 text-xs font-bold flex items-center gap-2 transition-colors ${
                view === 'kanban' ? 'bg-[#c39bff] text-black' : 'text-white/60 hover:text-white'
              }`}
            >
              <LayoutGrid size={14} /> Kanban
            </button>
            <button
              onClick={() => setView('table')}
              className={`px-3 py-2 text-xs font-bold flex items-center gap-2 transition-colors ${
                view === 'table' ? 'bg-[#c39bff] text-black' : 'text-white/60 hover:text-white'
              }`}
            >
              <List size={14} /> Table
            </button>
          </div>

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

      {/* Main workspace: board (or table) + optional assistant rail */}
      <div className={`relative z-10 grid gap-4 ${assistantOpen ? 'lg:grid-cols-[1fr_320px]' : 'grid-cols-1'}`}>
        <div>
          {view === 'kanban' ? (
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-3 min-w-max">
                {KANBAN_COLUMNS.map((col) => {
                  const colDeals = dealsByColumn[col.state] ?? [];
                  const isTarget = dropTarget === col.state;
                  return (
                    <div
                      key={col.state}
                      onDragOver={(e) => handleDragOver(e, col.state)}
                      onDragLeave={() => setDropTarget((t) => (t === col.state ? null : t))}
                      onDrop={(e) => handleDrop(e, col.state)}
                      className={`w-72 shrink-0 glass-card rounded-xl border transition-colors ${
                        isTarget ? 'border-[#c39bff]/60 bg-[#c39bff]/5' : 'border-white/5'
                      }`}
                    >
                      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs uppercase tracking-widest font-bold ${col.accent}`}>{col.label}</span>
                          <span className="text-[10px] text-white/40">{colDeals.length}</span>
                        </div>
                      </div>
                      <div className="p-2 space-y-2 min-h-[120px] max-h-[70vh] overflow-y-auto">
                        {loading ? (
                          <div className="nocturne-skeleton h-20 rounded-lg" />
                        ) : colDeals.length === 0 ? (
                          <div className="text-[11px] text-white/30 text-center py-6">No deals</div>
                        ) : (
                          colDeals.map((d) => (
                            <div
                              key={d.booking_id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, d.booking_id)}
                              onDragEnd={() => { setDraggingId(null); setDropTarget(null); }}
                              className={`glass-card rounded-lg border border-white/10 p-3 cursor-grab active:cursor-grabbing transition-all hover:border-white/20 ${
                                draggingId === d.booking_id ? 'opacity-40' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <span className="text-sm font-bold text-white truncate">{d.stage_name ?? 'Artist TBD'}</span>
                                <span className="text-xs font-mono text-[#c39bff] shrink-0">
                                  {fmtINR(d.final_amount_paise ?? d.quoted_amount_paise)}
                                </span>
                              </div>
                              <p className="text-xs text-white/60 truncate">{d.event_name}</p>
                              <div className="flex items-center justify-between mt-2 text-[10px] text-white/40">
                                <span>{d.client_name ?? '—'}</span>
                                <span>{d.event_city}</span>
                              </div>
                              <div className="text-[10px] text-white/30 mt-1">
                                {new Date(d.event_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
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

              {total > 25 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 text-xs text-white/60">
                  <span>Showing {((page - 1) * 25) + 1}–{Math.min(page * 25, total)} of {total}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                      className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30">
                      Previous
                    </button>
                    <button onClick={() => setPage((p) => p + 1)} disabled={page * 25 >= total}
                      className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30">
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {assistantOpen && (
          <AgencyAssistantPanel summary={summary} deals={deals} onClose={() => setAssistantOpen(false)} />
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg border text-xs font-bold backdrop-blur-xl ${
          toast.kind === 'ok'
            ? 'bg-green-500/20 border-green-500/40 text-green-200'
            : 'bg-red-500/20 border-red-500/40 text-red-200'
        }`}>
          {toast.message}
        </div>
      )}
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
