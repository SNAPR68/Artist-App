'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Star, MapPin, ArrowUpRight } from 'lucide-react';

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
  bio: _bio,
  genres,
  base_city,
  trust_score,
  total_bookings,
  is_verified: _is_verified,
  thumbnail_url,
  pricing,
  onShortlist: _onShortlist,
}: ArtistCardProps) {
  const prices = pricing
    ?.map((p) => p.min_price ?? p.min_paise)
    .filter((v): v is number => typeof v === 'number' && !isNaN(v));
  const minPrice = prices?.length ? Math.min(...prices) : null;

  return (
    <Link
      href={`/artists/${id}`}
      className="group relative flex flex-col rounded-2xl overflow-hidden glass-card border border-nocturne-border shadow-nocturne-card hover:shadow-nocturne-card-hover transition-all duration-200"
    >
      {/* ── Image ── */}
      <div className="relative aspect-[4/5] overflow-hidden bg-nocturne-surface-2">
        {thumbnail_url ? (
          <Image
            src={thumbnail_url}
            alt={stage_name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-nocturne-primary/20 to-nocturne-surface-2">
            <span className="text-5xl font-bold text-nocturne-primary/20">
              {stage_name.charAt(0)}
            </span>
          </div>
        )}

        {/* Hover overlay: arrow button top-right */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="w-10 h-10 rounded-xl glass-card backdrop-blur-sm shadow-nocturne-card flex items-center justify-center text-nocturne-text-secondary hover:text-nocturne-primary transition-colors"
            title="View profile"
            aria-label="View artist profile"
          >
            <ArrowUpRight size={18} />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex flex-col flex-1 p-4 space-y-2">
        {/* Name */}
        <h3 className="text-base font-semibold text-nocturne-text-primary truncate leading-tight">
          {stage_name}
        </h3>

        {/* Category/genre */}
        <p className="text-sm text-nocturne-text-secondary line-clamp-1">
          {genres.slice(0, 2).join(', ')}
        </p>

        {/* Rating */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            <Star size={14} className="text-nocturne-gold fill-nocturne-gold" />
            <span className="text-sm font-medium text-nocturne-text-primary tabular-nums">{trust_score.toFixed(1)}</span>
          </div>
          <span className="text-xs text-nocturne-text-secondary">({total_bookings})</span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1 text-xs text-nocturne-text-secondary">
          <MapPin size={13} className="shrink-0" />
          <span>{base_city}</span>
        </div>

        {/* Price — pushed to bottom */}
        <div className="mt-auto pt-2 border-t border-nocturne-border">
          {minPrice !== null ? (
            <p className="text-sm">
              <span className="text-nocturne-text-secondary text-xs font-normal">from</span>
              {' '}
              <span className="text-nocturne-primary font-bold text-lg">
                &#8377;{(minPrice / 100).toLocaleString('en-IN')}
              </span>
            </p>
          ) : (
            <p className="text-xs text-nocturne-text-secondary font-medium">Contact for pricing</p>
          )}
        </div>
      </div>
    </Link>
  );
}
