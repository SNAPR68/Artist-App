'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Star, MapPin, Heart } from 'lucide-react';

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
  total_bookings: _total_bookings,
  is_verified,
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
      className="group relative overflow-hidden rounded-xl transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1"
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
    >
      {/* ── Poster Image ── */}
      <div className="relative aspect-[3/4] overflow-hidden bg-[#1a191b]">
        {thumbnail_url ? (
          <Image
            src={thumbnail_url}
            alt={stage_name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#c39bff]/20 to-[#1a191b]">
            <span className="text-6xl font-extrabold text-[#c39bff]/20 font-display">
              {stage_name.charAt(0)}
            </span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0f] via-transparent to-transparent opacity-80" />

        {/* Favorite button */}
        <div className="absolute top-4 right-4 glass-card p-2 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Heart size={16} className="text-white" />
        </div>

        {/* Bottom content overlay */}
        <div className="absolute bottom-0 left-0 p-6 w-full">
          {/* Genre + Verified badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            {genres.slice(0, 1).map((g) => (
              <span key={g} className="bg-black/60 backdrop-blur-md text-[10px] px-2 py-1 rounded text-white font-bold tracking-widest uppercase border border-white/10">
                {g}
              </span>
            ))}
            {is_verified && (
              <span className="bg-[#c39bff]/80 backdrop-blur-md text-[10px] px-2 py-1 rounded text-white font-bold tracking-widest uppercase">
                Verified
              </span>
            )}
          </div>

          {/* Artist name */}
          <h3 className="text-xl font-display font-bold text-white tracking-tight leading-tight uppercase">
            {stage_name}
          </h3>

          {/* Rating + City + Price — revealed on hover */}
          <div className="mt-3 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Star size={12} className="text-[#ffbf00] fill-[#ffbf00]" />
                <span className="text-xs font-bold text-white">{trust_score.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin size={12} className="text-white/40" />
                <span className="text-xs text-white/60">{base_city}</span>
              </div>
            </div>
            {minPrice !== null ? (
              <span className="text-[#a1faff] font-bold text-sm">
                ₹{(minPrice / 100).toLocaleString('en-IN')}
              </span>
            ) : (
              <span className="text-white/40 text-xs">Contact</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
