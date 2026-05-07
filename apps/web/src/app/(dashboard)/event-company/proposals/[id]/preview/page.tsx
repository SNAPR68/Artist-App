'use client';

/**
 * Proposal-with-P&L (2026-05-05) — Internal preview page (Phase 4).
 *
 * Renders the client-facing view from the EC's authenticated context, so they
 * can verify branding/layout before sending. No view-event is logged. No
 * Accept/Decline actions — preview is read-only.
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { apiClient } from '../../../../../../lib/api-client';

type ProposalStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'declined'
  | 'expired';

interface LineItem {
  id: string;
  category: string;
  description: string;
  qty: number | string;
  cost_paise: number | string;
  sell_paise: number | string;
}

interface Proposal {
  id: string;
  workspace_id: string;
  client_name: string;
  event_title: string;
  event_date: string | null;
  venue_text: string | null;
  status: ProposalStatus;
  valid_until: string | null;
  total_sell_paise: number | string;
  line_items: LineItem[];
}

interface Workspace {
  id: string;
  name: string;
  logo_url?: string | null;
  brand_color?: string | null;
}

const CATEGORY_LABEL: Record<string, string> = {
  artist: 'Artist',
  av: 'Sound, Lights & Stage',
  photo: 'Photo & Video',
  decor: 'Decor',
  license: 'Licensing',
  promoters: 'Promoters',
  transport: 'Transport',
  other: 'Other',
};

function formatINR(paise: number | string): string {
  const n = Number(paise) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function ProposalPreviewPage() {
  const params = useParams<{ id: string }>();
  const proposalId = params?.id;

  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const ws = await apiClient<Workspace[]>('/v1/workspaces');
      if (!ws.success || !Array.isArray(ws.data) || ws.data.length === 0) {
        setError('No workspace found.');
        setLoading(false);
        return;
      }
      const w = ws.data[0];
      setWorkspaceId(w.id);
      setWorkspace(w);

      const res = await apiClient<{ proposal: Proposal }>(
        `/v1/workspaces/${w.id}/proposals/${proposalId}`,
      );
      if (!res.success) {
        setError(res.errors?.[0]?.message || 'Failed to load proposal');
        setLoading(false);
        return;
      }
      const data = res.data as unknown as Proposal | { proposal: Proposal };
      const p = (data as { proposal?: Proposal }).proposal ?? (data as Proposal);
      setProposal(p);
      setLoading(false);
    })();
  }, [proposalId]);

  const accent = workspace?.brand_color || '#c39bff';

  const isTerminal = useMemo(
    () => proposal?.status === 'accepted' || proposal?.status === 'declined',
    [proposal],
  );
  const isExpired = useMemo(
    () =>
      proposal?.status === 'expired' ||
      (proposal?.valid_until && new Date(proposal.valid_until).getTime() < Date.now()),
    [proposal],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0e0f] text-white flex items-center justify-center">
        <div className="text-white/40 text-sm">Loading preview…</div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-[#0e0e0f] text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl font-bold mb-2">Preview unavailable</h1>
          <p className="text-white/50 text-sm mb-6">{error || 'Proposal not found.'}</p>
          {workspaceId && (
            <Link
              href={`/event-company/proposals/${proposalId}`}
              className="btn-nocturne-secondary inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to editor
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e0f] text-white">
      {/* Preview chrome */}
      <div className="border-b border-white/5 bg-[#1a191b]">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <Link
            href={`/event-company/proposals/${proposalId}`}
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Back to editor
          </Link>
          <div className="inline-flex items-center gap-2 text-xs tracking-widest uppercase font-bold text-[#a1faff] px-3 py-1 rounded-full border border-[#a1faff]/30 bg-[#a1faff]/10">
            <Eye className="w-3.5 h-3.5" /> Preview · what your client sees
          </div>
        </div>
      </div>

      {/* Branded header (mirrors /p/[token]) */}
      <header
        className="relative border-b border-white/5"
        style={{ backgroundColor: '#1a191b' }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: `radial-gradient(circle at 20% 0%, ${accent}33 0%, transparent 60%)`,
          }}
        />
        <div className="relative max-w-3xl mx-auto px-6 py-5 flex items-center gap-3">
          {workspace?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={workspace.logo_url}
              alt={workspace.name}
              className="w-10 h-10 rounded-lg object-cover border border-white/10"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm border border-white/10"
              style={{ backgroundColor: `${accent}22`, color: accent }}
            >
              {workspace?.name?.slice(0, 2).toUpperCase() || 'GR'}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-xs tracking-widest uppercase font-bold text-white/40">
              Proposal
            </div>
            <div className="font-display font-bold truncate">
              {workspace?.name || 'GRID'}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tighter mb-1">
          {proposal.event_title}
        </h1>
        <p className="text-white/60 text-sm sm:text-base">
          Prepared for <span className="text-white">{proposal.client_name}</span>
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="glass-card rounded-xl p-4 border border-white/5 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-white/40 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] tracking-widest uppercase font-bold text-white/40">
                Event date
              </div>
              <div className="font-medium truncate">
                {formatDate(proposal.event_date)}
              </div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 border border-white/5 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-white/40 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] tracking-widest uppercase font-bold text-white/40">
                Venue
              </div>
              <div className="font-medium truncate">
                {proposal.venue_text || 'To be confirmed'}
              </div>
            </div>
          </div>
        </div>

        {proposal.status === 'accepted' && (
          <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
            <div className="font-bold text-emerald-200">Proposal accepted</div>
          </div>
        )}
        {proposal.status === 'declined' && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-300 shrink-0 mt-0.5" />
            <div className="font-bold text-red-200">Proposal declined</div>
          </div>
        )}
        {isExpired && !isTerminal && (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
            <div className="font-bold text-amber-200">Expired</div>
          </div>
        )}

        <section className="mt-8">
          <h2 className="font-display text-xl font-bold mb-3">What&apos;s included</h2>
          <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
            <ul className="divide-y divide-white/5">
              {proposal.line_items.map((li) => (
                <li key={li.id} className="p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] tracking-widest uppercase font-bold text-white/40 mb-0.5">
                      {CATEGORY_LABEL[li.category] || li.category}
                    </div>
                    <div className="text-sm">{li.description}</div>
                    {Number(li.qty) > 1 && (
                      <div className="text-xs text-white/40 mt-0.5">
                        Qty: {Number(li.qty)}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0 font-display font-bold">
                    {formatINR(li.sell_paise)}
                  </div>
                </li>
              ))}
              {proposal.line_items.length === 0 && (
                <li className="p-6 text-center text-white/40 text-sm">
                  No line items yet. Add items in the editor before sending.
                </li>
              )}
            </ul>
            <div
              className="p-4 flex items-center justify-between border-t border-white/10"
              style={{ backgroundColor: `${accent}11` }}
            >
              <div className="text-xs tracking-widest uppercase font-bold text-white/60">
                Total
              </div>
              <div
                className="font-display text-2xl font-extrabold"
                style={{ color: accent }}
              >
                {formatINR(proposal.total_sell_paise)}
              </div>
            </div>
          </div>
        </section>

        {/* Mock CTAs (disabled in preview) */}
        <section className="mt-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-60 pointer-events-none">
            <button
              className="rounded-xl py-4 font-bold text-base border"
              style={{
                backgroundColor: accent,
                color: '#0e0e0f',
                borderColor: accent,
              }}
            >
              <CheckCircle2 className="w-5 h-5 inline-block mr-2 -mt-0.5" />
              Accept proposal
            </button>
            <button className="rounded-xl py-4 font-bold text-base border border-white/10 bg-white/5">
              <XCircle className="w-5 h-5 inline-block mr-2 -mt-0.5" />
              Decline
            </button>
          </div>
          <p className="mt-3 text-xs text-white/40 text-center">
            Buttons are disabled in preview — clients see fully working CTAs.
          </p>
        </section>

        <footer className="mt-12 pt-6 border-t border-white/5 flex items-center justify-between text-xs text-white/30">
          <div>Proposal #{proposal.id.slice(0, 8)}</div>
          <div>Powered by GRID</div>
        </footer>
      </main>
    </div>
  );
}
