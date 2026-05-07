'use client';

/**
 * Proposal-with-P&L (2026-05-05) — New proposal create flow (Phase 4).
 *
 * Captures the minimal client + event basics needed to spawn a draft, then
 * lands on the editor where the EC builds out line items.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '../../../../../lib/api-client';
import { analytics } from '../../../../../lib/analytics';

interface Workspace { id: string; name: string }

export default function NewProposalPage() {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    event_title: '',
    event_date: '',
    venue_text: '',
  });

  useEffect(() => {
    (async () => {
      const ws = await apiClient<Workspace[]>('/v1/workspaces');
      if (ws.success && Array.isArray(ws.data) && ws.data.length > 0) {
        setWorkspaceId(ws.data[0].id);
      } else {
        setError('No workspace found. Please complete onboarding.');
      }
    })();
  }, []);

  const update = (k: keyof typeof form, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    if (!form.client_name.trim() || !form.event_title.trim()) {
      setError('Client name and event title are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload: Record<string, string | null> = {
      client_name: form.client_name.trim(),
      event_title: form.event_title.trim(),
    };
    if (form.client_email.trim()) payload.client_email = form.client_email.trim();
    if (form.client_phone.trim()) payload.client_phone = form.client_phone.trim();
    if (form.event_date) payload.event_date = form.event_date;
    if (form.venue_text.trim()) payload.venue_text = form.venue_text.trim();

    const res = await apiClient<{ id: string }>(
      `/v1/workspaces/${workspaceId}/proposals`,
      { method: 'POST', body: JSON.stringify(payload) },
    );
    setSubmitting(false);
    if (!res.success) {
      setError(res.errors?.[0]?.message || 'Failed to create proposal');
      return;
    }
    const id = (res.data as { id?: string } | undefined)?.id;
    if (id) {
      analytics.trackEvent('proposal_created', { proposal_id: id });
      router.push(`/event-company/proposals/${id}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0e0f] text-white">
      <section className="max-w-2xl mx-auto px-6 py-10">
        <Link
          href="/event-company/proposals"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to proposals
        </Link>

        <div className="flex items-center gap-2 text-xs tracking-widest uppercase font-bold text-[#c39bff] mb-2">
          <FileText className="w-4 h-4" /> New proposal
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tighter mb-1">
          Who&apos;s this for?
        </h1>
        <p className="text-white/50 mb-8">
          Add the client and event basics. You&apos;ll build line items on the next screen.
        </p>

        <form onSubmit={submit} className="glass-card rounded-xl p-6 border border-white/5 space-y-4">
          <div>
            <label className="block text-xs tracking-widest uppercase font-bold text-white/60 mb-1.5">
              Client name *
            </label>
            <input
              value={form.client_name}
              onChange={(e) => update('client_name', e.target.value)}
              placeholder="Acme Pvt Ltd."
              className="input-nocturne w-full"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs tracking-widest uppercase font-bold text-white/60 mb-1.5">
                Client email
              </label>
              <input
                type="email"
                value={form.client_email}
                onChange={(e) => update('client_email', e.target.value)}
                placeholder="contact@acme.com"
                className="input-nocturne w-full"
              />
            </div>
            <div>
              <label className="block text-xs tracking-widest uppercase font-bold text-white/60 mb-1.5">
                Client phone
              </label>
              <input
                value={form.client_phone}
                onChange={(e) => update('client_phone', e.target.value)}
                placeholder="+91 …"
                className="input-nocturne w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs tracking-widest uppercase font-bold text-white/60 mb-1.5">
              Event title *
            </label>
            <input
              value={form.event_title}
              onChange={(e) => update('event_title', e.target.value)}
              placeholder="Acme Annual Gala 2026"
              className="input-nocturne w-full"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs tracking-widest uppercase font-bold text-white/60 mb-1.5">
                Event date
              </label>
              <input
                type="date"
                value={form.event_date}
                onChange={(e) => update('event_date', e.target.value)}
                className="input-nocturne w-full"
              />
            </div>
            <div>
              <label className="block text-xs tracking-widest uppercase font-bold text-white/60 mb-1.5">
                Venue
              </label>
              <input
                value={form.venue_text}
                onChange={(e) => update('venue_text', e.target.value)}
                placeholder="JW Marriott, Mumbai"
                className="input-nocturne w-full"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 text-sm p-3">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/event-company/proposals"
              className="btn-nocturne-secondary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || !workspaceId}
              className="btn-nocturne-primary disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create draft'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
