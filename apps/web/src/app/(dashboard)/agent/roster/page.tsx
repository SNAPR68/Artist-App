'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Search, Plus, CheckCircle2, TrendingUp, Zap } from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';

interface RosterArtist {
  artist_id: string;
  stage_name: string;
  genres: string[];
  base_city: string;
  is_verified: boolean;
  trust_score?: number;
  total_bookings?: number;
  month_bookings?: number;
  rebook_rate?: number;
  intelligence?: {
    booking_velocity_30d?: number;
    booking_velocity_90d?: number;
    top_event_types?: string[];
    demand_alignment_pct?: number;
    gig_advisor_count?: number;
  };
}

const ArtistCardSkeleton = () => (
  <div className="bg-nocturne-surface rounded-2xl p-6 animate-pulse">
    <div className="flex gap-4">
      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary-400/20 to-transparent" />
      <div className="flex-1">
        <div className="h-4 bg-gradient-to-r from-primary-400/20 to-transparent rounded w-32 mb-2" />
        <div className="h-3 bg-gradient-to-r from-primary-400/10 to-transparent rounded w-24" />
      </div>
    </div>
  </div>
);

export default function AgentRosterPage() {
  const [roster, setRoster] = useState<RosterArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [artistId, setArtistId] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRoster();
  }, []);

  const loadRoster = async () => {
    const res = await apiClient<RosterArtist[]>('/v1/agents/roster');
    if (res.success) setRoster(res.data);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artistId.trim()) return;
    setAdding(true);
    setError('');
    const res = await apiClient('/v1/agents/roster', {
      method: 'POST',
      body: JSON.stringify({ artist_id: artistId.trim() }),
    });
    if (res.success) {
      setArtistId('');
      loadRoster();
    } else {
      setError('Failed to add artist. Check the ID and try again.');
    }
    setAdding(false);
  };

  const filtered = roster.filter(
    (a) =>
      a.stage_name.toLowerCase().includes(search.toLowerCase()) ||
      a.base_city.toLowerCase().includes(search.toLowerCase()) ||
      a.genres.some((g) => g.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold text-gradient-nocturne mb-2">Artist Roster</h1>
        <p className="text-nocturne-text-secondary">{roster.length} artists in your roster</p>
      </div>

      {/* Add Artist Form */}
      <form onSubmit={handleAdd} className="bg-nocturne-surface rounded-2xl p-6 border border-nocturne-border">
        <label className="block text-sm font-semibold text-nocturne-text-primary mb-3">Add Artist to Roster</label>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Plus size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-nocturne-text-secondary" />
            <input
              type="text"
              value={artistId}
              onChange={(e) => setArtistId(e.target.value)}
              placeholder="Enter artist ID"
              className="w-full bg-nocturne-surface bg-nocturne-surface border border-nocturne-border rounded-xl pl-10 pr-4 py-3 text-sm text-nocturne-text-primary placeholder-nocturne-text-secondary focus:outline-none focus:ring-1 focus:ring-nocturne-primary transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="bg-nocturne-surface px-6 py-3 rounded-xl text-sm font-semibold text-nocturne-text-primary hover:hover-glow disabled:opacity-50 transition-all border border-nocturne-border flex items-center gap-2"
          >
            {adding ? 'Adding...' : 'Add'}
          </button>
        </div>
        {error && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}
      </form>

      {/* Search/Filter */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-nocturne-text-secondary" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, city, or genre..."
          className="w-full bg-nocturne-surface bg-nocturne-surface border border-nocturne-border rounded-xl pl-12 pr-4 py-3 text-sm text-nocturne-text-primary placeholder-nocturne-text-secondary focus:outline-none focus:ring-1 focus:ring-nocturne-primary transition-all"
        />
      </div>

      {/* Roster Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <ArtistCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-nocturne-surface rounded-2xl p-12 text-center border border-nocturne-border">
          <Search size={48} className="mx-auto text-nocturne-text-secondary/40 mb-4" />
          <p className="text-nocturne-text-secondary mb-4">
            {roster.length === 0 ? 'Your roster is empty. Add artists to get started.' : 'No artists match your search.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((artist) => {
            const isExpanded = expandedId === artist.artist_id;

            return (
              <div key={artist.artist_id} className="bg-nocturne-surface rounded-2xl p-6 border border-nocturne-border hover:hover-glow transition-all group">
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400/30 to-primary-600/30 flex items-center justify-center flex-shrink-0 text-nocturne-accent font-semibold">
                    {artist.stage_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-nocturne-text-primary truncate group-hover:text-nocturne-accent transition-colors">{artist.stage_name}</h3>
                      {artist.is_verified && (
                        <div className="flex-shrink-0 bg-emerald-500/20 rounded-full p-1.5">
                          <CheckCircle2 size={14} className="text-emerald-400" />
                        </div>
                      )}
                    </div>
                    {artist.trust_score != null && (
                      <p className="text-xs text-nocturne-text-secondary">Trust Score: <span className="text-nocturne-accent font-semibold">{artist.trust_score}%</span></p>
                    )}
                    <p className="text-sm text-nocturne-text-secondary">{artist.base_city}</p>
                  </div>
                </div>

                {/* Genres */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {artist.genres.slice(0, 3).map((g) => (
                    <span key={g} className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-primary-400/20 to-primary-600/20 text-nocturne-accent font-medium">
                      {g}
                    </span>
                  ))}
                </div>

                {/* Stats Pills */}
                {(artist.total_bookings != null || artist.month_bookings != null || artist.rebook_rate != null) && (
                  <div className="flex flex-wrap gap-2 mb-4 pb-4 border-t border-nocturne-border">
                    {artist.total_bookings != null && (
                      <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r from-primary-400/10 to-primary-600/10">
                        <TrendingUp size={14} className="text-nocturne-accent" />
                        <span className="text-xs text-nocturne-text-secondary font-medium">{artist.total_bookings} total</span>
                      </div>
                    )}
                    {artist.month_bookings != null && (
                      <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r from-emerald-400/10 to-emerald-600/10">
                        <Zap size={14} className="text-emerald-400" />
                        <span className="text-xs text-nocturne-text-secondary font-medium">{artist.month_bookings} this month</span>
                      </div>
                    )}
                    {artist.rebook_rate != null && (
                      <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r from-blue-400/10 to-blue-600/10">
                        <CheckCircle2 size={14} className="text-blue-400" />
                        <span className="text-xs text-nocturne-text-secondary font-medium">{artist.rebook_rate}% rebook</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Intelligence Toggle */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : artist.artist_id)}
                  className="text-xs text-nocturne-accent hover:text-nocturne-accent font-semibold transition-colors mb-2"
                >
                  {isExpanded ? '- Hide Intelligence' : '+ View Intelligence'}
                </button>

                {/* Intelligence Details */}
                {isExpanded && artist.intelligence && (
                  <div className="mt-4 pt-4 border-t border-nocturne-border bg-nocturne-surface rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {artist.intelligence.booking_velocity_30d != null && (
                        <div className="bg-nocturne-surface rounded-lg p-2">
                          <p className="text-xs text-nocturne-text-secondary">Velocity (30d)</p>
                          <p className="text-sm font-semibold text-nocturne-accent">{artist.intelligence.booking_velocity_30d}</p>
                        </div>
                      )}
                      {artist.intelligence.booking_velocity_90d != null && (
                        <div className="bg-nocturne-surface rounded-lg p-2">
                          <p className="text-xs text-nocturne-text-secondary">Velocity (90d)</p>
                          <p className="text-sm font-semibold text-nocturne-accent">{artist.intelligence.booking_velocity_90d}</p>
                        </div>
                      )}
                      {artist.intelligence.demand_alignment_pct != null && (
                        <div className="bg-nocturne-surface rounded-lg p-2">
                          <p className="text-xs text-nocturne-text-secondary">Demand Alignment</p>
                          <p className="text-sm font-semibold text-emerald-300">{artist.intelligence.demand_alignment_pct}%</p>
                        </div>
                      )}
                      {artist.intelligence.gig_advisor_count != null && (
                        <div className="bg-nocturne-surface rounded-lg p-2">
                          <p className="text-xs text-nocturne-text-secondary">Gig Advisor</p>
                          <p className="text-sm font-semibold text-blue-300">{artist.intelligence.gig_advisor_count} recs</p>
                        </div>
                      )}
                    </div>
                    {artist.intelligence.top_event_types && artist.intelligence.top_event_types.length > 0 && (
                      <div>
                        <p className="text-xs text-nocturne-text-secondary mb-2">Top Event Types</p>
                        <div className="flex flex-wrap gap-2">
                          {artist.intelligence.top_event_types.map((t) => (
                            <span key={t} className="inline-block bg-nocturne-surface border border-nocturne-border text-nocturne-text-secondary text-xs px-2.5 py-1 rounded-full">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Link */}
                <div className="mt-4 pt-4 border-t border-nocturne-border">
                  <Link
                    href={`/artists/${artist.artist_id}`}
                    className="text-xs text-nocturne-accent hover:text-nocturne-accent font-semibold transition-colors"
                  >
                    View Public Profile →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
