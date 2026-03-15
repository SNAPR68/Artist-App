'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '../../../../lib/api-client';
import { MediaUploader } from '../../../../components/media/MediaUploader';

interface ArtistProfile {
  id: string;
  stage_name: string;
  bio: string;
  genres: string[];
  languages: string[];
  base_city: string;
  travel_radius_km: number;
  event_types: string[];
  performance_duration_min: number;
  performance_duration_max: number;
  pricing: string;
  profile_completion_pct: number;
  media: MediaItem[];
}

interface MediaItem {
  id: string;
  media_type: 'image' | 'video';
  original_url: string;
  thumbnail_url?: string;
  transcode_status: string;
  sort_order: number;
}

export default function ArtistProfilePage() {
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [stageName, setStageName] = useState('');
  const [bio, setBio] = useState('');
  const [baseCity, setBaseCity] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const res = await apiClient<ArtistProfile>('/v1/artists/profile');
    if (res.success) {
      setProfile(res.data);
      setStageName(res.data.stage_name);
      setBio(res.data.bio ?? '');
      setBaseCity(res.data.base_city);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await apiClient<ArtistProfile>('/v1/artists/profile', {
      method: 'PUT',
      body: JSON.stringify({
        stage_name: stageName,
        bio: bio || undefined,
        base_city: baseCity,
      }),
    });

    if (res.success) {
      setProfile({ ...profile!, ...res.data });
      setEditing(false);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!profile) return <p className="text-gray-500 text-center py-10">Profile not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-primary-500 hover:text-primary-600 font-medium"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="text-sm text-gray-500 hover:text-gray-700">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-sm bg-primary-500 text-white px-4 py-1.5 rounded-lg hover:bg-primary-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Basic Info</h2>

        {editing ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stage Name</label>
              <input
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base City</label>
              <input
                value={baseCity}
                onChange={(e) => setBaseCity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-sm text-gray-500">Stage Name</p>
              <p className="text-gray-900 font-medium">{profile.stage_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Bio</p>
              <p className="text-gray-900">{profile.bio || 'Not set'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Base City</p>
                <p className="text-gray-900">{profile.base_city}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Travel Radius</p>
                <p className="text-gray-900">{profile.travel_radius_km} km</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Performance Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Performance</h2>
        <div>
          <p className="text-sm text-gray-500">Genres</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {profile.genres.map((g) => (
              <span key={g} className="bg-primary-50 text-primary-700 text-xs px-2 py-1 rounded-full">{g}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-500">Languages</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {profile.languages.map((l) => (
              <span key={l} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">{l}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-500">Duration</p>
          <p className="text-gray-900">{profile.performance_duration_min}–{profile.performance_duration_max} minutes</p>
        </div>
      </div>

      {/* Media */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Media</h2>
        <MediaUploader media={profile.media} onUpdate={loadProfile} />
      </div>
    </div>
  );
}
