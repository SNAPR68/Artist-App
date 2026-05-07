'use client';

/**
 * Proposal-with-P&L (2026-05-05) — Proposal editor (Phase 4).
 *
 * Lock state: header editable on draft+sent (limited fields when sent),
 * line items editable on draft only. Sidebar holds Send / New Version /
 * Convert-to-Event-File. Live totals + margin% rendered at the bottom.
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Send,
  GitBranch,
  FolderOpen,
  Eye,
  Download,
  Copy as CopyIcon,
} from 'lucide-react';
import { apiClient } from '../../../../../lib/api-client';
import { analytics } from '../../../../../lib/analytics';

type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';
type Category = 'artist' | 'av' | 'photo' | 'decor' | 'license' | 'promoters' | 'transport' | 'other';

interface LineItem {
  id: string;
  category: Category;
  description: string;
  notes: string | null;
  qty: number | string;
  cost_paise: number | string;
  sell_paise: number | string;
  sort_order: number;
}

interface ProposalEvent {
  id: string;
  event_type: string;
  meta: Record<string, unknown> | null;
  created_at: string;
}

interface Proposal {
  id: string;
  workspace_id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  event_title: string;
  event_date: string | null;
  venue_text: string | null;
  status: ProposalStatus;
  version: number;
  parent_proposal_id: string | null;
  total_cost_paise: number | string;
  total_sell_paise: number | string;
  margin_pct: number | string | null;
  valid_until: string | null;
  public_token: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  line_items: LineItem[];
  events: ProposalEvent[];
}

interface Workspace { id: string; name: string }

const CATEGORIES: Category[] = ['artist', 'av', 'photo', 'decor', 'license', 'promoters', 'transport', 'other'];

const STATUS_STYLES: Record<ProposalStatus, { label: string; cls: string }> = {
  draft:    { label: 'Draft',    cls: 'bg-white/5 text-white/70 border-white/10' },
  sent:     { label: 'Sent',     cls: 'bg-[#c39bff]/10 text-[#c39bff] border-[#c39bff]/30' },
  viewed:   { label: 'Viewed',   cls: 'bg-[#a1faff]/10 text-[#a1faff] border-[#a1faff]/30' },
  accepted: { label: 'Accepted', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  declined: { label: 'Declined', cls: 'bg-red-500/10 text-red-300 border-red-500/30' },
  expired:  { label: 'Expired',  cls: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
};

function fmtINR(paise: number | string): string {
  const n = Number(paise) / 100;
  return n.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });
}

function fmtMargin(cost: number, sell: number): string {
  if (sell <= 0) return '—';
  return `${(((sell - cost) / sell) * 100).toFixed(1)}%`;
}

export default function ProposalEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const proposalId = params.id;

  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const isDraft = proposal?.status === 'draft';
  const editableHeader = proposal?.status === 'draft' || proposal?.status === 'sent';

  const reload = useCallback(async (wid: string) => {
    const res = await apiClient<Proposal>(`/v1/workspaces/${wid}/proposals/${proposalId}`);
    if (!res.success) {
      setError(res.errors?.[0]?.message || 'Failed to load proposal');
      return null;
    }
    const data = res.data as unknown as Proposal | { data: Proposal };
    const p = (data as { data?: Proposal }).data ?? (data as Proposal);
    setProposal(p as Proposal);
    setError(null);
    return p as Proposal;
  }, [proposalId]);

  useEffect(() => {
    (async () => {
      const ws = await apiClient<Workspace[]>('/v1/workspaces');
      if (!(ws.success && Array.isArray(ws.data) && ws.data.length > 0)) {
        setError('No workspace found.');
        setLoading(false);
        return;
      }
      const wid = ws.data[0].id;
      setWorkspaceId(wid);
      await reload(wid);
      setLoading(false);
    })();
  }, [reload]);

  const totals = useMemo(() => {
    if (!proposal) return { cost: 0, sell: 0 };
    let cost = 0;
    let sell = 0;
    for (const li of proposal.line_items) {
      const qty = Number(li.qty);
      cost += Number(li.cost_paise) * qty;
      sell += Number(li.sell_paise) * qty;
    }
    return { cost, sell };
  }, [proposal]);

  // ─── Header autosave ──────────────────────────────────────────
  const updateHeader = async (patch: Partial<Proposal>) => {
    if (!workspaceId || !proposal) return;
    setProposal({ ...proposal, ...patch });
    const res = await apiClient(
      `/v1/workspaces/${workspaceId}/proposals/${proposalId}`,
      { method: 'PATCH', body: JSON.stringify(patch) },
    );
    if (!res.success) setError(res.errors?.[0]?.message || 'Save failed');
  };

  // ─── Line item ops ────────────────────────────────────────────
  const addLine = async () => {
    if (!workspaceId || !isDraft) return;
    setBusy(true);
    const payload = {
      category: 'artist',
      description: 'New item',
      qty: 1,
      cost_paise: 0,
      sell_paise: 0,
    };
    await apiClient(
      `/v1/workspaces/${workspaceId}/proposals/${proposalId}/line-items`,
      { method: 'POST', body: JSON.stringify(payload) },
    );
    await reload(workspaceId);
    setBusy(false);
  };

  const updateLine = async (id: string, patch: Partial<LineItem>) => {
    if (!workspaceId || !isDraft || !proposal) return;
    setProposal({
      ...proposal,
      line_items: proposal.line_items.map((li) => (li.id === id ? { ...li, ...patch } : li)),
    });
    await apiClient(
      `/v1/workspaces/${workspaceId}/proposals/${proposalId}/line-items/${id}`,
      { method: 'PATCH', body: JSON.stringify(patch) },
    );
  };

  const removeLine = async (id: string) => {
    if (!workspaceId || !isDraft) return;
    await apiClient(
      `/v1/workspaces/${workspaceId}/proposals/${proposalId}/line-items/${id}`,
      { method: 'DELETE' },
    );
    if (workspaceId) await reload(workspaceId);
  };

  // ─── Workflow actions ─────────────────────────────────────────
  const sendProposal = async () => {
    if (!workspaceId || !proposal) return;
    setBusy(true);
    const res = await apiClient<{ public_url: string; public_token: string }>(
      `/v1/workspaces/${workspaceId}/proposals/${proposalId}/send`,
      { method: 'POST' },
    );
    if (res.success) {
      const d = res.data as { public_url?: string; data?: { public_url?: string } } | undefined;
      const url = d?.public_url || d?.data?.public_url;
      setShareUrl(url || null);
      analytics.trackEvent('proposal_sent', { proposal_id: proposalId });
      await reload(workspaceId);
    } else {
      setError(res.errors?.[0]?.message || 'Send failed');
    }
    setBusy(false);
  };

  const newVersion = async () => {
    if (!workspaceId) return;
    setBusy(true);
    const res = await apiClient<{ id: string }>(
      `/v1/workspaces/${workspaceId}/proposals/${proposalId}/version`,
      { method: 'POST' },
    );
    setBusy(false);
    if (res.success) {
      const dv = res.data as { id?: string; data?: { id?: string } } | undefined;
      const newId = dv?.id || dv?.data?.id;
      analytics.trackEvent('proposal_versioned', { from_id: proposalId, new_id: newId });
      if (newId) router.push(`/event-company/proposals/${newId}`);
    } else {
      setError(res.errors?.[0]?.message || 'Version failed');
    }
  };

  const convertToEventFile = async () => {
    if (!workspaceId) return;
    if (!confirm('Convert this proposal to an Event File? Line items will be copied as the BOQ.')) return;
    setBusy(true);
    const res = await apiClient<{ event_file_id: string }>(
      `/v1/workspaces/${workspaceId}/proposals/${proposalId}/convert-to-event-file`,
      { method: 'POST' },
    );
    setBusy(false);
    if (res.success) {
      const dc = res.data as { event_file_id?: string; data?: { event_file_id?: string } } | undefined;
      const efId = dc?.event_file_id || dc?.data?.event_file_id;
      analytics.trackEvent('proposal_converted', { proposal_id: proposalId, event_file_id: efId });
      if (efId) router.push(`/event-company/event-files/${efId}`);
    } else {
      setError(res.errors?.[0]?.message || 'Convert failed');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0e0e0f] text-white/50 px-6 py-10">Loading…</div>;
  }
  if (error && !proposal) {
    return (
      <div className="min-h-screen bg-[#0e0e0f] text-red-300 px-6 py-10">{error}</div>
    );
  }
  if (!proposal) return null;

  const status = STATUS_STYLES[proposal.status];

  return (
    <div className="min-h-screen bg-[#0e0e0f] text-white">
      <section className="max-w-7xl mx-auto px-6 py-8">
        <Link
          href="/event-company/proposals"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> All proposals
        </Link>

        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-[280px]">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-[10px] tracking-widest uppercase font-bold px-2 py-0.5 rounded border ${status.cls}`}
              >
                {status.label}
              </span>
              {proposal.version > 1 && (
                <span className="text-[10px] tracking-widest uppercase font-bold px-2 py-0.5 rounded border bg-white/5 text-white/60 border-white/10">
                  v{proposal.version}
                </span>
              )}
            </div>
            <input
              value={proposal.event_title}
              onChange={(e) => setProposal({ ...proposal, event_title: e.target.value })}
              onBlur={(e) => editableHeader && updateHeader({ event_title: e.target.value })}
              disabled={!editableHeader}
              className="font-display text-3xl font-extrabold tracking-tighter bg-transparent border-none outline-none w-full disabled:opacity-70"
            />
            <input
              value={proposal.client_name}
              onChange={(e) => setProposal({ ...proposal, client_name: e.target.value })}
              onBlur={(e) => editableHeader && updateHeader({ client_name: e.target.value })}
              disabled={!editableHeader}
              className="text-white/50 bg-transparent border-none outline-none w-full mt-1 disabled:opacity-70"
              placeholder="Client name"
            />
          </div>
        </div>

        {shareUrl && (
          <div className="mt-4 glass-card rounded-xl p-4 border border-[#c39bff]/30 bg-[#c39bff]/5 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs tracking-widest uppercase font-bold text-[#c39bff]">
                Shareable link
              </div>
              <div className="text-sm text-white/80 truncate">{shareUrl}</div>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(shareUrl)}
              className="btn-nocturne-secondary inline-flex items-center gap-2"
            >
              <CopyIcon className="w-4 h-4" /> Copy
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Proposal for ${proposal.event_title}: ${shareUrl}`)}`}
              target="_blank"
              rel="noreferrer"
              className="btn-nocturne-primary"
            >
              WhatsApp
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* Left: header + line items */}
          <div className="lg:col-span-8 space-y-6">
            {/* Header fields */}
            <div className="glass-card rounded-xl p-5 border border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs tracking-widest uppercase font-bold text-white/60 mb-1.5">
                  Client email
                </label>
                <input
                  value={proposal.client_email ?? ''}
                  onChange={(e) =>
                    setProposal({ ...proposal, client_email: e.target.value || null })
                  }
                  onBlur={(e) =>
                    editableHeader && updateHeader({ client_email: e.target.value || null })
                  }
                  disabled={!editableHeader}
                  className="input-nocturne w-full disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs tracking-widest uppercase font-bold text-white/60 mb-1.5">
                  Event date
                </label>
                <input
                  type="date"
                  value={proposal.event_date ?? ''}
                  onChange={(e) =>
                    setProposal({ ...proposal, event_date: e.target.value || null })
                  }
                  onBlur={(e) =>
                    editableHeader && updateHeader({ event_date: e.target.value || null })
                  }
                  disabled={!editableHeader}
                  className="input-nocturne w-full disabled:opacity-60"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs tracking-widest uppercase font-bold text-white/60 mb-1.5">
                  Venue
                </label>
                <input
                  value={proposal.venue_text ?? ''}
                  onChange={(e) =>
                    setProposal({ ...proposal, venue_text: e.target.value || null })
                  }
                  onBlur={(e) =>
                    editableHeader && updateHeader({ venue_text: e.target.value || null })
                  }
                  disabled={!editableHeader}
                  className="input-nocturne w-full disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs tracking-widest uppercase font-bold text-white/60 mb-1.5">
                  Valid until
                </label>
                <input
                  type="date"
                  value={proposal.valid_until ?? ''}
                  onChange={(e) =>
                    setProposal({ ...proposal, valid_until: e.target.value || null })
                  }
                  onBlur={(e) =>
                    editableHeader && updateHeader({ valid_until: e.target.value || null })
                  }
                  disabled={!editableHeader}
                  className="input-nocturne w-full disabled:opacity-60"
                />
              </div>
            </div>

            {/* Line items */}
            <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <h3 className="font-display text-lg font-bold">Line items</h3>
                {isDraft && (
                  <button
                    onClick={addLine}
                    disabled={busy}
                    className="btn-nocturne-secondary inline-flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" /> Add row
                  </button>
                )}
              </div>

              {proposal.line_items.length === 0 ? (
                <div className="p-8 text-center text-white/40">
                  No line items yet. Add the artist, AV, photo, decor, and licensing rows.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-[10px] tracking-widest uppercase font-bold text-white/40">
                      <tr className="border-b border-white/5">
                        <th className="px-3 py-2 text-left">Category</th>
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-3 py-2 text-right w-16">Qty</th>
                        <th className="px-3 py-2 text-right">Cost (₹)</th>
                        <th className="px-3 py-2 text-right">Sell (₹)</th>
                        <th className="px-3 py-2 text-right w-20">Margin</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {proposal.line_items.map((li) => {
                        const qty = Number(li.qty);
                        const lineCost = Number(li.cost_paise) * qty;
                        const lineSell = Number(li.sell_paise) * qty;
                        return (
                          <tr key={li.id} className="border-b border-white/5">
                            <td className="px-3 py-2">
                              <select
                                value={li.category}
                                onChange={(e) =>
                                  updateLine(li.id, { category: e.target.value as Category })
                                }
                                disabled={!isDraft}
                                className="bg-transparent text-white text-sm outline-none disabled:opacity-60"
                              >
                                {CATEGORIES.map((c) => (
                                  <option key={c} value={c} className="bg-[#1a191b]">
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                value={li.description}
                                onChange={(e) =>
                                  setProposal({
                                    ...proposal,
                                    line_items: proposal.line_items.map((x) =>
                                      x.id === li.id ? { ...x, description: e.target.value } : x,
                                    ),
                                  })
                                }
                                onBlur={(e) =>
                                  isDraft && updateLine(li.id, { description: e.target.value })
                                }
                                disabled={!isDraft}
                                className="bg-transparent w-full outline-none disabled:opacity-60"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                min={1}
                                value={qty}
                                onChange={(e) =>
                                  setProposal({
                                    ...proposal,
                                    line_items: proposal.line_items.map((x) =>
                                      x.id === li.id ? { ...x, qty: e.target.value } : x,
                                    ),
                                  })
                                }
                                onBlur={(e) =>
                                  isDraft && updateLine(li.id, { qty: Number(e.target.value) })
                                }
                                disabled={!isDraft}
                                className="bg-transparent w-full text-right outline-none disabled:opacity-60"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                min={0}
                                value={Number(li.cost_paise) / 100}
                                onChange={(e) =>
                                  setProposal({
                                    ...proposal,
                                    line_items: proposal.line_items.map((x) =>
                                      x.id === li.id
                                        ? { ...x, cost_paise: Math.round(Number(e.target.value) * 100) }
                                        : x,
                                    ),
                                  })
                                }
                                onBlur={(e) =>
                                  isDraft &&
                                  updateLine(li.id, {
                                    cost_paise: Math.round(Number(e.target.value) * 100),
                                  })
                                }
                                disabled={!isDraft}
                                className="bg-transparent w-full text-right outline-none disabled:opacity-60"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                min={0}
                                value={Number(li.sell_paise) / 100}
                                onChange={(e) =>
                                  setProposal({
                                    ...proposal,
                                    line_items: proposal.line_items.map((x) =>
                                      x.id === li.id
                                        ? { ...x, sell_paise: Math.round(Number(e.target.value) * 100) }
                                        : x,
                                    ),
                                  })
                                }
                                onBlur={(e) =>
                                  isDraft &&
                                  updateLine(li.id, {
                                    sell_paise: Math.round(Number(e.target.value) * 100),
                                  })
                                }
                                disabled={!isDraft}
                                className="bg-transparent w-full text-right outline-none disabled:opacity-60"
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-emerald-300">
                              {fmtMargin(lineCost, lineSell)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {isDraft && (
                                <button
                                  onClick={() => removeLine(li.id)}
                                  className="text-white/40 hover:text-red-400 transition"
                                  aria-label="Remove line"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-white/5">
                        <td colSpan={3} className="px-3 py-3 text-right text-xs tracking-widest uppercase font-bold text-white/60">
                          Totals
                        </td>
                        <td className="px-3 py-3 text-right font-bold">{fmtINR(totals.cost)}</td>
                        <td className="px-3 py-3 text-right font-bold">{fmtINR(totals.sell)}</td>
                        <td className="px-3 py-3 text-right font-bold text-emerald-300">
                          {fmtMargin(totals.cost, totals.sell)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right: actions + timeline */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="glass-card rounded-xl p-5 border border-white/5 space-y-3">
              <h3 className="font-display text-lg font-bold mb-2">Actions</h3>
              {isDraft && (
                <button
                  onClick={sendProposal}
                  disabled={busy || proposal.line_items.length === 0}
                  className="btn-nocturne-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" /> Send to client
                </button>
              )}
              {(proposal.status === 'sent' || proposal.status === 'viewed') && (
                <>
                  <button
                    onClick={sendProposal}
                    disabled={busy}
                    className="btn-nocturne-secondary w-full inline-flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Re-send / get share link
                  </button>
                </>
              )}
              <Link
                href={`/event-company/proposals/${proposal.id}/preview`}
                className="btn-nocturne-secondary w-full inline-flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" /> Preview client view
              </Link>
              {workspaceId && (
                <a
                  href={`/api/proposals-pdf-proxy?wid=${workspaceId}&pid=${proposal.id}&mode=internal`}
                  className="btn-nocturne-secondary w-full inline-flex items-center justify-center gap-2"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download className="w-4 h-4" /> Internal PDF
                </a>
              )}
              <button
                onClick={newVersion}
                disabled={busy}
                className="btn-nocturne-secondary w-full inline-flex items-center justify-center gap-2"
              >
                <GitBranch className="w-4 h-4" /> New version
              </button>
              {proposal.status === 'accepted' && (
                <button
                  onClick={convertToEventFile}
                  disabled={busy}
                  className="btn-nocturne-accent w-full inline-flex items-center justify-center gap-2"
                >
                  <FolderOpen className="w-4 h-4" /> Convert to Event File
                </button>
              )}
            </div>

            <div className="glass-card rounded-xl p-5 border border-white/5">
              <h3 className="font-display text-lg font-bold mb-3">Timeline</h3>
              {proposal.events.length === 0 ? (
                <div className="text-sm text-white/40">No activity yet.</div>
              ) : (
                <ul className="space-y-3">
                  {proposal.events.map((e) => (
                    <li key={e.id} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#c39bff] mt-2 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold capitalize">
                          {e.event_type.replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs text-white/40">
                          {new Date(e.created_at).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 text-sm p-3">
                {error}
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
