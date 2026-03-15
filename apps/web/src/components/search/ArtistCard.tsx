'use client';

import Link from 'next/link';

interface ArtistCardProps {
  id: string;
  stage_name: string;
  bio?: string;
  genres: string[];
  base_city: string;
  trust_score: number;
  total_bookings: number;
  is_verified: boolean;
  thumbnail_url?: string;
  pricing?: Array<{ min_price: number; max_price: number }>;
  onShortlist?: (id: string) => void;
}

export function ArtistCard({
  id,
  stage_name,
  bio,
  genres,
  base_city,
  trust_score,
  total_bookings,
  is_verified,
  thumbnail_url,
  pricing,
  onShortlist,
}: ArtistCardProps) {
  const minPrice = pricing?.length
    ? Math.min(...pricing.map((p) => p.min_price))
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div className="aspect-video bg-gray-100 relative">
        {thumbnail_url ? (
          <img src={thumbnail_url} alt={stage_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">
            ♪
          </div>
        )}
        {is_verified && (
          <span className="absolute top-2 left-2 bg-primary-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            VERIFIED
          </span>
        )}
        {onShortlist && (
          <button
            onClick={(e) => { e.preventDefault(); onShortlist(id); }}
            className="absolute top-2 right-2 bg-white/80 hover:bg-white text-gray-600 hover:text-secondary-500 w-7 h-7 rounded-full flex items-center justify-center text-sm transition-colors"
            title="Add to shortlist"
          >
            +
          </button>
        )}
      </div>

      {/* Content */}
      <Link href={`/artists/${id}`} className="block p-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 truncate">{stage_name}</h3>
          <span className="text-sm font-bold text-primary-500">{trust_score}</span>
        </div>

        <p className="text-xs text-gray-500 mb-2">{base_city} · {total_bookings} bookings</p>

        {/* Genres */}
        <div className="flex flex-wrap gap-1 mb-2">
          {genres.slice(0, 3).map((g) => (
            <span key={g} className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded">
              {g}
            </span>
          ))}
          {genres.length > 3 && (
            <span className="text-[10px] text-gray-400">+{genres.length - 3}</span>
          )}
        </div>

        {/* Bio preview */}
        {bio && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-2">{bio}</p>
        )}

        {/* Price */}
        {minPrice !== null && (
          <p className="text-sm font-medium text-gray-900">
            From ₹{(minPrice / 100).toLocaleString('en-IN')}
          </p>
        )}
      </Link>
    </div>
  );
}
