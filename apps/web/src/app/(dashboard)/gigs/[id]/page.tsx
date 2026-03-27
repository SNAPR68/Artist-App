'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';
import { useAuthStore } from '../../../../lib/auth';

// ─── Types ──────────────────────────────────────────────────

interface GigPost {
  id: string;
  posted_by: string;
  title: string;
  description: string;
  event_type: string;
  event_date: string;
  event_city: string;
  genres_needed: string[];
  budget_min_paise: number;
  budget_max_paise: number;
  guest_count?: number;
  duration_hours?: number;
  requirements?: string;
  status: string;
  application_count: number;
  poster_name?: string;
  created_at: string;
}

interface GigApplication {
  id: string;
  gig_post_id: string;
  artist_id: string;
  cover_note?: string;
  proposed_amount_paise?: number;
  status: string;
  stage_name: string;
  genres: string[];
  trust_score?: number;
  base_city?: string;
  base_price_paise?: number;
  profile_image_url?: string;
  created_at: string;
}

// ─── Helpers ────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  open: { bg: 'bg-emerald-500/20 border border-emerald-500/30', text: 'text-emerald-300', icon: <CheckCircle2 className="w-4 h-4" /> },
  closed: { bg: 'bg-slate-500/20 border border-slate-500/30', text: 'text-slate-300', icon: <XCircle className="w-4 h-4" /> },
  filled: { bg: 'bg-blue-500/20 border border-blue-500/30', text: 'text-blue-300', icon: <CheckCircle2 className="w-4 h-4" /> },
  expired: { bg: 'bg-orange-500/20 border border-orange-500/30', text: 'text-orange-300', icon: <Clock className="w-4 h-4" /> },
  cancelled: { bg: 'bg-red-500/20 border border-red-500/30', text: 'text-red-300', icon: <XCircle className="w-4 h-4" /> },
};

const APP_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-amber-500/20 border border-amber-500/30', text: 'text-amber-300' },
  shortlisted: { bg: 'bg-blue-500/20 border border-blue-500/30', text: 'text-blue-300' },
  accepted: { bg: 'bg-emerald-500/20 border border-emerald-500/30', text: 'text-emerald-300' },
  rejected: { bg: 'bg-red-500/20 border border-red-500/30', text: 'text-red-300' },
  withdrawn: { bg: 'bg-slate-500/20 border border-slate-500/30', text: 'text-slate-300' },
};

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

// ─── Component ──────────────────────────────────────────────

