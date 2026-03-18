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
    'bg-primary-100 text-primary-700',
    'bg-purple-100 text-purple-700',
    'bg-teal-100 text-teal-700',
    'bg-orange-100 text-orange-700',
    'bg-pink-100 text-pink-700',
  ];
  const colorIdx = artist.stage_name.charCodeAt(0) % colors.length;

  return (
    <Link
      href={`/artists/${artist.artist_id}`}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors flex-shrink-0 w-56"
    >
      {badge && (
        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 mb-2">
          {badge}
        </span>
      )}
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${colors[colorIdx]} mb-3`}>
        {initials}
      </div>
      <h3 className="font-medium text-gray-900 text-sm">{artist.stage_name}</h3>
      <p className="text-xs text-gray-500 mt-0.5">{artist.base_city}</p>
      <div className="flex flex-wrap gap-1 mt-2">
        {artist.genres.slice(0, 3).map((g) => (
          <span key={g} className="bg-primary-50 text-primary-700 text-xs px-2 py-0.5 rounded-full">
            {g}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
        {artist.trust_score != null && (
          <span>Trust: {artist.trust_score}%</span>
        )}
        {artist.match_score != null && (
          <span className="text-primary-600 font-medium">{artist.match_score}% match</span>
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
      <h1 className="text-2xl font-bold text-gray-900">Discover Artists</h1>

      {/* Recommended for You */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Recommended for You</h2>
        {forMe.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-500 text-sm">Book more to get personalized recommendations!</p>
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
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Popular Artists</h2>
        {popular.length === 0 ? (
          <p className="text-sm text-gray-500">No popular artists data available yet.</p>
        ) : (
          <HorizontalScroll>
            {popular.map((a) => (
              <ArtistCard key={a.artist_id} artist={a} />
            ))}
          </HorizontalScroll>
        )}
      </section>

      {/* Rising Stars */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Rising Stars</h2>
        {risingStars.length === 0 ? (
          <p className="text-sm text-gray-500">No rising stars identified yet.</p>
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
