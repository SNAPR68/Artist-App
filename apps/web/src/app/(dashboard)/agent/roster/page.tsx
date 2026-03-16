'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '../../../../lib/api-client';

interface RosterArtist {
  artist_id: string;
  stage_name: string;
  genres: string[];
  base_city: string;
  is_verified: boolean;
  link_id: string;
}

export default function AgentRosterPage() {
  const [roster, setRoster] = useState<RosterArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [artistId, setArtistId] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchRoster = async () => {
    const res = await apiClient<RosterArtist[]>('/v1/agents/roster');
    if (res.success) setRoster(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchRoster(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artistId.trim()) return;
    setAdding(true);
    setError('');
    setSuccess('');

    const res = await apiClient('/v1/agents/roster', {
      method: 'POST',
      body: JSON.stringify({ artist_id: artistId.trim() }),
    });

    if (res.success) {
      setSuccess('Artist added to roster');
      setArtistId('');
      fetchRoster();
    } else {
      setError(res.errors?.[0]?.message ?? 'Failed to add artist');
    }
    setAdding(false);
  };

  const handleRemove = async (artistIdToRemove: string) => {
    const res = await apiClient(`/v1/agents/roster/${artistIdToRemove}`, { method: 'DELETE' });
    if (res.success) {
      setRoster(roster.filter((a) => a.artist_id !== artistIdToRemove));
      setSuccess('Artist removed from roster');
    } else {
      setError(res.errors?.[0]?.message ?? 'Failed to remove artist');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Manage Roster</h1>

      {/* Add Artist Form */}
      <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Add Artist to Roster</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={artistId}
            onChange={(e) => setArtistId(e.target.value)}
            placeholder="Enter Artist Profile ID"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={adding}
            className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
          >
            {adding ? 'Adding...' : 'Add'}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">{success}</div>
      )}

      {/* Roster List */}
      {roster.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">Your roster is empty. Add artists using their profile IDs.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {roster.map((artist) => (
            <div key={artist.artist_id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{artist.stage_name}</h3>
                  {artist.is_verified && (
                    <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded">Verified</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{artist.base_city}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {artist.genres.slice(0, 4).map((g) => (
                    <span key={g} className="bg-primary-50 text-primary-700 text-xs px-2 py-0.5 rounded-full">{g}</span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => handleRemove(artist.artist_id)}
                className="text-red-500 text-sm hover:text-red-700 font-medium"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