export default function GigDetailPage() {
  const params = useParams();
  const { user } = useAuthStore();
  const gigId = params.id as string;

  const [gig, setGig] = useState<GigPost | null>(null);
  const [applications, setApplications] = useState<GigApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showApplyForm, setShowApplyForm] = useState(false);
  const [coverNote, setCoverNote] = useState('');
  const [proposedAmount, setProposedAmount] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);

  const [responding, setResponding] = useState<string | null>(null);

  const isArtist = user?.role === 'artist';
  const isPoster = gig?.posted_by === user?.id;

  const fetchGig = useCallback(async () => {
    setLoading(true);
    const res = await apiClient<GigPost>(`/v1/gigs/${gigId}`);
    if (res.success) {
      setGig(res.data);
    } else {
      setError(res.errors?.[0]?.message ?? 'Failed to load gig');
    }
    setLoading(false);
  }, [gigId]);

  const fetchApplications = useCallback(async () => {
    const res = await apiClient<GigApplication[]>(`/v1/gigs/${gigId}/applications`);
    if (res.success) setApplications(res.data);
  }, [gigId]);

  useEffect(() => {
    fetchGig();
  }, [fetchGig]);

  useEffect(() => {
    if (isPoster) fetchApplications();
  }, [isPoster, fetchApplications]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplying(true);
    setApplyResult(null);

    const body: Record<string, unknown> = {};
    if (coverNote) body.cover_note = coverNote;
    if (proposedAmount) body.proposed_amount_paise = Math.round(Number(proposedAmount) * 100);

    const res = await apiClient<{ application: unknown; warning?: string }>(`/v1/gigs/${gigId}/apply`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (res.success) {
      setApplyResult(res.data.warning ?? 'Application submitted successfully!');
      setShowApplyForm(false);
      fetchGig();
    } else {
      setApplyResult(res.errors?.[0]?.message ?? 'Failed to apply');
    }
    setApplying(false);
  };

  const handleRespond = async (applicationId: string, status: string) => {
    setResponding(applicationId);
    const res = await apiClient(`/v1/gigs/applications/${applicationId}/respond`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    if (res.success) {
      fetchApplications();
      if (status === 'accepted') fetchGig();
    }
    setResponding(null);
  };

  const handleClose = async () => {
    const res = await apiClient(`/v1/gigs/${gigId}/close`, { method: 'POST' });
    if (res.success) fetchGig();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c39bff]" />
      </div>
    );
  }

  if (error || !gig) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 mb-4">{error ?? 'Gig not found'}</p>
        <Link href="/gigs" className="text-[#c39bff] hover:text-[#a1faff] text-sm">Back to Gigs</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Ambient glows */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#c39bff]/5 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#a1faff]/5 blur-3xl rounded-full pointer-events-none" />

      {/* Back link */}
      <Link href="/gigs" className="inline-flex items-center gap-2 text-[#c39bff] hover:text-[#a1faff] transition-colors group">
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Back to Gigs</span>
      </Link>

      {/* Header Section - Bento 7+5 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left: Description + Requirements (7 cols) */}
        <div className="md:col-span-7 space-y-6">
          <div className="glass-card border border-white/10 p-8 space-y-6">
            <div className="space-y-3">
              <h1 className="text-4xl font-display font-bold text-white">{gig.title}</h1>
              <p className="text-white/50">Posted by {gig.poster_name ?? 'Unknown'}</p>
            </div>

            {/* Status */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm ${STATUS_COLORS[gig.status]?.bg} ${STATUS_COLORS[gig.status]?.text}`}>
              {STATUS_COLORS[gig.status]?.icon}
              <span className="capitalize">{gig.status}</span>
            </div>

            {/* Details grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/5">
                <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Event Type</p>
                <p className="text-sm font-semibold text-white">{gig.event_type.replace(/_/g, ' ')}</p>
              </div>
              <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/5">
                <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Date</p>
                <p className="text-sm font-semibold text-white">{new Date(gig.event_date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/5">
                <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">City</p>
                <p className="text-sm font-semibold text-white">{gig.event_city}</p>
              </div>
              <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/5">
                <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Budget Range</p>
                <p className="text-sm font-semibold text-[#c39bff]">{formatPaise(gig.budget_min_paise)} - {formatPaise(gig.budget_max_paise)}</p>
              </div>
              {gig.guest_count && (
                <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/5">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Guest Count</p>
                  <p className="text-sm font-semibold text-white">{gig.guest_count.toLocaleString()}</p>
                </div>
              )}
              {gig.duration_hours && (
                <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/5">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Duration</p>
                  <p className="text-sm font-semibold text-white">{gig.duration_hours} hours</p>
                </div>
              )}
            </div>

            {/* Genres */}
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-wider mb-3 font-semibold">Genres Needed</p>
              <div className="flex gap-2 flex-wrap">
                {gig.genres_needed.map((g) => (
                  <span key={g} className="text-xs bg-[#c39bff]/20 text-[#c39bff] px-4 py-2 rounded-full border border-[#c39bff]/30 font-medium">{g}</span>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="nocturne-divider" />
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-wider mb-3 font-semibold">Description</p>
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{gig.description}</p>
            </div>

            {/* Requirements */}
            {gig.requirements && (
              <div>
                <p className="text-[10px] text-white/50 uppercase tracking-wider mb-3 font-semibold">Requirements</p>
                <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{gig.requirements}</p>
              </div>
            )}

            {/* Poster actions */}
            {isPoster && gig.status === 'open' && (
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <Link
                  href={`/gigs/${gig.id}`}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-white/70 hover:bg-white/20 transition-all border border-white/10"
                >
                  Edit
                </Link>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-all border border-red-500/30"
                >
                  Close Post
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Apply Card (5 cols, sticky) */}
        <div className="md:col-span-5">
          <div className="glass-card border border-white/10 p-8 space-y-6 md:sticky md:top-20">
            {/* Artist apply */}
            {isArtist && gig.status === 'open' && !isPoster && (
              <div className="space-y-4">
                <h3 className="font-display font-bold text-white">Interested?</h3>

                {applyResult && (
                  <p className={`text-sm px-4 py-3 rounded-lg ${applyResult.includes('success') ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-200 border border-amber-500/30'}`}>
                    {applyResult}
                  </p>
                )}

                {!showApplyForm ? (
                  <button
                    onClick={() => setShowApplyForm(true)}
                    className="btn-nocturne-primary w-full py-3 rounded-lg font-semibold"
                  >
                    Apply to this Gig
                  </button>
                ) : (
                  <form onSubmit={handleApply} className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest font-bold text-white/70 mb-2">Cover Note (optional)</label>
                      <textarea
                        rows={3}
                        value={coverNote}
                        onChange={(e) => setCoverNote(e.target.value)}
                        placeholder="Tell the client why you're a great fit..."
                        className="input-nocturne w-full rounded-lg px-4 py-3"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest font-bold text-white/70 mb-2">Proposed Amount in ₹ (optional)</label>
                      <input
                        type="number"
                        value={proposedAmount}
                        onChange={(e) => setProposedAmount(e.target.value)}
                        placeholder="e.g., 150000"
                        className="input-nocturne w-full rounded-lg px-4 py-3"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={applying}
                        className="flex-1 btn-nocturne-primary py-3 rounded-lg disabled:opacity-50"
                      >
                        {applying ? 'Submitting...' : 'Submit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowApplyForm(false)}
                        className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold text-white/70 hover:text-white bg-white/5 border border-white/10 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Applications count */}
            {isPoster && (
              <div className="space-y-2">
                <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">Applications</p>
                <p className="text-3xl font-bold text-[#c39bff]">{applications.length}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Applications Section (poster view) */}
      {isPoster && (
        <div className="glass-card border border-white/10 p-8 space-y-6">
          <h2 className="text-2xl font-display font-bold text-white">
            All Applications <span className="text-base font-normal text-white/50">({applications.length})</span>
          </h2>

          {applications.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-white/50 text-sm">No applications yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div key={app.id} className="bg-white/5 border border-white/10 p-5 space-y-4 rounded-lg hover:border-white/20 transition-all">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {app.profile_image_url ? (
                        <Image src={app.profile_image_url} alt="" width={48} height={48} className="rounded-full object-cover ring-2 ring-[#c39bff]/30" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#c39bff]/20 flex items-center justify-center text-white text-sm font-semibold border border-[#c39bff]/30">
                          {app.stage_name?.[0] ?? '?'}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-white">{app.stage_name}</h3>
                        {app.base_city && <p className="text-xs text-white/50">{app.base_city}</p>}
                      </div>
                    </div>
                    <div className={`text-xs px-3 py-1.5 rounded-full font-semibold ${APP_STATUS_COLORS[app.status]?.bg} ${APP_STATUS_COLORS[app.status]?.text}`}>
                      {app.status}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-white/50 flex-wrap">
                    {app.trust_score !== undefined && app.trust_score !== null && (
                      <span>Trust: {app.trust_score}</span>
                    )}
                    {app.proposed_amount_paise && (
                      <span className="font-semibold text-[#c39bff]">Bid: {formatPaise(app.proposed_amount_paise)}</span>
                    )}
                    {app.base_price_paise && (
                      <span>Base rate: {formatPaise(app.base_price_paise)}</span>
                    )}
                  </div>

                  {app.genres && (
                    <div className="flex gap-1.5 flex-wrap">
                      {(Array.isArray(app.genres) ? app.genres : []).map((g: string) => (
                        <span key={g} className="text-xs bg-[#c39bff]/20 text-[#c39bff] px-2.5 py-1 rounded-full font-medium">{g}</span>
                      ))}
                    </div>
                  )}

                  {app.cover_note && (
                    <p className="text-sm text-white/70 italic border-l-2 border-white/20 pl-3 py-1">&ldquo;{app.cover_note}&rdquo;</p>
                  )}

                  {(app.status === 'pending' || app.status === 'shortlisted') && gig.status === 'open' && (
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleRespond(app.id, 'accepted')}
                        disabled={responding === app.id}
                        className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-2 rounded-lg hover:bg-emerald-500/30 transition-all disabled:opacity-50 font-medium"
                      >
                        Accept
                      </button>
                      {app.status === 'pending' && (
                        <button
                          onClick={() => handleRespond(app.id, 'shortlisted')}
                          disabled={responding === app.id}
                          className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-2 rounded-lg hover:bg-blue-500/30 transition-all disabled:opacity-50 font-medium"
                        >
                          Shortlist
                        </button>
                      )}
                      <button
                        onClick={() => handleRespond(app.id, 'rejected')}
                        disabled={responding === app.id}
                        className="text-xs bg-red-500/20 text-red-300 border border-red-500/30 px-3 py-2 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50 font-medium"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
