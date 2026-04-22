'use client';

/**
 * Event Company OS — Create Event File.
 * Minimal form: name, date, call time, city, venue, budget, brief.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, MapPin, Wallet, FileText, Save, type LucideIcon } from 'lucide-react';
import { apiClient } from '../../../../../lib/api-client';

export default function NewEventFilePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    event_name: '',
    event_date: '',
    call_time: '',
    city: '',
    venue: '',
    budget_lakhs: '',
    brief_notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        event_name: form.event_name,
        event_date: form.event_date,
        city: form.city,
      };
      if (form.call_time) body.call_time = form.call_time;
      if (form.venue) body.venue = form.venue;
      if (form.budget_lakhs) body.budget_paise = Number(form.budget_lakhs) * 100_000 * 100;
      if (form.brief_notes) body.brief = { notes: form.brief_notes };

      const res = await apiClient<{ id: string }>('/v1/event-files', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.success) {
        setError(res.errors?.[0]?.message || 'Failed to create event file');
        return;
      }
      router.push(`/event-company/event-files/${res.data.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setSaving(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen bg-[#0e0e0f] text-white">
      <section className="relative border-b border-white/5 bg-[#1a191b]">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 py-8 relative">
          <Link href="/event-company/event-files" className="flex items-center gap-2 text-sm text-white/50 hover:text-white mb-4 transition w-fit">
            <ArrowLeft className="w-4 h-4" /> All event files
          </Link>
          <h1 className="font-display text-4xl font-extrabold tracking-tighter">New Event File</h1>
          <p className="text-white/50 mt-2">Start the container. Add vendors and call sheets after.</p>
        </div>
      </section>

      <form onSubmit={submit} className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="glass-card rounded-xl p-4 border border-red-500/20 text-red-300 text-sm">{error}</div>
        )}

        <div className="glass-card rounded-xl p-6 border border-white/5 space-y-5">
          <Field label="Event name" icon={FileText}>
            <input className="input-nocturne w-full" required value={form.event_name} onChange={set('event_name')} placeholder="e.g. Acme Annual Gala 2026" />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Event date" icon={Calendar}>
              <input type="date" className="input-nocturne w-full" required value={form.event_date} onChange={set('event_date')} />
            </Field>
            <Field label="Call time (optional)" icon={Calendar}>
              <input type="time" className="input-nocturne w-full" value={form.call_time} onChange={set('call_time')} />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="City" icon={MapPin}>
              <input className="input-nocturne w-full" required value={form.city} onChange={set('city')} placeholder="Mumbai" />
            </Field>
            <Field label="Venue (optional)" icon={MapPin}>
              <input className="input-nocturne w-full" value={form.venue} onChange={set('venue')} placeholder="Grand Hyatt Ballroom" />
            </Field>
          </div>
          <Field label="Budget (₹ lakhs, optional)" icon={Wallet}>
            <input type="number" min="0" step="0.5" className="input-nocturne w-full" value={form.budget_lakhs} onChange={set('budget_lakhs')} placeholder="25" />
          </Field>
          <Field label="Brief / client notes" icon={FileText}>
            <textarea className="input-nocturne w-full min-h-[120px]" value={form.brief_notes} onChange={set('brief_notes')} placeholder="Crowd size, vibe, special requests…" />
          </Field>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/event-company/event-files" className="btn-nocturne-secondary px-5 py-2.5">Cancel</Link>
          <button type="submit" disabled={saving} className="btn-nocturne-primary flex items-center gap-2 px-6 py-2.5 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Creating…' : 'Create Event File'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs tracking-widest uppercase font-bold text-white/60 mb-2 flex items-center gap-2">
        <Icon className="w-3.5 h-3.5" /> {label}
      </label>
      {children}
    </div>
  );
}
