'use client';

import { useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { analytics } from '@/lib/analytics';

const TOPICS = [
  { value: 'deal_help', label: 'Help with a live deal', desc: 'Stuck in negotiation or need a second pair of hands' },
  { value: 'artist_sourcing', label: 'Source artists for a brief', desc: 'Need curated options beyond search' },
  { value: 'negotiation', label: 'Run a negotiation', desc: 'We handle the back-and-forth with the artist' },
  { value: 'compliance', label: 'GST / TDS / contract question', desc: 'Compliance review before invoicing' },
  { value: 'other', label: 'Something else', desc: 'Tell us in the notes' },
] as const;

type Topic = typeof TOPICS[number]['value'];

export function ConciergeRequestModal({
  workspaceId,
  onClose,
}: {
  workspaceId: string;
  onClose: () => void;
}) {
  const [topic, setTopic] = useState<Topic>('deal_help');
  const [notes, setNotes] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [budget, setBudget] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (notes.trim().length < 10) {
      setError('Please add a bit more context (min 10 characters)');
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await apiClient('/v1/concierge/requests', {
      method: 'POST',
      body: JSON.stringify({
        workspace_id: workspaceId,
        topic,
        notes: notes.trim(),
        event_date: eventDate || undefined,
        budget_paise: budget ? Math.round(Number(budget) * 100) : undefined,
      }),
    });
    setSubmitting(false);
    if (!res.success) {
      setError(res.errors?.[0]?.message ?? 'Failed to submit request');
      return;
    }
    analytics.trackEvent('concierge_request_submitted', { topic });
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-lg rounded-2xl border border-[#c39bff]/30 bg-[#1a191b] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/20 blur-[100px] rounded-full pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="relative p-10 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#c39bff]/20 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-[#c39bff]" />
            </div>
            <h2 className="text-xl font-display font-bold text-white mb-2">Request received</h2>
            <p className="text-sm text-white/60 mb-6">
              A concierge specialist will reach out within 24 hours. We&apos;ll message you on WhatsApp and email.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-white text-[#0e0e0f] text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="relative p-8">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-[#c39bff]" />
              <span className="text-[10px] uppercase tracking-widest text-[#c39bff] font-bold">Concierge</span>
            </div>
            <h2 className="text-xl font-display font-bold text-white mb-1">Ask our team to run it for you</h2>
            <p className="text-xs text-white/50 mb-6">
              A specialist picks up the deal — sourcing, negotiation, paperwork. You stay in the loop.
            </p>

            <label className="block text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">
              What do you need?
            </label>
            <div className="space-y-2 mb-5">
              {TOPICS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTopic(t.value)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    topic === t.value
                      ? 'border-[#c39bff]/50 bg-[#c39bff]/10'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <div className="text-sm font-semibold text-white">{t.label}</div>
                  <div className="text-xs text-white/40 mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">
                  Event date (optional)
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-white focus:border-[#c39bff]/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">
                  Budget ₹ (optional)
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 250000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-white placeholder:text-white/20 focus:border-[#c39bff]/40 focus:outline-none"
                />
              </div>
            </div>

            <label className="block text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">
              Tell us more
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Event type, venue, constraints, links to any briefs..."
              className="w-full px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-white placeholder:text-white/20 focus:border-[#c39bff]/40 focus:outline-none resize-none"
            />

            {error && (
              <div className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-white/15 text-sm text-white/60 hover:text-white hover:border-white/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-[#c39bff] text-[#0e0e0f] text-sm font-semibold hover:bg-[#c39bff]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Send request
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
