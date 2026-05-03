'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Star,
  CheckCircle2,
  Heart,
  Ban,
  Clock,
  CalendarCheck,
  MessageSquareQuote,
  Send,
} from 'lucide-react';
import { apiClient } from '../../../../../lib/api-client';

type VendorCategory =
  | 'artist' | 'av' | 'photo' | 'decor' | 'license' | 'promoters' | 'transport';

interface Vendor {
  id: string;
  stage_name: string;
  bio: string | null;
  base_city: string;
  category: VendorCategory;
  category_attributes: Record<string, unknown> | null;
  trust_score: number;
  total_bookings: number;
  is_verified: boolean;
  rating: number | string | null;
  rating_count: number;
  ontime_rate: number | string | null;
  events_done: number;
  is_preferred: boolean;
  is_blacklisted: boolean;
  blacklist_reason: string | null;
  last_used_at: string | null;
}

interface Rating {
  id: string;
  workspace_id: string;
  event_file_id: string;
  overall: number | string;
  quality: number | string | null;
  punctuality: number | string | null;
  communication: number | string | null;
  professionalism: number | string | null;
  was_ontime: boolean;
  would_rebook: boolean;
  comment: string | null;
  created_at: string;
  rater_name: string | null;
  event_name: string | null;
}

interface WorkspaceFlag {
  is_preferred: boolean;
  is_blacklisted: boolean;
  blacklist_reason: string | null;
  notes: string | null;
}

const CATEGORY_ACCENT: Record<VendorCategory, string> = {
  artist: '#c39bff', av: '#a1faff', photo: '#ffbf00', decor: '#6ee7b7',
  license: '#fdba74', promoters: '#f9a8d4', transport: '#7dd3fc',
};

