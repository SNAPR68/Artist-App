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
  open: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  closed: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
  filled: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  expired: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
  cancelled: 'bg-red-500/20 text-red-300 border border-red-500/30',
};

const APP_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  shortlisted: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  accepted: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  rejected: 'bg-red-500/20 text-red-300 border border-red-500/30',
  withdrawn: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
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

  if (!_initialized) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c39bff]" />
      </div>
    );
  }

  const isArtist = user?.role === 'artist';
  const isClient = user?.role === 'client' || user?.role === 'event_company' || user?.role === 'agent';

  if (isArtist) return <ArtistGigsView />;
  if (isClient) return <ClientGigsView />;

  return (
    <div className="text-center py-16 text-white/50">
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
    <div className="space-y-6 animate-fade-in">
      {/* Header with ambient glow */}
      <div className="relative">
        <div className="absolute -top-20 -right-32 w-96 h-96 bg-[#c39bff]/5 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 -left-32 w-96 h-96 bg-[#a1faff]/5 blur-3xl rounded-full pointer-events-none" />
        <div className="glass-card rounded-2xl p-8 border border-white/5 relative z-10">
          <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tighter text-white">
            Gig Marketplace
          </h1>
          <p className="text-white/50 mt-2">Discover opportunities that match your talent</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5 overflow-x-auto">
        {(['matching', 'browse', 'applications'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              tab === t
                ? 'border-[#c39bff] text-[#c39bff]'
                : 'border-transparent text-white/50 hover:text-white/70'
            }`}
          >
            {t === 'matching' ? 'Matching Gigs' : t === 'browse' ? 'Browse All' : 'My Applications'}
          </button>
        ))}
      </div>

      {/* Filters */}
      {tab !== 'applications' && (
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Filter by city..."
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="input-nocturne rounded-lg px-4 py-2 text-sm"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input-nocturne rounded-lg px-4 py-2 text-sm"
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c39bff]" />
        </div>
      ) : tab === 'applications' ? (
        applications.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center border border-white/5">
            <p className="text-white mb-2">No applications yet</p>
            <p className="text-white/50 text-sm">Browse gigs and apply to start receiving opportunities</p>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <Link
                key={app.id}
                href={`/gigs/${app.gig_post_id}`}
                className="glass-card rounded-xl border border-white/5 p-4 hover:border-[#a1faff]/30 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-white">{app.gig_title}</h3>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${APP_STATUS_COLORS[app.status] ?? 'bg-white/5 text-white/50'}`}>
                    {app.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-white/50 flex-wrap">
                  <span>{app.event_type.replace(/_/g, ' ')}</span>
                  <span>{new Date(app.event_date).toLocaleDateString('en-IN')}</span>
                  <span>{app.event_city}</span>
                  <span>{formatPaise(app.gig_budget_min_paise)} - {formatPaise(app.gig_budget_max_paise)}</span>
                </div>
                {app.proposed_amount_paise && (
                  <p className="text-sm text-[#c39bff] mt-2">Your bid: {formatPaise(app.proposed_amount_paise)}</p>
                )}
              </Link>
            ))}
          </div>
        )
      ) : gigs.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-white/5">
          <p className="text-white mb-2">No gigs found</p>
          <p className="text-white/50 text-sm">Try adjusting your filters or check back later</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {gigs.map((gig) => (
              <GigCard key={gig.id} gig={gig} showMatchScore={tab === 'matching'} />
            ))}
          </div>
          {pagination && pagination.total_pages > 1 && (
            <div className="text-center text-sm text-white/50">
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tighter text-white">My Gig Posts</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-nocturne-primary text-sm px-6 py-3 rounded-lg"
        >
          {showForm ? 'Cancel' : 'Post a Gig'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card rounded-2xl border border-white/5 p-8 space-y-6">
          <h2 className="text-2xl font-display font-bold text-white">Post a New Gig</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-white/70 mb-2">Title *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., 3-piece band for Jaipur wedding"
                className="input-nocturne w-full rounded-lg px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-white/70 mb-2">Event Type *</label>
              <select
                required
                value={form.event_type}
                onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                className="input-nocturne w-full rounded-lg px-4 py-3"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-white/70 mb-2">Event Date *</label>
              <input
                type="date"
                required
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                className="input-nocturne w-full rounded-lg px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-white/70 mb-2">City *</label>
              <input
                type="text"
                required
                value={form.event_city}
                onChange={(e) => setForm({ ...form, event_city: e.target.value })}
                placeholder="e.g., Jaipur"
                className="input-nocturne w-full rounded-lg px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-white/70 mb-2">Genres Needed * (comma-separated)</label>
              <input
                type="text"
                required
                value={form.genres_needed}
                onChange={(e) => setForm({ ...form, genres_needed: e.target.value })}
                placeholder="e.g., Bollywood, Sufi, Folk"
                className="input-nocturne w-full rounded-lg px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-white/70 mb-2">Guest Count</label>
              <input
                type="number"
                value={form.guest_count}
                onChange={(e) => setForm({ ...form, guest_count: e.target.value })}
                placeholder="e.g., 500"
                className="input-nocturne w-full rounded-lg px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-white/70 mb-2">Min Budget (₹) *</label>
              <input
                type="number"
                required
                value={form.budget_min}
                onChange={(e) => setForm({ ...form, budget_min: e.target.value })}
                placeholder="e.g., 100000"
                className="input-nocturne w-full rounded-lg px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-white/70 mb-2">Max Budget (₹) *</label>
              <input
                type="number"
                required
                value={form.budget_max}
                onChange={(e) => setForm({ ...form, budget_max: e.target.value })}
                placeholder="e.g., 200000"
                className="input-nocturne w-full rounded-lg px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-white/70 mb-2">Duration (hours)</label>
              <input
                type="number"
                step="0.5"
                value={form.duration_hours}
                onChange={(e) => setForm({ ...form, duration_hours: e.target.value })}
                placeholder="e.g., 3"
                className="input-nocturne w-full rounded-lg px-4 py-3"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-white/70 mb-2">Description *</label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe what you're looking for..."
              className="input-nocturne w-full rounded-lg px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-white/70 mb-2">Requirements</label>
            <textarea
              rows={2}
              value={form.requirements}
              onChange={(e) => setForm({ ...form, requirements: e.target.value })}
              placeholder="Any specific requirements (sound setup, outfits, etc.)"
              className="input-nocturne w-full rounded-lg px-4 py-3"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-nocturne-primary w-full py-3 rounded-lg disabled:opacity-50"
          >
            {submitting ? 'Posting...' : 'Post Gig'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c39bff]" />
        </div>
      ) : myPosts.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-white/5">
          <p className="text-white mb-2">No gig posts yet</p>
          <p className="text-white/50 text-sm">Post a gig to find artists for your events</p>
        </div>
      ) : (
        <div className="space-y-3">
          {myPosts.map((gig) => (
            <Link
              key={gig.id}
              href={`/gigs/${gig.id}`}
              className="glass-card rounded-xl border border-white/5 p-4 hover:border-[#a1faff]/30 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-white">{gig.title}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/50">{gig.application_count} applications</span>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLORS[gig.status] ?? 'bg-white/5 text-white/50'}`}>
                    {gig.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-white/50 flex-wrap">
                <span>{gig.event_type.replace(/_/g, ' ')}</span>
                <span>{new Date(gig.event_date).toLocaleDateString('en-IN')}</span>
                <span>{gig.event_city}</span>
                <span className="font-medium text-[#c39bff]">
                  {formatPaise(gig.budget_min_paise)} - {formatPaise(gig.budget_max_paise)}
                </span>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {gig.genres_needed.map((g) => (
                  <span key={g} className="text-xs bg-[#c39bff]/20 text-[#c39bff] px-3 py-1 rounded-full border border-[#c39bff]/30">{g}</span>
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
      className="glass-card rounded-xl border border-white/5 p-5 hover:border-[#a1faff]/30 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-white leading-tight group-hover:text-[#c39bff] transition-colors">{gig.title}</h3>
        <span className={`text-xs px-3 py-1 rounded-full font-medium shrink-0 ml-2 ${STATUS_COLORS[gig.status] ?? 'bg-white/5 text-white/50'}`}>
          {gig.status}
        </span>
      </div>

      <div className="flex items-center gap-3 text-sm text-white/50 mb-3 flex-wrap">
        <span className="bg-white/5 px-2 py-1 rounded text-xs">{gig.event_type.replace(/_/g, ' ')}</span>
        <span>{gig.event_city}</span>
        <span>{new Date(gig.event_date).toLocaleDateString('en-IN')}</span>
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        {gig.genres_needed.map((g) => (
          <span key={g} className="text-xs bg-[#c39bff]/20 text-[#c39bff] px-3 py-1 rounded-full border border-[#c39bff]/30">{g}</span>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm pt-3 border-t border-white/5">
        <span className="font-medium text-[#c39bff]">
          {gig.budget_min_paise ? `${(gig.budget_min_paise / 100).toLocaleString('en-IN')} - ${(gig.budget_max_paise / 100).toLocaleString('en-IN')} ₹` : 'Budget TBD'}
        </span>
        <div className="flex items-center gap-3">
          {showMatchScore && gig.genre_match_count !== undefined && gig.total_genres_needed !== undefined && (
            <span className="text-xs text-emerald-400 font-medium">
              {gig.genre_match_count}/{gig.total_genres_needed} genres match
            </span>
          )}
          <span className="text-xs text-white/50">{gig.application_count} applied</span>
        </div>
      </div>
    </Link>
  );
}
