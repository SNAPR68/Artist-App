'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';
import { useAuthStore } from '../../../lib/auth';

// ─── Types ──────────────────────────────────────────────────

interface GigPost {
  id: string;
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
  genre_match_count?: number;
  total_genres_needed?: number;
  created_at: string;
}

interface GigApplication {
  id: string;
  gig_post_id: string;
  cover_note?: string;
  proposed_amount_paise?: number;
  status: string;
  gig_title: string;
  event_type: string;
  event_date: string;
  event_city: string;
  gig_budget_min_paise: number;
  gig_budget_max_paise: number;
  gig_status: string;
  poster_name: string;
  created_at: string;
}

interface Pagination {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ─── Helpers ────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-nocturne-success',
  closed: 'bg-nocturne-surface text-nocturne-text-secondary',
  filled: 'bg-blue-100 text-nocturne-info',
  expired: 'bg-nocturne-surface text-nocturne-text-tertiary',
  cancelled: 'bg-red-100 text-nocturne-error',
};

const APP_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-nocturne-warning',
  shortlisted: 'bg-blue-100 text-nocturne-info',
  accepted: 'bg-green-100 text-nocturne-success',
  rejected: 'bg-red-100 text-nocturne-error',
  withdrawn: 'bg-nocturne-surface text-nocturne-text-tertiary',
};

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

const EVENT_TYPES = [
  'wedding', 'corporate', 'college_fest', 'concert', 'private_party',
  'birthday', 'anniversary', 'club_night', 'festival', 'house_party',
];

// ─── Component ──────────────────────────────────────────────

export default function GigsPage() {
  const { user, _initialized } = useAuthStore();

  // Wait for auth to initialize before deciding which view to show
  if (!_initialized) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  const isArtist = user?.role === 'artist';
  const isClient = user?.role === 'client' || user?.role === 'event_company' || user?.role === 'agent';

  if (isArtist) return <ArtistGigsView />;
  if (isClient) return <ClientGigsView />;

  return (
    <div className="text-center py-16 text-nocturne-text-tertiary">
      <p>Gig marketplace is available for artists and clients.</p>
    </div>
  );
}

// ─── Artist View ────────────────────────────────────────────

