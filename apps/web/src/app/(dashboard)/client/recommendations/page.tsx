'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Sparkles, Star, TrendingUp } from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';

interface RecommendedArtist {
  artist_id: string;
  stage_name: string;
  genres: string[];
  base_city: string;
  trust_score?: number;
  photo_url?: string;
  match_score?: number;
  is_rising_star?: boolean;
}

function ArtistCard({ artist, badge }: { artist: RecommendedArtist; badge?: string }) {
  const initials = artist.stage_name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const colors = [
    'from-primary-500/80 to-primary-600/80',
    'from-purple-500/80 to-purple-600/80',
    'from-teal-500/80 to-teal-600/80',
    'from-orange-500/80 to-orange-600/80',
    'from-pink-500/80 to-pink-600/80',
  ];
  const colorIdx = artist.stage_name.charCodeAt(0) % colors.length;

  return (
    <Link
      href={`/artists/${artist.artist_id}`}
      className="group glass-card glass-border rounded-xl p-5 hover-glow transition-all duration-300 flex-shrink-0 w-56 animate-fade-in"
    >
      {badge && (
        <div className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-pill bg-gradient-to-r from-amber-500/30 to-orange-500/30 border border-amber-400/30 text-amber-300 mb-3 font-semibold">
          <TrendingUp size={12} />
          {badge}
        </div>
      )}
      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br ${colors[colorIdx]} text-white mb-4 group-hover:scale-110 transition-transform`}>
        {initials}
      </div>
      <h3 className="font-heading text-text-primary text-sm group-hover:text-primary-300 transition-colors">{artist.stage_name}</h3>
      <p className="text-xs text-text-muted mt-1">{artist.base_city}</p>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {artist.genres.slice(0, 3).map((g) => (
          <span key={g} className="bg-primary-500/20 text-primary-300 text-xs px-2 py-1 rounded-pill border border-primary-400/30 font-medium">
            {g}
          </span>
        ))}
      </div>

      <div className="space-y-2 mt-4 pt-3 border-t border-white/10">
        {artist.trust_score != null && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Trust Score</span>
            <div className="flex items-center gap-1">
              <Star size={12} className="text-amber-400" />
              <span className="text-text-primary font-semibold">{artist.trust_score}%</span>
            </div>
          </div>
        )}
        {artist.match_score != null && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Match</span>
            <span className="bg-gradient-accent px-2 py-1 rounded-pill text-primary-100 font-bold">{artist.match_score}%</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function HorizontalScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <div className="flex gap-4 pb-2">{children}</div>
    </div>
  );
}

export default function RecommendationsPage() {
  const [forMe, setForMe] = useState<RecommendedArtist[]>([]);
  const [popular, setPopular] = useState<RecommendedArtist[]>([]);
  const [risingStars, setRisingStars] = useState<RecommendedArtist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient<RecommendedArtist[]>('/v1/recommendations/for-me'),
      apiClient<RecommendedArtist[]>('/v1/recommendations/popular?limit=10'),
      apiClient<RecommendedArtist[]>('/v1/recommendations/rising-stars'),
    ])
      .then(([forMeRes, popularRes, risingRes]) => {
        if (forMeRes.success) setForMe(forMeRes.data);
        if (popularRes.success) setPopular(popularRes.data);
        if (risingRes.success) setRisingStars(risingRes.data);
      })
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-text-primary flex items-center gap-2">
          <Sparkles size={32} className="text-primary-400" />
          Discover Artists
        </h1>
        <p className="text-text-muted mt-1">Find the perfect talent for your next event</p>
      </div>

      {/* Recommended for You */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-primary-400" />
          <h2 className="text-xl font-heading text-text-primary">Recommended for You</h2>
        </div>
        {forMe.length === 0 ? (
          <div className="glass-card glass-border rounded-xl p-8 text-center">
            <Sparkles size={40} className="mx-auto mb-3 text-primary-400/50" />
            <p className="text-text-muted text-sm">Book more to get personalized recommendations!</p>
          </div>
        ) : (
          <HorizontalScroll>
            {forMe.map((a) => (
              <ArtistCard key={a.artist_id} artist={a} />
            ))}
          </HorizontalScroll>
        )}
      </section>

      {/* Popular Artists */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Star size={20} className="text-amber-400" />
          <h2 className="text-xl font-heading text-text-primary">Popular Artists</h2>
        </div>
        {popular.length === 0 ? (
          <p className="text-sm text-text-muted">No popular artists data available yet.</p>
        ) : (
          <HorizontalScroll>
            {popular.map((a) => (
              <ArtistCard key={a.artist_id} artist={a} />
            ))}
          </HorizontalScroll>
        )}
      </section>

      {/* Rising Stars */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-emerald-400" />
          <h2 className="text-xl font-heading text-text-primary">Rising Stars</h2>
        </div>
        {risingStars.length === 0 ? (
          <p className="text-sm text-text-muted">No rising stars identified yet.</p>
        ) : (
          <HorizontalScroll>
            {risingStars.map((a) => (
              <ArtistCard key={a.artist_id} artist={a} badge="Rising Star" />
            ))}
          </HorizontalScroll>
        )}
      </section>
    </div>
  );
}
