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

  if (!profile) return <p className="text-nocturne-text-tertiary text-center py-10">Profile not found.</p>;

  return (
    <div className="space-y-6">
      {/* ─── Bento Hero ─── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fade-in-up">
        <div className="md:col-span-8 glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <span className="text-[#a1faff] font-bold text-xs tracking-widest uppercase mb-2 block">Your Profile</span>
            <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tighter text-white mb-2">{profile.stage_name}</h1>
            <p className="text-white/40 text-sm">{profile.bio || 'Add a bio to tell clients about yourself'}</p>
            <div className="flex gap-8 mt-6">
              <div>
                <p className="text-white/40 text-xs mb-1">City</p>
                <p className="text-lg font-bold text-white">{profile.base_city}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs mb-1">Travel</p>
                <p className="text-lg font-bold text-white">{profile.travel_radius_km} km</p>
              </div>
              <div>
                <p className="text-white/40 text-xs mb-1">Completion</p>
                <p className="text-lg font-bold text-[#a1faff]">{profile.profile_completion_pct}%</p>
              </div>
            </div>
          </div>
        </div>
        <div className="md:col-span-4 glass-card rounded-xl p-6 border border-white/5 border-l-4 border-l-[#c39bff] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/40 mb-4">Quick Actions</h3>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="w-full btn-nocturne-primary rounded-xl py-3 text-sm">
                Edit Profile
              </button>
            ) : (
              <div className="space-y-2">
                <button onClick={handleSave} disabled={saving} className="w-full btn-nocturne-primary rounded-xl py-3 text-sm disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={() => setEditing(false)} className="w-full btn-nocturne-secondary rounded-xl py-3 text-sm">
                  Cancel
                </button>
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="flex flex-wrap gap-1">
              {profile.genres.slice(0, 3).map((g) => (
                <span key={g} className="bg-[#c39bff]/15 text-[#c39bff] text-xs px-2 py-1 rounded-full">{g}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Body: 7+5 Split ─── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Main content */}
        <div className="md:col-span-7 space-y-6">
          {/* Basic Info */}
          <div className="glass-card rounded-xl p-6 border border-white/5">
            <h2 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">Basic Info</h2>
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/50 mb-1">Stage Name</label>
                  <input value={stageName} onChange={(e) => setStageName(e.target.value)} className="input-nocturne" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/50 mb-1">Bio</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className="input-nocturne" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/50 mb-1">Base City</label>
                  <input value={baseCity} onChange={(e) => setBaseCity(e.target.value)} className="input-nocturne" />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-white/30 mb-1">Stage Name</p>
                  <p className="text-white font-medium">{profile.stage_name}</p>
                </div>
                <div>
                  <p className="text-xs text-white/30 mb-1">Bio</p>
                  <p className="text-white/70">{profile.bio || 'Not set'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-white/30 mb-1">Base City</p>
                    <p className="text-white">{profile.base_city}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/30 mb-1">Travel Radius</p>
                    <p className="text-white">{profile.travel_radius_km} km</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Media */}
          <div className="glass-card rounded-xl p-6 border border-white/5">
            <h2 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">Media</h2>
            <MediaUploader media={profile.media} onUpdate={loadProfile} />
          </div>
        </div>

        {/* Side panel */}
        <div className="md:col-span-5 space-y-6">
          {/* Performance */}
          <div className="glass-card rounded-xl p-6 border border-white/5">
            <h2 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">Performance</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-white/30 mb-2">Genres</p>
                <div className="flex flex-wrap gap-1">
                  {profile.genres.map((g) => (
                    <span key={g} className="bg-[#c39bff]/15 text-[#c39bff] text-xs px-2.5 py-1 rounded-full">{g}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-white/30 mb-2">Languages</p>
                <div className="flex flex-wrap gap-1">
                  {profile.languages.map((l) => (
                    <span key={l} className="bg-white/5 text-white/70 text-xs px-2.5 py-1 rounded-full">{l}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-white/30 mb-1">Duration</p>
                <p className="text-white">{profile.performance_duration_min}–{profile.performance_duration_max} min</p>
              </div>
              <div>
                <p className="text-xs text-white/30 mb-1">Event Types</p>
                <div className="flex flex-wrap gap-1">
                  {profile.event_types.map((e) => (
                    <span key={e} className="bg-[#a1faff]/10 text-[#a1faff] text-xs px-2.5 py-1 rounded-full">{e}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
