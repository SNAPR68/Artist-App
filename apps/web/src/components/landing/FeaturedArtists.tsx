'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, BadgeCheck, ArrowRight, Sparkles } from 'lucide-react';
import { useDragScroll } from '@/hooks/useDragScroll';
import { apiClient } from '@/lib/api-client';

interface ArtistData {
  id: string;
  stage_name: string;
  genres: string[];
  base_city: string;
  trust_score: string;
  total_bookings: number;
  is_verified: boolean;
  thumbnail_url?: string;
  pricing?: Array<{ min_price?: number; max_price?: number }>;
}

export function FeaturedArtists() {
  const scrollRef = useDragScroll<HTMLDivElement>();
  const [artists, setArtists] = useState<ArtistData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFeatured() {
      try {
        const res = await apiClient<ArtistData[]>('/v1/search/artists?per_page=6&sort_by=rating');
        if (res.success) {
          const data = res as unknown as { data: ArtistData[] };
          setArtists(data.data ?? []);
        } else {
          console.error('[FeaturedArtists] API error:', res.errors);
          setError('Could not load artists');
        }
      } catch (err) {
        console.error('[FeaturedArtists] fetch error:', err);
        setError('Could not load artists');
      } finally {
        setLoading(false);
      }
    }
    fetchFeatured();
  }, []);

  function formatPrice(artist: ArtistData): string {
    const p = artist.pricing?.[0];
    if (!p) return 'Contact';
    const min = p.min_price ?? 0;
    if (min >= 100) {
      // Prices stored in paise — convert to rupees
      return `₹${Math.round(min / 100).toLocaleString('en-IN')}`;
    }
    return `₹${min.toLocaleString('en-IN')}`;
  }

  if (loading) {
    return (
      <section className="py-12 md:py-20">
        <div className="max-w-section mx-auto px-6">
          <div className="flex gap-5 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="shrink-0 w-[200px] md:w-[240px] h-[320px] rounded-2xl bg-surface-elevated animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || artists.length === 0) {
    return null; // Don't show section if no artists
  }

  return (
    <section className="py-12 md:py-20 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-primary-950/20 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-section mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-500/15 border border-primary-400/30 text-xs font-bold text-primary-300 tracking-wider">
                <Sparkles size={12} className="animate-pulse" />
                FEATURED
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-text-primary">
              Most Popular Artists
            </h2>
            <p className="text-sm text-text-muted mt-1">Top-rated performers this month</p>
          </div>
          <Link
            href="/search"
            className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary-400/50 text-sm font-semibold text-primary-400 hover:text-primary-300 transition-all"
          >
            See All
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-surface-bg to-transparent z-20 pointer-events-none rounded-l-2xl" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-surface-bg to-transparent z-20 pointer-events-none rounded-r-2xl" />

          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide drag-scroll"
          >
            {artists.map((artist) => (
              <Link
                key={artist.id}
                href={`/artists/${artist.id}`}
                className="group shrink-0 w-[200px] md:w-[240px]"
              >
                <div className="glass-card rounded-2xl overflow-hidden p-0 border border-glass-border group-hover:border-primary-400/50 transition-all duration-300 group-hover:shadow-glow group-hover:-translate-y-2 h-full flex flex-col">
                  <div className="relative w-full pt-[56.25%] overflow-hidden bg-gradient-to-br from-surface-elevated to-surface-bg">
                    {artist.thumbnail_url ? (
                      <Image
                        src={artist.thumbnail_url}
                        alt={artist.stage_name}
                        fill
                        sizes="(max-width: 768px) 200px, 240px"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-primary-400/40">
                        {artist.stage_name.charAt(0)}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-bg/80 via-transparent to-transparent" />

                    {artist.is_verified && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary-500/90 backdrop-blur-sm border border-primary-400/50 shadow-lg">
                        <BadgeCheck size={14} className="text-white fill-white" />
                        <span className="text-xs font-bold text-white">Verified</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-text-primary group-hover:text-primary-300 transition-colors line-clamp-1">
                        {artist.stage_name}
                      </h3>

                      <div className="mt-2">
                        <span className="inline-block px-2.5 py-1 rounded-full bg-primary-500/20 border border-primary-400/30 text-xs font-semibold text-primary-300">
                          {artist.genres?.[0] ?? 'Artist'}
                        </span>
                      </div>

                      <p className="text-xs text-text-muted mt-2.5">
                        📍 {artist.base_city}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-glass-border space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1">
                          <Star size={14} className="text-amber-400 fill-amber-400" />
                          <span className="text-sm font-bold text-text-primary">
                            {parseFloat(String(artist.trust_score)).toFixed(1)}
                          </span>
                          <span className="text-xs text-text-muted">
                            ({artist.total_bookings})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-primary-300">
                          {formatPrice(artist)}
                        </span>
                        <span className="text-xs text-text-muted">/event</span>
                      </div>
                    </div>
                  </div>

                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-primary-950/40 via-transparent to-transparent pointer-events-none rounded-2xl" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <p className="text-xs text-text-muted text-center mt-4 md:hidden">
          Swipe to see more artists →
        </p>
      </div>

      <style>{`
        .drag-scroll { scroll-behavior: smooth; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </section>
  );
}
