'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
  filled: 'bg-blue-100 text-blue-700',
  expired: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-600',
};

const APP_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  shortlisted: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
  withdrawn: 'bg-gray-100 text-gray-500',
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (error || !gig) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 mb-4">{error ?? 'Gig not found'}</p>
        <Link href="/gigs" className="text-primary-500 hover:underline text-sm">Back to Gigs</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/gigs" className="text-sm text-primary-500 hover:underline">Back to Gigs</Link>

      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{gig.title}</h1>
            <p className="text-sm text-gray-500">Posted by {gig.poster_name ?? 'Unknown'}</p>
          </div>
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLORS[gig.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {gig.status}
          </span>
        </div>

        {/* Details grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Event Type</p>
            <p className="text-sm font-medium text-gray-700">{gig.event_type.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Date</p>
            <p className="text-sm font-medium text-gray-700">{new Date(gig.event_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">City</p>
            <p className="text-sm font-medium text-gray-700">{gig.event_city}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Budget Range</p>
            <p className="text-sm font-medium text-gray-700">{formatPaise(gig.budget_min_paise)} - {formatPaise(gig.budget_max_paise)}</p>
          </div>
          {gig.guest_count && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Guest Count</p>
              <p className="text-sm font-medium text-gray-700">{gig.guest_count.toLocaleString()}</p>
            </div>
          )}
          {gig.duration_hours && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Duration</p>
              <p className="text-sm font-medium text-gray-700">{gig.duration_hours} hours</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Applications</p>
            <p className="text-sm font-medium text-gray-700">{gig.application_count}</p>
          </div>
        </div>

        {/* Genres */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Genres Needed</p>
          <div className="flex gap-1.5 flex-wrap">
            {gig.genres_needed.map((g) => (
              <span key={g} className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full">{g}</span>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Description</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{gig.description}</p>
        </div>

        {/* Requirements */}
        {gig.requirements && (
          <div className="mb-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Requirements</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{gig.requirements}</p>
          </div>
        )}

        {/* Poster actions */}
        {isPoster && gig.status === 'open' && (
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Link
              href={`/gigs/${gig.id}`}
              className="text-sm text-primary-500 hover:underline"
            >
              Edit
            </Link>
            <button
              onClick={handleClose}
              className="text-sm text-red-500 hover:underline"
            >
              Close Post
            </button>
          </div>
        )}

        {/* Artist apply */}
        {isArtist && gig.status === 'open' && !isPoster && (
          <div className="pt-4 border-t border-gray-100">
            {applyResult && (
              <p className={`text-sm mb-3 ${applyResult.includes('success') ? 'text-green-600' : 'text-yellow-600'}`}>
                {applyResult}
              </p>
            )}

            {!showApplyForm ? (
              <button
                onClick={() => setShowApplyForm(true)}
                className="bg-primary-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-600"
              >
                Apply to this Gig
              </button>
            ) : (
              <form onSubmit={handleApply} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cover Note (optional)</label>
                  <textarea
                    rows={3}
                    value={coverNote}
                    onChange={(e) => setCoverNote(e.target.value)}
                    placeholder="Tell the client why you're a great fit..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proposed Amount in ₹ (optional)</label>
                  <input
                    type="number"
                    value={proposedAmount}
                    onChange={(e) => setProposedAmount(e.target.value)}
                    placeholder="e.g., 150000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={applying}
                    className="bg-primary-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
                  >
                    {applying ? 'Submitting...' : 'Submit Application'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowApplyForm(false)}
                    className="text-sm text-gray-500 hover:text-gray-700"
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
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Applications ({applications.length})
          </h2>

          {applications.length === 0 ? (
            <p className="text-sm text-gray-400">No applications yet.</p>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div key={app.id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {app.profile_image_url ? (
                        <img src={app.profile_image_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium">
                          {app.stage_name?.[0] ?? '?'}
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium text-gray-900">{app.stage_name}</h3>
                        {app.base_city && <p className="text-xs text-gray-500">{app.base_city}</p>}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${APP_STATUS_COLORS[app.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {app.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                    {app.trust_score !== undefined && app.trust_score !== null && (
                      <span>Trust: {app.trust_score}</span>
                    )}
                    {app.proposed_amount_paise && (
                      <span className="font-medium text-gray-700">Bid: {formatPaise(app.proposed_amount_paise)}</span>
                    )}
                    {app.base_price_paise && (
                      <span>Base rate: {formatPaise(app.base_price_paise)}</span>
                    )}
                  </div>

                  {app.genres && (
                    <div className="flex gap-1 flex-wrap mb-2">
                      {(Array.isArray(app.genres) ? app.genres : []).map((g: string) => (
                        <span key={g} className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{g}</span>
                      ))}
                    </div>
                  )}

                  {app.cover_note && (
                    <p className="text-sm text-gray-600 mb-3 italic">&ldquo;{app.cover_note}&rdquo;</p>
                  )}

                  {(app.status === 'pending' || app.status === 'shortlisted') && gig.status === 'open' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRespond(app.id, 'accepted')}
                        disabled={responding === app.id}
                        className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-md hover:bg-green-600 disabled:opacity-50"
                      >
                        Accept
                      </button>
                      {app.status === 'pending' && (
                        <button
                          onClick={() => handleRespond(app.id, 'shortlisted')}
                          disabled={responding === app.id}
                          className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-md hover:bg-blue-600 disabled:opacity-50"
                        >
                          Shortlist
                        </button>
                      )}
                      <button
                        onClick={() => handleRespond(app.id, 'rejected')}
                        disabled={responding === app.id}
                        className="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-200 disabled:opacity-50"
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
