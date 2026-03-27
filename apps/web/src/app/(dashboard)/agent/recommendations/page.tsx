'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiClient } from '../../../../lib/api-client';

interface RecommendedArtist {
  artist_id: string;
  stage_name: string;
  genres: string[];
  base_city: string;
  trust_score?: number;
  match_score?: number;
  is_rising_star?: boolean;
}

function ArtistCard({ artist }: { artist: RecommendedArtist }) {
  const initials = artist.stage_name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const colors = [
    'bg-nocturne-primary-light text-nocturne-primary',
    'bg-purple-100 text-purple-700',
    'bg-teal-100 text-teal-700',
    'bg-orange-100 text-orange-700',
    'bg-pink-100 text-pink-700',
  ];
  const colorIdx = artist.stage_name.charCodeAt(0) % colors.length;

  return (
    <Link
      href={`/artists/${artist.artist_id}`}
      className="bg-nocturne-surface border border-white/5 rounded-lg p-4 hover:border-primary-300 transition-colors"
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${colors[colorIdx]} mb-3`}>
        {initials}
      </div>
      <h3 className="font-medium text-nocturne-text-primary text-sm">{artist.stage_name}</h3>
      <p className="text-xs text-nocturne-text-tertiary mt-0.5">{artist.base_city}</p>
      <div className="flex flex-wrap gap-1 mt-2">
        {artist.genres.slice(0, 3).map((g) => (
          <span key={g} className="bg-nocturne-primary-light text-nocturne-primary text-xs px-2 py-0.5 rounded-full">
            {g}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-3 text-xs text-nocturne-text-tertiary">
        {artist.trust_score != null && <span>Trust: {artist.trust_score}%</span>}
        {artist.match_score != null && (
          <span className="text-nocturne-accent font-medium">{artist.match_score}% match</span>
        )}
      </div>
    </Link>
  );
}

export default function AgentRecommendationsPage() {
  const [forMe, setForMe] = useState<RecommendedArtist[]>([]);
  const [popular, setPopular] = useState<RecommendedArtist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient<RecommendedArtist[]>('/v1/recommendations/for-me'),
      apiClient<RecommendedArtist[]>('/v1/recommendations/popular?limit=10'),
    ])
      .then(([forMeRes, popularRes]) => {
        if (forMeRes.success) setForMe(forMeRes.data);
        if (popularRes.success) setPopular(popularRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      {/* Ambient glows */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-[#c39bff]/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-[#a1faff]/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div>
        <div className="glass-card rounded-2xl p-10 border border-white/10 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <span className="text-[#a1faff] font-bold text-xs tracking-widest uppercase mb-3 block">Recommendations</span>
            <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tighter text-white">Discover Artists</h1>
            <p className="text-white/50 text-sm mt-3">Find new artists for your roster and client events.</p>
          </div>
        </div>
      </div>

      {/* Recommended */}
      <section>
        <h2 className="text-lg font-semibold text-nocturne-text-primary mb-3">Recommended</h2>
        {forMe.length === 0 ? (
          <div className="bg-nocturne-base border border-white/5 rounded-lg p-6 text-center">
            <p className="text-nocturne-text-tertiary text-sm">
              Manage more bookings to get personalized recommendations.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {forMe.map((a) => (
              <ArtistCard key={a.artist_id} artist={a} />
            ))}
          </div>
        )}
      </section>

      {/* Popular Artists */}
      <section>
        <h2 className="text-lg font-semibold text-nocturne-text-primary mb-3">Popular Artists</h2>
        {popular.length === 0 ? (
          <div className="bg-nocturne-base border border-white/5 rounded-lg p-6 text-center">
            <p className="text-nocturne-text-tertiary text-sm">No popular artists data available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {popular.map((a) => (
              <ArtistCard key={a.artist_id} artist={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
