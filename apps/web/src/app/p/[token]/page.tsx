'use client';

/**
 * Proposal-with-P&L (2026-05-05) — Public client accept page (Phase 4).
 *
 * NO LOGIN. Mounted at /p/:token. Hits /v1/public/proposals/:token (no auth).
 * Mobile-first, branded with workspace name + brand_color, big Accept/Decline
 * CTAs, valid_until countdown, view-on-mount.
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  XCircle,
  FileText,
  Calendar,
  MapPin,
  Clock,
  Download,
  ShieldCheck,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type ProposalStatus = 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';

interface PublicLineItem {
  id: string;
  category: string;
  description: string;
  qty: number | string;
  sell_paise: number | string;
}

interface PublicProposal {
  id: string;
  client_name: string;
  event_title: string;
  event_date: string | null;
  venue_text: string | null;
  status: ProposalStatus;
  valid_until: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  total_sell_paise: number | string;
  line_items: PublicLineItem[];
}

interface PublicWorkspace {
  name: string;
  logo_url: string | null;
  brand_color: string | null;
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

function useCountdown(target: string | null): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, [target]);
  return useMemo(() => {
    if (!target) return null;
    const ms = new Date(target).getTime() - now;
    if (ms <= 0) return 'Expired';
    const days = Math.floor(ms / 86_400_000);
    const hours = Math.floor((ms % 86_400_000) / 3_600_000);
    if (days > 0) return `${days}d ${hours}h left`;
    const mins = Math.floor((ms % 3_600_000) / 60_000);
    return `${hours}h ${mins}m left`;
  }, [target, now]);
}

export default function PublicProposalPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [proposal, setProposal] = useState<PublicProposal | null>(null);
  const [workspace, setWorkspace] = useState<PublicWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<'accept' | 'decline' | null>(null);
  const [confirmAction, setConfirmAction] = useState<'accept' | 'decline' | null>(null);
  const [clientName, setClientName] = useState('');
  const [declineReason, setDeclineReason] = useState('');

  const countdown = useCountdown(proposal?.valid_until ?? null);

  // Load + log view
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/v1/public/proposals/${token}`, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.success) {
          setError(json.errors?.[0]?.message || 'Proposal not found');
          setLoading(false);
          return;
        }
        setProposal(json.data.proposal);
        setWorkspace(json.data.workspace);
        setClientName(json.data.proposal.client_name || '');
        setLoading(false);
        // Fire-and-forget view log
        fetch(`${API_BASE}/v1/public/proposals/${token}/view`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        }).catch(() => {});
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Failed to load proposal';
        setError(msg);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const accent = workspace?.brand_color || '#c39bff';

  const submitAccept = async () => {
    if (!token) return;
    setActing('accept');
    const res = await fetch(`${API_BASE}/v1/public/proposals/${token}/accept`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ client_name: clientName.trim() || undefined }),
    });
    const json = await res.json();
    setActing(null);
    setConfirmAction(null);
    if (!res.ok || !json.success) {
      setError(json.errors?.[0]?.message || 'Failed to accept');
      return;
    }
    setProposal((p) =>
      p ? { ...p, status: 'accepted', accepted_at: json.data.accepted_at } : p,
    );
    const phA = (window as unknown as { posthog?: { capture: (e: string, p?: Record<string, unknown>) => void } }).posthog;
    phA?.capture('proposal_accepted', { proposal_id: json.data.id });
  };

  const submitDecline = async () => {
    if (!token) return;
    setActing('decline');
    const res = await fetch(`${API_BASE}/v1/public/proposals/${token}/decline`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: declineReason.trim() || undefined }),
    });
    const json = await res.json();
    setActing(null);
    setConfirmAction(null);
    if (!res.ok || !json.success) {
      setError(json.errors?.[0]?.message || 'Failed to decline');
      return;
    }
    setProposal((p) =>
      p ? { ...p, status: 'declined', declined_at: json.data.declined_at } : p,
    );
    const phD = (window as unknown as { posthog?: { capture: (e: string, p?: Record<string, unknown>) => void } }).posthog;
    phD?.capture('proposal_declined', { proposal_id: json.data.id });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0e0f] text-white flex items-center justify-center">
        <div className="text-white/40 text-sm">Loading proposal…</div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-[#0e0e0f] text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <FileText className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">Proposal unavailable</h1>
          <p className="text-white/50 text-sm">
            {error || 'This proposal link is no longer valid.'}
          </p>
        </div>
      </div>
    );
  }

  const isTerminal = proposal.status === 'accepted' || proposal.status === 'declined';
  const isExpired =
    proposal.status === 'expired' ||
    (proposal.valid_until && new Date(proposal.valid_until).getTime() < Date.now());

  return (
    <div className="min-h-screen bg-[#0e0e0f] text-white">
      {/* Branded header */}
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
        <div className="relative max-w-3xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
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
          {countdown && !isTerminal && !isExpired && (
            <div className="hidden sm:inline-flex items-center gap-1.5 text-xs text-white/60 px-3 py-1.5 rounded-full border border-white/10 bg-white/5">
              <Clock className="w-3.5 h-3.5" /> {countdown}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Title */}
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tighter mb-1">
          {proposal.event_title}
        </h1>
        <p className="text-white/60 text-sm sm:text-base">
          Prepared for <span className="text-white">{proposal.client_name}</span>
        </p>

        {/* Event facts */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="glass-card rounded-xl p-4 border border-white/5 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-white/40 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] tracking-widest uppercase font-bold text-white/40">
                Event date
              </div>
              <div className="font-medium truncate">{formatDate(proposal.event_date)}</div>
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

        {/* Status banners */}
        {proposal.status === 'accepted' && (
          <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-emerald-200">Proposal accepted</div>
              <div className="text-emerald-200/80 text-sm">
                Accepted on {formatDate(proposal.accepted_at)}. The team will be in touch
                shortly to confirm next steps.
              </div>
            </div>
          </div>
        )}
        {proposal.status === 'declined' && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-300 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-red-200">Proposal declined</div>
              <div className="text-red-200/80 text-sm">
                Declined on {formatDate(proposal.declined_at)}.
              </div>
            </div>
          </div>
        )}
        {isExpired && !isTerminal && (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-200">This proposal has expired</div>
              <div className="text-amber-200/80 text-sm">
                Validity ended on {formatDate(proposal.valid_until)}. Please contact{' '}
                {workspace?.name || 'the team'} for a refreshed quote.
              </div>
            </div>
          </div>
        )}

        {/* Line items */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl font-bold">What&apos;s included</h2>
            <a
              href={`${API_BASE}/v1/public/proposals/${token}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white px-3 py-1.5 rounded-md border border-white/10 bg-white/5"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </a>
          </div>

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
                  No line items.
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
              <div className="font-display text-2xl font-extrabold" style={{ color: accent }}>
                {formatINR(proposal.total_sell_paise)}
              </div>
            </div>
          </div>
        </section>

        {/* Accept / Decline */}
        {!isTerminal && !isExpired && (
          <section className="mt-8">
            {!confirmAction && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setConfirmAction('accept')}
                  className="rounded-xl py-4 font-bold text-base transition border"
                  style={{
                    backgroundColor: accent,
                    color: '#0e0e0f',
                    borderColor: accent,
                  }}
                >
                  <CheckCircle2 className="w-5 h-5 inline-block mr-2 -mt-0.5" />
                  Accept proposal
                </button>
                <button
                  onClick={() => setConfirmAction('decline')}
                  className="rounded-xl py-4 font-bold text-base transition border border-white/10 bg-white/5 hover:bg-white/10"
                >
                  <XCircle className="w-5 h-5 inline-block mr-2 -mt-0.5" />
                  Decline
                </button>
              </div>
            )}

            {confirmAction === 'accept' && (
              <div className="glass-card rounded-xl p-5 border border-white/5 space-y-4">
                <div>
                  <h3 className="font-display text-lg font-bold mb-1">Confirm acceptance</h3>
                  <p className="text-white/60 text-sm">
                    By accepting, you agree to proceed with this scope at the quoted price.
                    {workspace?.name && ` ${workspace.name}`} will reach out to confirm
                    next steps.
                  </p>
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase font-bold text-white/60 mb-1.5">
                    Your name (for record)
                  </label>
                  <input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Your full name"
                    className="input-nocturne w-full"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  We log your IP and timestamp for the audit trail.
                </div>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setConfirmAction(null)}
                    disabled={acting === 'accept'}
                    className="btn-nocturne-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitAccept}
                    disabled={acting === 'accept'}
                    className="rounded-md px-5 py-2 font-bold text-sm disabled:opacity-50"
                    style={{ backgroundColor: accent, color: '#0e0e0f' }}
                  >
                    {acting === 'accept' ? 'Accepting…' : 'Confirm accept'}
                  </button>
                </div>
              </div>
            )}

            {confirmAction === 'decline' && (
              <div className="glass-card rounded-xl p-5 border border-white/5 space-y-4">
                <div>
                  <h3 className="font-display text-lg font-bold mb-1">Decline proposal</h3>
                  <p className="text-white/60 text-sm">
                    A short reason helps {workspace?.name || 'the team'} respond well.
                  </p>
                </div>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Optional — what's not working?"
                  rows={3}
                  className="input-nocturne w-full resize-none"
                />
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setConfirmAction(null)}
                    disabled={acting === 'decline'}
                    className="btn-nocturne-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitDecline}
                    disabled={acting === 'decline'}
                    className="rounded-md px-5 py-2 font-bold text-sm bg-red-500/20 text-red-200 border border-red-500/30 disabled:opacity-50"
                  >
                    {acting === 'decline' ? 'Declining…' : 'Confirm decline'}
                  </button>
                </div>
              </div>
            )}

            {countdown && (
              <div className="mt-4 sm:hidden inline-flex items-center gap-1.5 text-xs text-white/60 px-3 py-1.5 rounded-full border border-white/10 bg-white/5">
                <Clock className="w-3.5 h-3.5" /> {countdown}
              </div>
            )}
          </section>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-white/5 flex items-center justify-between text-xs text-white/30">
          <div>Proposal #{proposal.id.slice(0, 8)}</div>
          <div>Powered by GRID</div>
        </footer>
      </main>
    </div>
  );
}
