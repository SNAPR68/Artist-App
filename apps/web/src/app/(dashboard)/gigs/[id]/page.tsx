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
  // const router = useRouter();
  const { user } = useAuthStore();
  const gigId = params.id as string;

  const [gig, setGig] = useState<GigPost | null>(null);
  const [applications, setApplications] = useState<GigApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Application form state (for artists)
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [coverNote, setCoverNote] = useState('');
  const [proposedAmount, setProposedAmount] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);

  // Response action state
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nocturne-primary" />
      </div>
    );
  }

  if (error || !gig) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 mb-4">{error ?? 'Gig not found'}</p>
        <Link href="/gigs" className="text-nocturne-accent hover:underline text-sm">Back to Gigs</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back link */}
      <Link href="/gigs" className="inline-flex items-center gap-2 text-nocturne-accent hover:text-nocturne-accent transition-colors group">
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Back to Gigs</span>
      </Link>

      {/* Header */}
      <div className="glass-card border border-nocturne-border p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-4xl font-display font-bold text-gradient-nocturne mb-2">{gig.title}</h1>
            <p className="text-nocturne-text-secondary">Posted by {gig.poster_name ?? 'Unknown'}</p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm ${STATUS_COLORS[gig.status]?.bg} ${STATUS_COLORS[gig.status]?.text}`}>
            {STATUS_COLORS[gig.status]?.icon}
            <span className="capitalize">{gig.status}</span>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-nocturne-surface-2/50 backdrop-blur-3xl rounded-lg p-4 border border-nocturne-border">
            <p className="text-xs text-nocturne-text-secondary uppercase tracking-wider mb-1">Event Type</p>
            <p className="text-sm font-semibold text-nocturne-text-primary">{gig.event_type.replace(/_/g, ' ')}</p>
          </div>
          <div className="bg-nocturne-surface-2/50 backdrop-blur-3xl rounded-lg p-4 border border-nocturne-border">
            <p className="text-xs text-nocturne-text-secondary uppercase tracking-wider mb-1">Date</p>
            <p className="text-sm font-semibold text-nocturne-text-primary">{new Date(gig.event_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="bg-nocturne-surface-2/50 backdrop-blur-3xl rounded-lg p-4 border border-nocturne-border">
            <p className="text-xs text-nocturne-text-secondary uppercase tracking-wider mb-1">City</p>
            <p className="text-sm font-semibold text-nocturne-text-primary">{gig.event_city}</p>
          </div>
          <div className="bg-nocturne-surface-2/50 backdrop-blur-3xl rounded-lg p-4 border border-nocturne-border">
            <p className="text-xs text-nocturne-text-secondary uppercase tracking-wider mb-1">Budget Range</p>
            <p className="text-sm font-semibold text-gradient-nocturne">{formatPaise(gig.budget_min_paise)} - {formatPaise(gig.budget_max_paise)}</p>
          </div>
          {gig.guest_count && (
            <div className="bg-nocturne-surface-2/50 backdrop-blur-3xl rounded-lg p-4 border border-nocturne-border">
              <p className="text-xs text-nocturne-text-secondary uppercase tracking-wider mb-1">Guest Count</p>
              <p className="text-sm font-semibold text-nocturne-text-primary">{gig.guest_count.toLocaleString()}</p>
            </div>
          )}
          {gig.duration_hours && (
            <div className="bg-nocturne-surface-2/50 backdrop-blur-3xl rounded-lg p-4 border border-nocturne-border">
              <p className="text-xs text-nocturne-text-secondary uppercase tracking-wider mb-1">Duration</p>
              <p className="text-sm font-semibold text-nocturne-text-primary">{gig.duration_hours} hours</p>
            </div>
          )}
          {!gig.guest_count && !gig.duration_hours && (
            <div className="bg-nocturne-surface-2/50 backdrop-blur-3xl rounded-lg p-4 border border-nocturne-border">
              <p className="text-xs text-nocturne-text-secondary uppercase tracking-wider mb-1">Applications</p>
              <p className="text-sm font-semibold text-gradient-nocturne">{gig.application_count}</p>
            </div>
          )}
        </div>

        {/* Genres */}
        <div>
          <p className="text-xs text-nocturne-text-secondary uppercase tracking-wider mb-3 font-semibold">Genres Needed</p>
          <div className="flex gap-2 flex-wrap">
            {gig.genres_needed.map((g) => (
              <span key={g} className="text-xs bg-gradient-nocturne/20 text-gradient-nocturne px-4 py-2 rounded-full border border-gradient-nocturne/30 font-medium">{g}</span>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-xs text-nocturne-text-secondary uppercase tracking-wider mb-2 font-semibold">Description</p>
          <p className="text-sm text-nocturne-text-secondary leading-relaxed whitespace-pre-wrap">{gig.description}</p>
        </div>

        {/* Requirements */}
        {gig.requirements && (
          <div>
            <p className="text-xs text-nocturne-text-secondary uppercase tracking-wider mb-2 font-semibold">Requirements</p>
            <p className="text-sm text-nocturne-text-secondary leading-relaxed whitespace-pre-wrap">{gig.requirements}</p>
          </div>
        )}

        {/* Poster actions */}
        {isPoster && gig.status === 'open' && (
          <div className="flex gap-3 pt-4 border-t border-nocturne-border">
            <Link
              href={`/gigs/${gig.id}`}
              className="px-4 py-2 rounded-full text-sm font-medium bg-nocturne-primary-light text-nocturne-accent hover:bg-nocturne-primary-light transition-all border border-nocturne-border"
            >
              Edit
            </Link>
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-full text-sm font-medium bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-all border border-red-500/30"
            >
              Close Post
            </button>
          </div>
        )}

        {/* Artist apply */}
        {isArtist && gig.status === 'open' && !isPoster && (
          <div className="pt-4 border-t border-nocturne-border">
            {applyResult && (
              <p className={`text-sm mb-4 px-4 py-3 rounded-lg ${applyResult.includes('success') ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-200 border border-amber-500/30'}`}>
                {applyResult}
              </p>
            )}

            {!showApplyForm ? (
              <button
                onClick={() => setShowApplyForm(true)}
                className="w-full bg-gradient-nocturne hover-glow text-white px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 transform hover:scale-105"
              >
                Apply to this Gig
              </button>
            ) : (
              <form onSubmit={handleApply} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-nocturne-text-primary mb-2">Cover Note (optional)</label>
                  <textarea
                    rows={3}
                    value={coverNote}
                    onChange={(e) => setCoverNote(e.target.value)}
                    placeholder="Tell the client why you're a great fit..."
                    className="w-full px-4 py-3 bg-nocturne-surface-2/50 border border-nocturne-border rounded-lg text-sm text-nocturne-text-primary placeholder-nocturne-text-secondary focus:outline-none focus:ring-1 focus:ring-nocturne-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-nocturne-text-primary mb-2">Proposed Amount in ₹ (optional)</label>
                  <input
                    type="number"
                    value={proposedAmount}
                    onChange={(e) => setProposedAmount(e.target.value)}
                    placeholder="e.g., 150000"
                    className="w-full px-4 py-3 bg-nocturne-surface-2/50 border border-nocturne-border rounded-lg text-sm text-nocturne-text-primary placeholder-nocturne-text-secondary focus:outline-none focus:ring-1 focus:ring-nocturne-primary transition-all"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={applying}
                    className="flex-1 bg-gradient-nocturne hover-glow text-white px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {applying ? 'Submitting...' : 'Submit Application'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowApplyForm(false)}
                    className="px-6 py-3 rounded-full text-sm font-semibold text-nocturne-text-secondary hover:text-nocturne-text-primary transition-colors bg-nocturne-surface-2/50 border border-nocturne-border"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Applications (poster view) */}
      {isPoster && (
        <div className="glass-card border border-nocturne-border p-8 space-y-6">
          <h2 className="text-2xl font-display font-bold text-gradient-nocturne">
            Applications <span className="text-base font-normal text-nocturne-text-secondary">({applications.length})</span>
          </h2>

          {applications.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-nocturne-text-secondary text-sm">No applications yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div key={app.id} className="bg-nocturne-surface-2 border border-nocturne-border p-5 space-y-4 hover:border-nocturne-border-strong transition-all duration-300">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {app.profile_image_url ? (
                        <Image src={app.profile_image_url} alt="" width={48} height={48} className="rounded-full object-cover ring-2 ring-nocturne-primary/30" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-nocturne/20 flex items-center justify-center text-nocturne-text-primary text-sm font-semibold border border-gradient-nocturne/30">
                          {app.stage_name?.[0] ?? '?'}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-nocturne-text-primary">{app.stage_name}</h3>
                        {app.base_city && <p className="text-xs text-nocturne-text-secondary">{app.base_city}</p>}
                      </div>
                    </div>
                    <div className={`text-xs px-3 py-1.5 rounded-full font-semibold ${APP_STATUS_COLORS[app.status]?.bg} ${APP_STATUS_COLORS[app.status]?.text}`}>
                      {app.status}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-nocturne-text-secondary flex-wrap">
                    {app.trust_score !== undefined && app.trust_score !== null && (
                      <span>Trust: {app.trust_score}</span>
                    )}
                    {app.proposed_amount_paise && (
                      <span className="font-semibold text-gradient-nocturne">Bid: {formatPaise(app.proposed_amount_paise)}</span>
                    )}
                    {app.base_price_paise && (
                      <span>Base rate: {formatPaise(app.base_price_paise)}</span>
                    )}
                  </div>

                  {app.genres && (
                    <div className="flex gap-1.5 flex-wrap">
                      {(Array.isArray(app.genres) ? app.genres : []).map((g: string) => (
                        <span key={g} className="text-xs bg-gradient-nocturne/20 text-gradient-nocturne px-2.5 py-1 rounded-full font-medium">{g}</span>
                      ))}
                    </div>
                  )}

                  {app.cover_note && (
                    <p className="text-sm text-nocturne-text-secondary italic border-l-2 border-nocturne-border pl-3 py-1">&ldquo;{app.cover_note}&rdquo;</p>
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
