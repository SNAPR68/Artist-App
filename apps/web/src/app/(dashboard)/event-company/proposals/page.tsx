'use client';

/**
 * Proposal-with-P&L (2026-05-05) — Proposals list page (Phase 4).
 *
 * Lists workspace proposals with status pill, margin %, client + event,
 * status tab filter, search, and a "New Proposal" CTA.
 */

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  TrendingUp,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';

type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';

interface ProposalRow {
  id: string;
  client_name: string;
  event_title: string;
  event_date: string | null;
  status: ProposalStatus;
  version: number;
  total_cost_paise: number | string;
  total_sell_paise: number | string;
  margin_pct: number | string | null;
  valid_until: string | null;
  sent_at: string | null;
  created_at: string;
}

interface Workspace { id: string; name: string }

const STATUS_STYLES: Record<ProposalStatus, { label: string; cls: string }> = {
  draft:    { label: 'Draft',    cls: 'bg-white/5 text-white/70 border-white/10' },
  sent:     { label: 'Sent',     cls: 'bg-[#c39bff]/10 text-[#c39bff] border-[#c39bff]/30' },
  viewed:   { label: 'Viewed',   cls: 'bg-[#a1faff]/10 text-[#a1faff] border-[#a1faff]/30' },
  accepted: { label: 'Accepted', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  declined: { label: 'Declined', cls: 'bg-red-500/10 text-red-300 border-red-500/30' },
  expired:  { label: 'Expired',  cls: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
};

const STATUS_TABS: Array<{ key: 'all' | ProposalStatus; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'sent', label: 'Sent' },
  { key: 'viewed', label: 'Viewed' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'declined', label: 'Declined' },
];

function formatINR(paise: number | string): string {
  const n = Number(paise) / 100;
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n.toFixed(0)}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ProposalsListPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [rows, setRows] = useState<ProposalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | ProposalStatus>('all');
  const [q, setQ] = useState('');

  const load = useCallback(
    async (wid: string, status: 'all' | ProposalStatus, search: string) => {
      setLoading(true);
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      if (search.trim()) params.set('q', search.trim());
      const url = `/v1/workspaces/${wid}/proposals${
        params.toString() ? `?${params.toString()}` : ''
      }`;
      const res = await apiClient<{ data: ProposalRow[] }>(url);
      if (res.success) {
        const payload = res.data as unknown as ProposalRow[] | { data?: ProposalRow[] };
        const list: ProposalRow[] = Array.isArray(payload) ? payload : (payload?.data ?? []);
        setRows(list);
        setError(null);
      } else {
        setError(res.errors?.[0]?.message || 'Failed to load proposals');
      }
      setLoading(false);
    },
    [],
  );

  useEffect(() => {
    (async () => {
      const ws = await apiClient<Workspace[]>('/v1/workspaces');
      if (ws.success && Array.isArray(ws.data) && ws.data.length > 0) {
        setWorkspaceId(ws.data[0].id);
        await load(ws.data[0].id, 'all', '');
      } else {
        setLoading(false);
        setError('No workspace found. Please complete onboarding.');
      }
    })();
  }, [load]);

  useEffect(() => {
    if (!workspaceId) return;
    const t = setTimeout(() => load(workspaceId, tab, q), 250);
    return () => clearTimeout(t);
  }, [workspaceId, tab, q, load]);

  return (
    <div className="min-h-screen bg-[#0e0e0f] text-white">
      {/* Hero */}
      <section className="relative border-b border-white/5 bg-[#1a191b]">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 py-10 relative">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs tracking-widest uppercase font-bold text-[#c39bff] mb-2">
                <FileText className="w-4 h-4" /> Proposals
              </div>
              <h1 className="font-display text-4xl font-extrabold tracking-tighter">
                Priced proposals with margin
              </h1>
              <p className="text-white/50 mt-2 max-w-xl">
                Build a client-facing quote with cost + sell on every line. Send, track views,
                and convert accepted proposals straight into an Event File.
              </p>
            </div>
            <Link
              href="/event-company/proposals/new"
              className="btn-nocturne-primary inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> New Proposal
            </Link>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#1a191b] border border-white/5">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 text-xs font-bold tracking-wide rounded-md transition ${
                  tab === t.key
                    ? 'bg-[#c39bff]/20 text-[#c39bff]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by client or event title…"
              className="input-nocturne w-full pl-10"
            />
          </div>
        </div>
      </section>

      {/* List */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        {loading && (
          <div className="text-center py-16 text-white/40">Loading proposals…</div>
        )}

        {!loading && error && (
          <div className="glass-card rounded-xl p-8 border border-red-500/20 text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="glass-card rounded-xl p-12 border border-white/5 text-center">
            <FileText className="w-10 h-10 text-white/30 mx-auto mb-3" />
            <h3 className="font-display text-xl font-bold mb-1">No proposals yet</h3>
            <p className="text-white/50 text-sm mb-6">
              Build your first priced quote with cost, sell, and margin tracking.
            </p>
            <Link
              href="/event-company/proposals/new"
              className="btn-nocturne-primary inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create proposal
            </Link>
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="space-y-2">
            {rows.map((p) => {
              const status = STATUS_STYLES[p.status] ?? STATUS_STYLES.draft;
              const margin = p.margin_pct == null ? '—' : `${Number(p.margin_pct).toFixed(1)}%`;
              return (
                <Link
                  key={p.id}
                  href={`/event-company/proposals/${p.id}`}
                  className="group block glass-card rounded-xl p-5 border border-white/5 hover:border-[#c39bff]/30 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display text-lg font-bold truncate">
                          {p.event_title}
                        </h3>
                        <span
                          className={`text-[10px] tracking-widest uppercase font-bold px-2 py-0.5 rounded border ${status.cls}`}
                        >
                          {status.label}
                        </span>
                        {p.version > 1 && (
                          <span className="text-[10px] tracking-widest uppercase font-bold px-2 py-0.5 rounded border bg-white/5 text-white/60 border-white/10">
                            v{p.version}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-white/50 mt-1">
                        For {p.client_name}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" /> {formatDate(p.event_date)}
                        </span>
                        {p.valid_until && (
                          <span>Valid until {formatDate(p.valid_until)}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs tracking-widest uppercase font-bold text-white/40">
                        Sell
                      </div>
                      <div className="font-display text-2xl font-extrabold">
                        {formatINR(p.total_sell_paise)}
                      </div>
                      <div className="inline-flex items-center gap-1 text-xs text-emerald-300 mt-1">
                        <TrendingUp className="w-3 h-3" /> {margin} margin
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-[#c39bff] transition" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