function StarRow({ value, onChange, label }: { value: number; onChange?: (n: number) => void; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs uppercase tracking-widest font-bold text-white/50">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange?.(n)}
            className="p-1 rounded hover:bg-white/5 transition"
          >
            <Star
              className={`w-4 h-4 ${n <= value ? 'fill-[#ffbf00] text-[#ffbf00]' : 'text-white/20'}`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function VendorDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [flag, setFlag] = useState<WorkspaceFlag | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rating form
  const [eventFileId, setEventFileId] = useState('');
  const [overall, setOverall] = useState(0);
  const [quality, setQuality] = useState(0);
  const [punctuality, setPunctuality] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [professionalism, setProfessionalism] = useState(0);
  const [wasOntime, setWasOntime] = useState(true);
  const [wouldRebook, setWouldRebook] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [v, r, f] = await Promise.all([
        apiClient<Vendor>(`/v1/vendors/${id}`),
        apiClient<Rating[]>(`/v1/vendors/${id}/ratings?limit=20`),
        apiClient<WorkspaceFlag | null>(`/v1/vendors/${id}/flags`),
      ]);
      if (!v.success) {
        setError(v.errors?.[0]?.message || 'Failed to load vendor');
        return;
      }
      setVendor(v.data as unknown as Vendor);
      setRatings(((r.data as unknown) as Rating[]) ?? []);
      setFlag(((f.data as unknown) as WorkspaceFlag | null) ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!eventFileId.trim() || overall < 1) {
      setSubmitMsg('Need event file ID and overall rating');
      return;
    }
    setSubmitting(true);
    setSubmitMsg(null);
    const res = await apiClient(`/v1/vendors/${id}/ratings`, {
      method: 'POST',
      body: JSON.stringify({
        event_file_id: eventFileId.trim(),
        overall,
        quality: quality || null,
        punctuality: punctuality || null,
        communication: communication || null,
        professionalism: professionalism || null,
        was_ontime: wasOntime,
        would_rebook: wouldRebook,
        comment: comment.trim() || null,
      }),
    });
    setSubmitting(false);
    if (!res.success) {
      setSubmitMsg(res.errors?.[0]?.message || 'Submit failed');
      return;
    }
    setSubmitMsg('Saved.');
    setOverall(0); setQuality(0); setPunctuality(0); setCommunication(0); setProfessionalism(0);
    setComment(''); setEventFileId('');
    load();
  };

  const setFlagFn = async (next: Partial<WorkspaceFlag>) => {
    const merged = {
      is_preferred: flag?.is_preferred ?? false,
      is_blacklisted: flag?.is_blacklisted ?? false,
      blacklist_reason: flag?.blacklist_reason ?? null,
      notes: flag?.notes ?? null,
      ...next,
    };
    const res = await apiClient(`/v1/vendors/${id}/flags`, {
      method: 'PUT',
      body: JSON.stringify(merged),
    });
    if (res.success) {
      setFlag(merged as WorkspaceFlag);
      load();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0e0f] text-white p-6">
        <div className="nocturne-skeleton h-32 rounded-xl mb-4" />
        <div className="nocturne-skeleton h-64 rounded-xl" />
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="min-h-screen bg-[#0e0e0f] text-white p-6">
        <div className="glass-card rounded-xl p-6 border border-red-500/20 text-red-300">
          {error ?? 'Vendor not found'}
        </div>
      </div>
    );
  }

  const accent = CATEGORY_ACCENT[vendor.category];

  return (
    <div className="min-h-screen bg-[#0e0e0f] text-white">
      {/* Hero */}
      <section className="relative border-b border-white/5 bg-[#1a191b]">
        <div
          className="absolute -top-20 -right-20 w-64 h-64 blur-[100px] rounded-full pointer-events-none opacity-40"
          style={{ backgroundColor: accent }}
        />
        <div className="max-w-5xl mx-auto px-6 py-8 relative">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white mb-4 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div
                className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border mb-2"
                style={{ color: accent, borderColor: `${accent}40`, backgroundColor: `${accent}15` }}
              >
                {vendor.category}
              </div>
              <h1 className="font-display text-4xl font-extrabold tracking-tighter">
                {vendor.stage_name}
                {vendor.is_verified && (
                  <CheckCircle2 className="inline-block w-6 h-6 text-emerald-400 ml-2" />
                )}
              </h1>
              {vendor.bio && (
                <p className="text-white/50 mt-2 max-w-2xl">{vendor.bio}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-white/50">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {vendor.base_city}</span>
                {vendor.last_used_at && (
                  <span className="flex items-center gap-1">
                    <CalendarCheck className="w-3.5 h-3.5" />
                    Last used {new Date(vendor.last_used_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Score panel */}
            <div className="glass-card rounded-xl p-4 border border-white/5 min-w-[260px]">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-5 h-5 text-[#ffbf00] fill-[#ffbf00]" />
                <span className="font-display text-3xl font-extrabold tracking-tighter">
                  {vendor.rating != null ? Number(vendor.rating).toFixed(2) : '—'}
                </span>
                <span className="text-white/40 text-xs">
                  {vendor.rating_count > 0 ? `· ${vendor.rating_count} ratings` : '· no ratings'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/50 mt-2">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#a1faff]" />
                  {vendor.ontime_rate != null ? `${Number(vendor.ontime_rate).toFixed(0)}% on-time` : '— on-time'}
                </span>
                <span>{vendor.events_done} events</span>
              </div>
            </div>
          </div>

          {/* Flag controls */}
          <div className="mt-4 flex gap-2 flex-wrap">
            <button
              onClick={() => setFlagFn({ is_preferred: !flag?.is_preferred, is_blacklisted: false })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                flag?.is_preferred
                  ? 'bg-pink-500/15 border-pink-400/40 text-pink-300'
                  : 'bg-transparent border-white/10 text-white/50 hover:text-white/80 hover:border-white/20'
              }`}
            >
              <Heart className="w-3 h-3" /> {flag?.is_preferred ? 'Preferred' : 'Mark preferred'}
            </button>
            <button
              onClick={() => {
                const reason = !flag?.is_blacklisted ? prompt('Blacklist reason?') : null;
                setFlagFn({ is_blacklisted: !flag?.is_blacklisted, is_preferred: false, blacklist_reason: reason });
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                flag?.is_blacklisted
                  ? 'bg-red-500/15 border-red-400/40 text-red-300'
                  : 'bg-transparent border-white/10 text-white/50 hover:text-white/80 hover:border-white/20'
              }`}
            >
              <Ban className="w-3 h-3" /> {flag?.is_blacklisted ? 'Blacklisted' : 'Blacklist'}
            </button>
            {flag?.is_blacklisted && flag.blacklist_reason && (
              <span className="text-xs text-red-300/70 self-center">— {flag.blacklist_reason}</span>
            )}
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Submit rating */}
        <div className="lg:col-span-5">
          <div className="glass-card rounded-xl p-6 border border-white/5 relative overflow-hidden">
            <div
              className="absolute -top-12 -right-12 w-32 h-32 blur-[80px] rounded-full pointer-events-none opacity-30"
              style={{ backgroundColor: accent }}
            />
            <h2 className="font-display text-xl font-extrabold tracking-tight mb-1">Rate this vendor</h2>
            <p className="text-white/50 text-xs mb-4">After an event completes, score the work.</p>

            <label className="block text-xs uppercase tracking-widest font-bold text-white/50 mb-1">Event file ID</label>
            <input
              type="text"
              value={eventFileId}
              onChange={(e) => setEventFileId(e.target.value)}
              placeholder="paste event file UUID"
              className="input-nocturne w-full mb-4 text-sm"
            />

            <div className="space-y-3">
              <StarRow label="Overall" value={overall} onChange={setOverall} />
              <StarRow label="Quality" value={quality} onChange={setQuality} />
              <StarRow label="Punctuality" value={punctuality} onChange={setPunctuality} />
              <StarRow label="Communication" value={communication} onChange={setCommunication} />
              <StarRow label="Professionalism" value={professionalism} onChange={setProfessionalism} />
            </div>

            <div className="mt-4 flex gap-3 text-xs">
              <label className="flex items-center gap-1.5 text-white/70">
                <input type="checkbox" checked={wasOntime} onChange={(e) => setWasOntime(e.target.checked)} />
                On time
              </label>
              <label className="flex items-center gap-1.5 text-white/70">
                <input type="checkbox" checked={wouldRebook} onChange={(e) => setWouldRebook(e.target.checked)} />
                Would rebook
              </label>
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional notes (private to your workspace)"
              rows={3}
              className="input-nocturne w-full mt-4 text-sm resize-none"
            />

            <button
              onClick={submit}
              disabled={submitting}
              className="btn-nocturne-primary w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Submitting…' : 'Submit rating'}
            </button>
            {submitMsg && (
              <p className={`text-xs mt-2 ${submitMsg === 'Saved.' ? 'text-emerald-300' : 'text-red-300'}`}>
                {submitMsg}
              </p>
            )}
          </div>
        </div>

        {/* Ratings history */}
        <div className="lg:col-span-7">
          <div className="glass-card rounded-xl p-6 border border-white/5">
            <h2 className="font-display text-xl font-extrabold tracking-tight mb-4 flex items-center gap-2">
              <MessageSquareQuote className="w-5 h-5 text-[#a1faff]" />
              Ratings history
              <span className="text-white/40 text-sm font-normal">({ratings.length})</span>
            </h2>
            {ratings.length === 0 ? (
              <p className="text-white/50 text-sm">No ratings yet. Be the first.</p>
            ) : (
              <div className="space-y-3">
                {ratings.map((r) => (
                  <div key={r.id} className="border border-white/5 rounded-lg p-3 bg-[#1a191b]/50">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 fill-[#ffbf00] text-[#ffbf00]" />
                        <span className="font-bold text-sm">{Number(r.overall).toFixed(2)}</span>
                        {r.would_rebook && (
                          <span className="text-[10px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-400/20 ml-1">
                            Rebook
                          </span>
                        )}
                        {!r.was_ontime && (
                          <span className="text-[10px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-400/20 ml-1">
                            Late
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-white/40">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {r.event_name && (
                      <div className="text-xs text-white/50 mb-1">{r.event_name}</div>
                    )}
                    <div className="grid grid-cols-4 gap-2 text-[11px] text-white/50 my-2">
                      {r.quality != null && <span>Q {Number(r.quality).toFixed(1)}</span>}
                      {r.punctuality != null && <span>P {Number(r.punctuality).toFixed(1)}</span>}
                      {r.communication != null && <span>C {Number(r.communication).toFixed(1)}</span>}
                      {r.professionalism != null && <span>Pr {Number(r.professionalism).toFixed(1)}</span>}
                    </div>
                    {r.comment && (
                      <p className="text-xs text-white/70 mt-1">&ldquo;{r.comment}&rdquo;</p>
                    )}
                    {r.rater_name && (
                      <p className="text-[11px] text-white/30 mt-1">— {r.rater_name}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
