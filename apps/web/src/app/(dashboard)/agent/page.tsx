'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';

interface AgentProfile {
  id: string;
  agency_name: string;
  contact_person: string;
  phone: string;
  email: string;
  city: string;
  commission_pct: number;
  roster_count?: number;
}

interface RosterArtist {
  artist_id: string;
  stage_name: string;
  genres: string[];
  base_city: string;
  is_verified: boolean;
}

export default function AgentDashboard() {
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [roster, setRoster] = useState<RosterArtist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient<AgentProfile>('/v1/agents/profile'),
      apiClient<RosterArtist[]>('/v1/agents/roster'),
    ]).then(([profileRes, rosterRes]) => {
      if (profileRes.success) setProfile(profileRes.data);
      if (rosterRes.success) setRoster(rosterRes.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome, Agent!</h1>
        <p className="text-gray-500 mb-6">Set up your agency profile to start managing artists.</p>
        <Link
          href="/agent/onboarding"
          className="inline-block bg-primary-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-600"
        >
          Create Agency Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{profile.agency_name}</h1>
          <p className="text-gray-500">{profile.contact_person} · {profile.city}</p>
        </div>
        <Link
          href="/agent/roster"
          className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600"
        >
          Manage Roster
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{roster.length}</p>
          <p className="text-sm text-gray-500">Artists in Roster</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{profile.commission_pct}%</p>
          <p className="text-sm text-gray-500">Commission Rate</p>
        </div>
        <Link href="/agent/bookings" className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:border-primary-300 transition-colors">
          <p className="text-2xl mb-0.5">📋</p>
          <p className="text-sm font-medium text-gray-700">Bookings</p>
          <p className="text-xs text-gray-400">Manage pipeline</p>
        </Link>
        <Link href="/agent/recommendations" className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:border-primary-300 transition-colors">
          <p className="text-2xl mb-0.5">✨</p>
          <p className="text-sm font-medium text-gray-700">Recommendations</p>
          <p className="text-xs text-gray-400">AI suggestions</p>
        </Link>
      </div>

      {/* Roster Preview */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Your Artists</h2>
      {roster.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No artists in your roster yet.</p>
          <Link href="/agent/roster" className="text-primary-500 text-sm mt-2 inline-block">
            Add artists to your roster
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roster.map((artist) => (
            <div key={artist.artist_id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium text-gray-900">{artist.stage_name}</h3>
                {artist.is_verified && (
                  <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded">Verified</span>
                )}
              </div>
              <p className="text-sm text-gray-500">{artist.base_city}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {artist.genres.slice(0, 3).map((g) => (
                  <span key={g} className="bg-primary-50 text-primary-700 text-xs px-2 py-0.5 rounded-full">{g}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