function ArtistGigsView() {
  const [tab, setTab] = useState<'browse' | 'matching' | 'applications'>('matching');
  const [gigs, setGigs] = useState<GigPost[]>([]);
  const [applications, setApplications] = useState<GigApplication[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchGigs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (cityFilter) params.set('city', cityFilter);
    if (typeFilter) params.set('event_type', typeFilter);

    const endpoint = tab === 'matching' ? '/v1/gigs/matching' : '/v1/gigs';
    const res = await apiClient<{ posts: GigPost[]; pagination: Pagination }>(`${endpoint}?${params}`);
    if (res.success) {
      setGigs(res.data.posts);
      setPagination(res.data.pagination);
    }
    setLoading(false);
  }, [tab, cityFilter, typeFilter]);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    const res = await apiClient<GigApplication[]>('/v1/gigs/my-applications');
    if (res.success) setApplications(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'applications') fetchApplications();
    else fetchGigs();
  }, [tab, fetchGigs, fetchApplications]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <section className="relative mb-2"><div className="absolute -top-40 -left-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" /><h1 className="relative z-10 text-3xl font-display font-extrabold tracking-tighter text-white">Gig Marketplace</h1></section>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-nocturne-border-subtle">
        {(['matching', 'browse', 'applications'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-primary-500 text-nocturne-accent'
                : 'border-transparent text-nocturne-text-tertiary hover:text-nocturne-text-secondary'
            }`}
          >
            {t === 'matching' ? 'Matching Gigs' : t === 'browse' ? 'Browse All' : 'My Applications'}
          </button>
        ))}
      </div>

      {tab !== 'applications' && (
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Filter by city..."
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-nocturne-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-nocturne-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">All Event Types</option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : tab === 'applications' ? (
        applications.length === 0 ? (
          <div className="text-center py-16 text-nocturne-text-tertiary">
            <p className="text-lg mb-1">No applications yet</p>
            <p className="text-sm">Browse gigs and apply to start receiving opportunities</p>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <Link
                key={app.id}
                href={`/gigs/${app.gig_post_id}`}
                className="block bg-nocturne-surface rounded-lg border border-nocturne-border-subtle p-4 hover:border-primary-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-nocturne-text-primary">{app.gig_title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${APP_STATUS_COLORS[app.status] ?? 'bg-nocturne-surface text-nocturne-text-secondary'}`}>
                    {app.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-nocturne-text-tertiary">
                  <span>{app.event_type.replace(/_/g, ' ')}</span>
                  <span>{new Date(app.event_date).toLocaleDateString('en-IN')}</span>
                  <span>{app.event_city}</span>
                  <span>{formatPaise(app.gig_budget_min_paise)} - {formatPaise(app.gig_budget_max_paise)}</span>
                </div>
                {app.proposed_amount_paise && (
                  <p className="text-sm text-nocturne-text-secondary mt-1">Your bid: {formatPaise(app.proposed_amount_paise)}</p>
                )}
              </Link>
            ))}
          </div>
        )
      ) : gigs.length === 0 ? (
        <div className="text-center py-16 text-nocturne-text-tertiary">
          <p className="text-lg mb-1">No gigs found</p>
          <p className="text-sm">Try adjusting your filters or check back later</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {gigs.map((gig) => (
              <GigCard key={gig.id} gig={gig} showMatchScore={tab === 'matching'} />
            ))}
          </div>
          {pagination && pagination.total_pages > 1 && (
            <div className="text-center text-sm text-nocturne-text-tertiary">
              Page {pagination.page} of {pagination.total_pages} ({pagination.total} gigs)
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Client View ────────────────────────────────────────────

function ClientGigsView() {
  const [myPosts, setMyPosts] = useState<GigPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    event_type: 'wedding',
    event_date: '',
    event_city: '',
    genres_needed: '',
    budget_min: '',
    budget_max: '',
    guest_count: '',
    duration_hours: '',
    requirements: '',
  });

  const fetchMyPosts = useCallback(async () => {
    setLoading(true);
    const res = await apiClient<GigPost[]>('/v1/gigs/my-posts');
    if (res.success) setMyPosts(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchMyPosts(); }, [fetchMyPosts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const body = {
      title: form.title,
      description: form.description,
      event_type: form.event_type,
      event_date: form.event_date,
      event_city: form.event_city,
      genres_needed: form.genres_needed.split(',').map((g) => g.trim()).filter(Boolean),
      budget_min_paise: Math.round(Number(form.budget_min) * 100),
      budget_max_paise: Math.round(Number(form.budget_max) * 100),
      guest_count: form.guest_count ? Number(form.guest_count) : undefined,
      duration_hours: form.duration_hours ? Number(form.duration_hours) : undefined,
      requirements: form.requirements || undefined,
    };

    const res = await apiClient<GigPost>('/v1/gigs', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (res.success) {
      setShowForm(false);
      setForm({ title: '', description: '', event_type: 'wedding', event_date: '', event_city: '', genres_needed: '', budget_min: '', budget_max: '', guest_count: '', duration_hours: '', requirements: '' });
      fetchMyPosts();
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-extrabold tracking-tighter text-white">My Gig Posts</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm bg-nocturne-primary text-white px-4 py-2 rounded-lg hover:bg-nocturne-primary"
        >
          {showForm ? 'Cancel' : 'Post a Gig'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-nocturne-surface rounded-lg border border-nocturne-border-subtle p-6 space-y-4">
          <h2 className="text-lg font-semibold text-nocturne-text-primary">Post a New Gig</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Title *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., 3-piece band for Jaipur wedding"
                className="w-full px-3 py-2 border border-nocturne-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Event Type *</label>
              <select
                required
                value={form.event_type}
                onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                className="w-full px-3 py-2 border border-nocturne-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Event Date *</label>
              <input
                type="date"
                required
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                className="w-full px-3 py-2 border border-nocturne-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">City *</label>
              <input
                type="text"
                required
                value={form.event_city}
                onChange={(e) => setForm({ ...form, event_city: e.target.value })}
                placeholder="e.g., Jaipur"
                className="w-full px-3 py-2 border border-nocturne-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Genres Needed * (comma-separated)</label>
              <input
                type="text"
                required
                value={form.genres_needed}
                onChange={(e) => setForm({ ...form, genres_needed: e.target.value })}
                placeholder="e.g., Bollywood, Sufi, Folk"
                className="w-full px-3 py-2 border border-nocturne-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Guest Count</label>
              <input
                type="number"
                value={form.guest_count}
                onChange={(e) => setForm({ ...form, guest_count: e.target.value })}
                placeholder="e.g., 500"
                className="w-full px-3 py-2 border border-nocturne-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Min Budget (₹) *</label>
              <input
                type="number"
                required
                value={form.budget_min}
                onChange={(e) => setForm({ ...form, budget_min: e.target.value })}
                placeholder="e.g., 100000"
                className="w-full px-3 py-2 border border-nocturne-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Max Budget (₹) *</label>
              <input
                type="number"
                required
                value={form.budget_max}
                onChange={(e) => setForm({ ...form, budget_max: e.target.value })}
                placeholder="e.g., 200000"
                className="w-full px-3 py-2 border border-nocturne-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Duration (hours)</label>
              <input
                type="number"
                step="0.5"
                value={form.duration_hours}
                onChange={(e) => setForm({ ...form, duration_hours: e.target.value })}
                placeholder="e.g., 3"
                className="w-full px-3 py-2 border border-nocturne-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Description *</label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe what you're looking for..."
              className="w-full px-3 py-2 border border-nocturne-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Requirements</label>
            <textarea
              rows={2}
              value={form.requirements}
              onChange={(e) => setForm({ ...form, requirements: e.target.value })}
              placeholder="Any specific requirements (sound setup, outfits, etc.)"
              className="w-full px-3 py-2 border border-nocturne-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="bg-nocturne-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-nocturne-primary disabled:opacity-50"
          >
            {submitting ? 'Posting...' : 'Post Gig'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : myPosts.length === 0 ? (
        <div className="text-center py-16 text-nocturne-text-tertiary">
          <p className="text-lg mb-1">No gig posts yet</p>
          <p className="text-sm">Post a gig to find artists for your events</p>
        </div>
      ) : (
        <div className="space-y-3">
          {myPosts.map((gig) => (
            <Link
              key={gig.id}
              href={`/gigs/${gig.id}`}
              className="block bg-nocturne-surface rounded-lg border border-nocturne-border-subtle p-4 hover:border-primary-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-nocturne-text-primary">{gig.title}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-nocturne-text-tertiary">{gig.application_count} applications</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[gig.status] ?? 'bg-nocturne-surface text-nocturne-text-secondary'}`}>
                    {gig.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-nocturne-text-tertiary">
                <span>{gig.event_type.replace(/_/g, ' ')}</span>
                <span>{new Date(gig.event_date).toLocaleDateString('en-IN')}</span>
                <span>{gig.event_city}</span>
                <span className="font-medium text-nocturne-text-secondary">
                  {formatPaise(gig.budget_min_paise)} - {formatPaise(gig.budget_max_paise)}
                </span>
              </div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {gig.genres_needed.map((g) => (
                  <span key={g} className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{g}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Gig Card Component ─────────────────────────────────────

function GigCard({ gig, showMatchScore }: { gig: GigPost; showMatchScore?: boolean }) {
  return (
    <Link
      href={`/gigs/${gig.id}`}
      className="block bg-nocturne-surface rounded-lg border border-nocturne-border-subtle p-4 hover:border-primary-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-nocturne-text-primary leading-tight">{gig.title}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 ${STATUS_COLORS[gig.status] ?? 'bg-nocturne-surface text-nocturne-text-secondary'}`}>
          {gig.status}
        </span>
      </div>

      <div className="flex items-center gap-3 text-sm text-nocturne-text-tertiary mb-2">
        <span className="bg-nocturne-surface text-nocturne-text-secondary px-2 py-0.5 rounded text-xs">{gig.event_type.replace(/_/g, ' ')}</span>
        <span>{gig.event_city}</span>
        <span>{new Date(gig.event_date).toLocaleDateString('en-IN')}</span>
      </div>

      <div className="flex gap-1.5 mb-3 flex-wrap">
        {gig.genres_needed.map((g) => (
          <span key={g} className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{g}</span>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-nocturne-text-secondary">
          {formatPaise(gig.budget_min_paise)} - {formatPaise(gig.budget_max_paise)}
        </span>
        <div className="flex items-center gap-3">
          {showMatchScore && gig.genre_match_count !== undefined && gig.total_genres_needed !== undefined && (
            <span className="text-xs text-nocturne-success font-medium">
              {gig.genre_match_count}/{gig.total_genres_needed} genres match
            </span>
          )}
          <span className="text-xs text-nocturne-text-tertiary">{gig.application_count} applied</span>
        </div>
      </div>
    </Link>
  );
}
