'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { MapPin, Mic2, Play, Square, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { apiClient } from '../../../../../lib/api-client';

interface EventDayState {
  booking_id: string;
  arrived_at?: string | null;
  soundcheck_at?: string | null;
  set_started_at?: string | null;
  set_ended_at?: string | null;
  completed_at?: string | null;
  issues: Array<{ id: string; description: string; reported_at: string }>;
  arrival_location?: { lat: number; lng: number } | null;
}

export default function ArtistEventDayPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;
  const [state, setState] = useState<EventDayState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issueText, setIssueText] = useState('');

  const load = useCallback(async () => {
    const res = await apiClient<EventDayState>(`/v1/bookings/${bookingId}/event-day`);
    if (res.success && res.data) setState(res.data);
    setLoading(false);
  }, [bookingId]);

  useEffect(() => { load(); }, [load]);

  const call = async (endpoint: string, body: Record<string, unknown> = {}) => {
    setBusy(endpoint); setError(null);
    const res = await apiClient(`/v1/bookings/${bookingId}/event-day/${endpoint}`, {
      method: 'POST', body: JSON.stringify(body),
    });
    if (!res.success) setError(res.errors?.[0]?.message ?? 'Action failed');
    else await load();
    setBusy(null);
  };

  const markArrival = async () => {
    if (!navigator.geolocation) { call('arrival'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => call('arrival', { lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => call('arrival'),
      { timeout: 5000 }
    );
  };

  const reportIssue = async () => {
    if (!issueText.trim()) return;
    await call('issue', { description: issueText.trim() });
    setIssueText('');
  };

  if (loading) return <div className="p-8 text-white/50 text-sm">Loading event-day tracker…</div>;
  if (!state) return <div className="p-8 text-white/50 text-sm">No event-day record found.</div>;

  const steps = [
    { key: 'arrival', label: 'Arrival', icon: MapPin, done: !!state.arrived_at, time: state.arrived_at, action: markArrival, cta: 'Mark Arrival + GPS' },
    { key: 'soundcheck', label: 'Soundcheck', icon: Mic2, done: !!state.soundcheck_at, time: state.soundcheck_at, action: () => call('soundcheck'), cta: 'Soundcheck Done' },
    { key: 'set-start', label: 'Set Start', icon: Play, done: !!state.set_started_at, time: state.set_started_at, action: () => call('set-start'), cta: 'Start Set' },
    { key: 'set-end', label: 'Set End', icon: Square, done: !!state.set_ended_at, time: state.set_ended_at, action: () => call('set-end'), cta: 'End Set' },
    { key: 'complete', label: 'Complete', icon: CheckCircle, done: !!state.completed_at, time: state.completed_at, action: () => call('complete'), cta: 'Mark Complete' },
  ];

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-8 space-y-6">
      <header className="space-y-1">
        <p className="text-xs text-white/30 uppercase tracking-widest font-bold">Event Day</p>
        <h1 className="text-2xl font-display font-extrabold text-white">Live Tracking</h1>
        <p className="text-white/50 text-sm">Mark each step as it happens. This helps the planner stay informed and protects your reputation.</p>
      </header>

      {error && <div className="glass-card rounded-xl p-3 border border-red-500/20 text-red-300 text-sm">{error}</div>}

      {/* Timeline */}
      <div className="space-y-3">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const prevDone = i === 0 || steps[i - 1].done;
          return (
            <div key={s.key} className={`glass-card rounded-xl p-5 border flex items-center gap-4 transition-all ${
              s.done ? 'border-green-500/30 bg-green-500/[0.03]' : prevDone ? 'border-white/10' : 'border-white/5 opacity-60'
            }`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                s.done ? 'bg-green-500/20 text-green-400' : 'bg-white/[0.06] text-white/50'
              }`}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{s.label}</p>
                {s.time ? (
                  <p className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
                    <Clock size={10} /> {new Date(s.time).toLocaleString('en-IN')}
                  </p>
                ) : prevDone && (
                  <p className="text-xs text-white/40">Waiting to start</p>
                )}
              </div>
              {!s.done && prevDone && (
                <button onClick={s.action} disabled={busy === s.key}
                  className="bg-[#c39bff] text-black text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#b48af0] disabled:opacity-40 transition-all">
                  {busy === s.key ? '…' : s.cta}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Report issue */}
      <div className="glass-card rounded-xl p-5 border border-white/10 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-yellow-400" />
          <p className="text-sm font-bold text-white">Report an issue</p>
        </div>
        <textarea value={issueText}
          onChange={(e) => setIssueText(e.target.value)}
          placeholder="Sound system issue, venue problem, client conflict..."
          rows={2}
          className="input-nocturne w-full text-sm resize-none" />
        <button onClick={reportIssue} disabled={!issueText.trim() || busy === 'issue'}
          className="bg-yellow-500/20 text-yellow-300 text-xs font-bold px-4 py-2 rounded-lg hover:bg-yellow-500/30 disabled:opacity-40 transition-all">
          Report Issue
        </button>
        {state.issues.length > 0 && (
          <ul className="pt-2 space-y-1 border-t border-white/5">
            {state.issues.map((issue) => (
              <li key={issue.id} className="text-xs text-white/60 flex items-start gap-2">
                <span className="text-yellow-400 shrink-0">⚠</span>
                <span>{issue.description}</span>
                <span className="text-white/30 ml-auto shrink-0">{new Date(issue.reported_at).toLocaleTimeString('en-IN')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
