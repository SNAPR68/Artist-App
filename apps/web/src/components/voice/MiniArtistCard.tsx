'use client';

import Link from 'next/link';
import Image from 'next/image';

interface MiniArtistCardProps {
  id: string;
  stage_name: string;
  genres?: string[];
  trust_score?: number;
  base_city?: string;
  thumbnail_url?: string | null;
  price_range_min?: number | null;
  price_range_max?: number | null;
  min_price?: number | null;
  min_paise?: number | null;
  is_verified?: boolean;
  bio?: string | null;
  total_bookings?: number;
  pricing?: Array<{ min_price?: number; max_price?: number; min_paise?: number; max_paise?: number }>;
}

export function MiniArtistCard({
  id,
  stage_name,
  genres = [],
  trust_score,
  base_city,
  thumbnail_url,
  price_range_min,
  is_verified,
  total_bookings,
  pricing,
  min_price,
  min_paise,
}: MiniArtistCardProps) {
  // Compute price from various possible fields
  let displayPrice: number | null = null;
  if (price_range_min && price_range_min > 0) {
    displayPrice = price_range_min;
  } else if (min_price && min_price > 0) {
    displayPrice = min_price;
  } else if (min_paise && min_paise > 0) {
    displayPrice = min_paise;
  } else if (pricing?.length) {
    const prices = pricing
      .map((p) => p.min_price ?? p.min_paise)
      .filter((v): v is number => typeof v === 'number' && !isNaN(v));
    if (prices.length) displayPrice = Math.min(...prices);
  }

  return (
    <Link
      href={`/artists/${id}`}
      className="group w-44 shrink-0 snap-start rounded-lg overflow-hidden border border-nocturne-border bg-nocturne-surface hover:border-primary-500/40 transition-all duration-200"
    >
      {/* Thumbnail */}
      <div className="relative h-24 w-full overflow-hidden bg-gradient-to-br from-primary-900/40 to-secondary-900/40">
        {thumbnail_url ? (
          <Image
            src={thumbnail_url}
            alt={stage_name}
            fill
            sizes="176px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-3xl opacity-30">&#9835;</span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-nocturne-surface/80 to-transparent" />
        {/* Verified badge */}
        {is_verified && (
          <span className="absolute top-1.5 left-1.5 flex items-center gap-0.5 rounded-full bg-primary-600/90 px-1.5 py-0.5 text-[9px] font-semibold text-white">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Verified
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-2.5 space-y-1">
        {/* Name + Rating */}
        <div className="flex items-center justify-between gap-1">
          <h4 className="text-xs font-semibold text-nocturne-text-primary truncate">
            {stage_name}
          </h4>
          {trust_score != null && (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-400 shrink-0">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {Number(trust_score).toFixed(1)}
            </span>
          )}
        </div>

        {/* City + Bookings */}
        <div className="flex items-center gap-1 text-[10px] text-nocturne-text-secondary">
          {base_city && (
            <>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{base_city}</span>
            </>
          )}
          {total_bookings != null && total_bookings > 0 && (
            <>
              <span className="opacity-50">&middot;</span>
              <span>{total_bookings} gigs</span>
            </>
          )}
        </div>

        {/* Genres (max 2) */}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {genres.slice(0, 2).map((g) => (
              <span
                key={g}
                className="rounded-full bg-nocturne-surface border border-nocturne-border px-1.5 py-0.5 text-[9px] text-nocturne-text-secondary"
              >
                {g}
              </span>
            ))}
            {genres.length > 2 && (
              <span className="text-[9px] text-nocturne-text-secondary">+{genres.length - 2}</span>
            )}
          </div>
        )}

        {/* Price */}
        {displayPrice != null && displayPrice > 0 && (
          <p className="text-[10px] font-semibold text-nocturne-accent">
            From &#8377;{(displayPrice / 100).toLocaleString('en-IN')}
          </p>
        )}

        {/* View Profile CTA */}
        <div className="pt-0.5">
          <span className="text-[10px] font-medium text-accent-violet group-hover:text-nocturne-accent transition-colors">
            View Profile &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}
