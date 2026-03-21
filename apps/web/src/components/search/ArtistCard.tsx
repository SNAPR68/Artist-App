'use client';

import Link from 'next/link';
import { Star, MapPin, BadgeCheck, Heart } from 'lucide-react';

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
  pricing?: Array<{ min_price?: number; max_price?: number; min_paise?: number; max_paise?: number }>;
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
  const prices = pricing
    ?.map((p) => p.min_price ?? p.min_paise)
    .filter((v): v is number => typeof v === 'number' && !isNaN(v));
  const minPrice = prices?.length ? Math.min(...prices) : null;

  return (
    <div
      className="group glass-card overflow-hidden hover:-translate-y-1 transition-all duration-300"
    >
      {/* Thumbnail */}
      <div className="aspect-[4/3] bg-surface-elevated relative overflow-hidden">
        {thumbnail_url ? (
          <img
            src={thumbnail_url}
            alt={stage_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-500/10 to-secondary-500/10">
            <span className="text-4xl opacity-30">&#9834;</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-surface-bg/80 to-transparent" />

        {/* Verified badge */}
        {is_verified && (
          <span className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-pill bg-primary-500/80 backdrop-blur-sm text-white text-[10px] font-bold">
            <BadgeCheck size={10} />
            VERIFIED
          </span>
        )}

        {/* Heart / Shortlist */}
        <button
          onClick={(e) => { e.preventDefault(); onShortlist?.(id); }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-bg/40 backdrop-blur-sm border border-glass-border flex items-center justify-center text-text-muted hover:text-accent-magenta hover:scale-110 transition-all"
          title="Add to shortlist"
        >
          <Heart size={14} />
        </button>

        {/* Book Now overlay on hover */}
        <div className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
          <Link
            href={`/artists/${id}`}
            className="block w-full text-center py-2.5 bg-gradient-accent text-white text-sm font-semibold rounded-lg hover-glow"
          >
            View Profile
          </Link>
        </div>
      </div>

      {/* Content */}
      <Link href={`/artists/${id}`} className="block p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-text-primary truncate">{stage_name}</h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Star size={13} className="text-amber-400 fill-amber-400" />
            <span className="text-sm font-medium text-text-primary">{trust_score}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-text-muted mb-2">
          <MapPin size={11} />
          <span>{base_city}</span>
          <span className="text-glass-border mx-1">&middot;</span>
          <span>{total_bookings} bookings</span>
        </div>

        {/* Genres */}
        <div className="flex flex-wrap gap-1 mb-2">
          {genres.slice(0, 3).map((g) => (
            <span key={g} className="bg-glass-light border border-glass-border text-text-muted text-[10px] px-2 py-0.5 rounded-pill">
              {g}
            </span>
          ))}
          {genres.length > 3 && (
            <span className="text-[10px] text-text-muted">+{genres.length - 3}</span>
          )}
        </div>

        {/* Bio preview */}
        {bio && (
          <p className="text-xs text-text-muted line-clamp-2 mb-2">{bio}</p>
        )}

        {/* Price */}
        {minPrice !== null && (
          <p className="text-sm font-semibold text-text-primary">
            From &#8377;{(minPrice / 100).toLocaleString('en-IN')}
          </p>
        )}
      </Link>
    </div>
  );
}
