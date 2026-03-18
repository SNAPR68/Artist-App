'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Artist Roster</h1>
      </div>

      {/* Add Artist */}
      <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={artistId}
            onChange={(e) => setArtistId(e.target.value)}
            placeholder="Add artist by ID"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={adding}
            className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
          >
            {adding ? 'Adding...' : 'Add to Roster'}
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </form>

      {/* Search/Filter */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search roster by name, city, or genre..."
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />

      {/* Roster Grid */}
      {filtered.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">
            {roster.length === 0 ? 'Your roster is empty. Add artists to get started.' : 'No artists match your search.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((artist) => {
            const initials = artist.stage_name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();
            const isExpanded = expandedId === artist.artist_id;

            return (
              <div key={artist.artist_id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 truncate">{artist.stage_name}</h3>
                      {artist.is_verified && (
                        <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded">Verified</span>
                      )}
                    </div>
                    {artist.trust_score != null && (
                      <span className="text-xs text-gray-500">Trust: {artist.trust_score}%</span>
                    )}
                    <p className="text-sm text-gray-500">{artist.base_city}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {artist.genres.slice(0, 3).map((g) => (
                        <span key={g} className="bg-primary-50 text-primary-700 text-xs px-2 py-0.5 rounded-full">
                          {g}
                        </span>
                      ))}
                    </div>

                    {/* Stats Row */}
                    <div className="flex gap-4 mt-3 text-xs text-gray-500">
                      {artist.total_bookings != null && <span>{artist.total_bookings} total</span>}
                      {artist.month_bookings != null && <span>{artist.month_bookings} this month</span>}
                      {artist.rebook_rate != null && <span>{artist.rebook_rate}% rebook</span>}
                    </div>

                    {/* Intelligence Toggle */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : artist.artist_id)}
                      className="text-xs text-primary-500 hover:underline mt-2"
                    >
                      {isExpanded ? 'Hide Intelligence' : 'View Intelligence'}
                    </button>

                    {isExpanded && artist.intelligence && (
                      <div className="mt-3 bg-gray-50 rounded-lg p-3 space-y-2 text-xs text-gray-600">
                        <div className="grid grid-cols-2 gap-2">
                          {artist.intelligence.booking_velocity_30d != null && (
                            <div>
                              <span className="text-gray-400">Velocity (30d):</span>{' '}
                              <span className="font-medium">{artist.intelligence.booking_velocity_30d}</span>
                            </div>
                          )}
                          {artist.intelligence.booking_velocity_90d != null && (
                            <div>
                              <span className="text-gray-400">Velocity (90d):</span>{' '}
                              <span className="font-medium">{artist.intelligence.booking_velocity_90d}</span>
                            </div>
                          )}
                          {artist.intelligence.demand_alignment_pct != null && (
                            <div>
                              <span className="text-gray-400">Demand Alignment:</span>{' '}
                              <span className="font-medium">{artist.intelligence.demand_alignment_pct}%</span>
                            </div>
                          )}
                          {artist.intelligence.gig_advisor_count != null && (
                            <div>
                              <span className="text-gray-400">Gig Advisor:</span>{' '}
                              <span className="font-medium">{artist.intelligence.gig_advisor_count} recs</span>
                            </div>
                          )}
                        </div>
                        {artist.intelligence.top_event_types && artist.intelligence.top_event_types.length > 0 && (
                          <div>
                            <span className="text-gray-400">Top events:</span>{' '}
                            {artist.intelligence.top_event_types.map((t) => (
                              <span key={t} className="inline-block bg-white border border-gray-200 text-gray-600 text-xs px-1.5 py-0.5 rounded mr-1">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <Link
                    href={`/artists/${artist.artist_id}`}
                    className="text-xs text-primary-500 hover:underline"
                  >
                    View Public Profile
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
