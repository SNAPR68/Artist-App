'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, BadgeCheck, ArrowRight, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDragScroll } from '@/hooks/useDragScroll';
import { apiClient } from '@/lib/api-client';
import { FadeIn } from '@/components/motion';

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

const SkeletonCard = ({ index }: { index: number }) => (
  <motion.div
    className="shrink-0 w-[280px] md:w-[300px] h-[420px] rounded-2xl bg-neutral-200"
    animate={{ opacity: [0.5, 1, 0.5] }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
      delay: index * 0.1,
    }}
  />
);

export function FeaturedArtists() {
  const scrollRef = useDragScroll<HTMLDivElement>();
  const [artists, setArtists] = useState<ArtistData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;

    async function fetchFeatured(): Promise<void> {
      try {
        const res = await apiClient<ArtistData[]>('/v1/search/artists?per_page=6&sort_by=rating');
        if (res.success) {
          const data = res as unknown as { data: ArtistData[] };
          setArtists(data.data ?? []);
          setError(null);
          setLoading(false);
        } else {
          throw new Error(res.errors?.[0]?.message ?? 'API returned error');
        }
      } catch (err) {
        console.error(`[FeaturedArtists] fetch attempt ${retryCount + 1}/${maxRetries}:`, err);
        retryCount++;
        if (retryCount < maxRetries) {
          setError('warming_up');
          setTimeout(fetchFeatured, 5000);
        } else {
          setError('Could not load artists');
          setLoading(false);
        }
      }
    }
    fetchFeatured();
  }, []);

  function formatPrice(artist: ArtistData): string {
    const p = artist.pricing?.[0];
    if (!p) return 'Contact';
    const min = p.min_price ?? 0;
    if (min >= 100) {
      return `₹${Math.round(min / 100).toLocaleString('en-IN')}`;
    }
    return `₹${min.toLocaleString('en-IN')}`;
  }

  if (loading) {
    return (
      <section className="py-20 px-6 bg-white">
        <div className="max-w-section mx-auto">
          <div className="flex gap-6 overflow-hidden pb-4">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} index={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error === 'warming_up') {
    return (
      <section className="py-20 px-6 bg-white">
        <div className="max-w-section mx-auto px-6 text-center">
          <motion.div
            className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-violet-50 border border-violet-200"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <motion.div
              className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <p className="text-sm text-violet-700 font-medium">Loading artists...</p>
          </motion.div>
        </div>
      </section>
    );
  }

  if (error || artists.length === 0) {
    return null;
  }

  return (
    <section className="py-20 px-6 bg-white">
      <div className="relative max-w-section mx-auto">
        {/* Header */}
        <FadeIn direction="down" delay={0.1} once={true}>
          <div className="flex items-end justify-between mb-12">
            <div>
              <motion.div
                className="inline-block mb-3"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5 }}
              >
                <span className="bg-violet-50 text-violet-700 rounded-full px-4 py-2 text-xs font-semibold">
                  Featured Artists
                </span>
              </motion.div>
              <h2 className="text-4xl md:text-5xl font-bold text-neutral-900">
                Top Rated Artists
              </h2>
            </div>
            <Link
              href="/search"
              className="group hidden sm:flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors"
            >
              <span>View all</span>
              <motion.div
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ArrowRight size={16} />
              </motion.div>
            </Link>
          </div>
        </FadeIn>

        {/* Scroll container */}
        <div className="relative">
          <motion.div
            className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white to-transparent z-20 pointer-events-none"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.5 }}
          />
          <motion.div
            className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent z-20 pointer-events-none"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.5 }}
          />

          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide drag-scroll"
          >
            {artists.map((artist, idx) => (
              <motion.div
                key={artist.id}
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{
                  duration: 0.6,
                  delay: idx * 0.1,
                  ease: 'easeOut',
                }}
                className="shrink-0"
              >
                <Link
                  href={`/artists/${artist.id}`}
                  className="group block"
                >
                  <motion.div
                    className="min-w-[280px] md:min-w-[300px] rounded-2xl overflow-hidden bg-white border border-neutral-200 shadow-sm h-full flex flex-col"
                    whileHover={{
                      y: -8,
                      scale: 1.02,
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
                    }}
                    transition={{
                      type: 'spring',
                      damping: 15,
                      stiffness: 200,
                    }}
                  >
                    {/* Image Container */}
                    <div className="relative w-full aspect-[3/4] overflow-hidden bg-neutral-100">
                      {artist.thumbnail_url ? (
                        <motion.div
                          className="relative w-full h-full overflow-hidden"
                          whileHover={{ scale: 1.08 }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        >
                          <Image
                            src={artist.thumbnail_url}
                            alt={artist.stage_name}
                            fill
                            sizes="(max-width: 768px) 280px, 300px"
                            className="object-cover"
                          />
                        </motion.div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-violet-100 to-violet-50">
                          <span className="text-6xl font-bold text-violet-200">
                            {artist.stage_name.charAt(0)}
                          </span>
                        </div>
                      )}

                      {/* Gradient Overlay on Hover */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      />

                      {/* Info Overlay */}
                      <motion.div
                        className="absolute inset-0 flex flex-col justify-end p-4 text-white"
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="mb-2">
                          <h4 className="text-sm font-bold line-clamp-1">
                            {artist.stage_name}
                          </h4>
                          <p className="text-xs text-white/80">
                            {artist.genres?.[0] ?? 'Artist'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          <Star size={14} className="text-amber-300 fill-amber-300" />
                          <span>{parseFloat(String(artist.trust_score)).toFixed(1)}</span>
                        </div>
                      </motion.div>

                      {/* Verified Badge */}
                      {artist.is_verified && (
                        <motion.div
                          className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-600 backdrop-blur-md shadow-lg"
                          initial={{ scale: 0, rotate: -180 }}
                          whileInView={{ scale: 1, rotate: 0 }}
                          viewport={{ once: true }}
                          transition={{
                            type: 'spring',
                            damping: 10,
                            stiffness: 200,
                            delay: idx * 0.1 + 0.3,
                          }}
                        >
                          <BadgeCheck size={14} className="text-white" />
                          <span className="text-[10px] font-bold text-white uppercase tracking-wide">
                            Verified
                          </span>
                        </motion.div>
                      )}
                    </div>

                    {/* Content */}
                    <motion.div className="flex-1 p-4 flex flex-col">
                      <motion.h3
                        className="text-sm font-semibold text-neutral-900 line-clamp-1 group-hover:text-violet-600 transition-colors"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: idx * 0.1 + 0.2 }}
                      >
                        {artist.stage_name}
                      </motion.h3>

                      <motion.p
                        className="text-xs text-neutral-500 mt-1"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: idx * 0.1 + 0.25 }}
                      >
                        {artist.genres?.[0] ?? 'Artist'}
                      </motion.p>

                      {/* Location */}
                      <motion.div
                        className="flex items-center gap-1.5 text-xs text-neutral-500 mt-2 mb-4"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: idx * 0.1 + 0.3 }}
                      >
                        <MapPin size={12} className="flex-shrink-0" />
                        <span className="line-clamp-1">{artist.base_city}</span>
                      </motion.div>

                      {/* Footer */}
                      <motion.div
                        className="mt-auto pt-4 border-t border-neutral-100 flex items-center justify-between"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: idx * 0.1 + 0.35 }}
                      >
                        <div className="flex items-center gap-1.5">
                          <Star size={14} className="text-amber-400 fill-amber-400" />
                          <span className="text-sm font-semibold text-neutral-900 tabular-nums">
                            {parseFloat(String(artist.trust_score)).toFixed(1)}
                          </span>
                        </div>

                        <motion.span
                          className="text-sm font-bold text-violet-600"
                          whileHover={{ scale: 1.1 }}
                          transition={{ type: 'spring', damping: 20 }}
                        >
                          {formatPrice(artist)}
                        </motion.span>
                      </motion.div>
                    </motion.div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.p
          className="text-xs text-neutral-500 text-center mt-6 md:hidden"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          Swipe to see more artists
        </motion.p>
      </div>
    </section>
  );
}
