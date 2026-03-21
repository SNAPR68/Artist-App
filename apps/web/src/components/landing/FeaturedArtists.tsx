'use client';

import Link from 'next/link';
import { Star, BadgeCheck, ArrowRight, Sparkles } from 'lucide-react';
import { useDragScroll } from '@/hooks/useDragScroll';

const FEATURED_ARTISTS = [
  {
    id: 'featured-1',
    name: 'Priya Sharma',
    category: 'Bollywood Singer',
    city: 'Mumbai',
    rating: 4.9,
    reviews: 128,
    price: '25,000',
    verified: true,
    image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&q=80',
  },
  {
    id: 'featured-2',
    name: 'DJ Arjun',
    category: 'DJ & Electronic',
    city: 'Delhi',
    rating: 4.8,
    reviews: 95,
    price: '15,000',
    verified: true,
    image: 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=400&q=80',
  },
  {
    id: 'featured-3',
    name: 'The Groove Band',
    category: 'Live Band',
    city: 'Bangalore',
    rating: 4.9,
    reviews: 76,
    price: '50,000',
    verified: true,
    image: 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=400&q=80',
  },
  {
    id: 'featured-4',
    name: 'Ravi Kumar',
    category: 'Classical Vocalist',
    city: 'Chennai',
    rating: 4.7,
    reviews: 54,
    price: '20,000',
    verified: false,
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
  },
  {
    id: 'featured-5',
    name: 'Ananya Dance',
    category: 'Dance Group',
    city: 'Hyderabad',
    rating: 4.8,
    reviews: 89,
    price: '35,000',
    verified: true,
    image: 'https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=400&q=80',
  },
  {
    id: 'featured-6',
    name: 'Comic Vikram',
    category: 'Stand-up',
    city: 'Pune',
    rating: 4.6,
    reviews: 42,
    price: '12,000',
    verified: true,
    image: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=400&q=80',
  },
];

export function FeaturedArtists() {
  const scrollRef = useDragScroll<HTMLDivElement>();

  return (
    <section className="py-12 md:py-20 relative">
      {/* Subtle gradient background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary-950/20 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-section mx-auto px-6">
        {/* Enhanced Header with FEATURED Label and Sparkle */}
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

        {/* Horizontal scroll container with gradient fades */}
        <div className="relative">
          {/* Left fade gradient */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-surface-bg to-transparent z-20 pointer-events-none rounded-l-2xl" />
          {/* Right fade gradient */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-surface-bg to-transparent z-20 pointer-events-none rounded-r-2xl" />

          {/* Artist cards scroll container */}
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide drag-scroll"
          >
            {FEATURED_ARTISTS.map((artist) => (
              <Link
                key={artist.id}
                href={`/artists/${artist.id}`}
                className="group shrink-0 w-[200px] md:w-[240px]"
              >
                {/* Glass Card Container with Hover Effects */}
                <div className="glass-card rounded-2xl overflow-hidden p-0 border border-glass-border group-hover:border-primary-400/50 transition-all duration-300 group-hover:shadow-glow group-hover:-translate-y-2 h-full flex flex-col">
                  {/* Image Container (16:9 aspect) */}
                  <div className="relative w-full pt-[56.25%] overflow-hidden bg-gradient-to-br from-surface-elevated to-surface-bg">
                    <img
                      src={artist.image}
                      alt={artist.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-bg/80 via-transparent to-transparent" />

                    {/* Verified badge on image */}
                    {artist.verified && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary-500/90 backdrop-blur-sm border border-primary-400/50 shadow-lg">
                        <BadgeCheck size={14} className="text-white fill-white" />
                        <span className="text-xs font-bold text-white">Verified</span>
                      </div>
                    )}
                  </div>

                  {/* Card Body - Premium Typography */}
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    {/* Artist Info */}
                    <div>
                      {/* Name */}
                      <h3 className="text-base font-bold text-text-primary group-hover:text-primary-300 transition-colors line-clamp-1">
                        {artist.name}
                      </h3>

                      {/* Category Tag Pill */}
                      <div className="mt-2">
                        <span className="inline-block px-2.5 py-1 rounded-full bg-primary-500/20 border border-primary-400/30 text-xs font-semibold text-primary-300">
                          {artist.category}
                        </span>
                      </div>

                      {/* City */}
                      <p className="text-xs text-text-muted mt-2.5">
                        📍 {artist.city}
                      </p>
                    </div>

                    {/* Rating and Price Section */}
                    <div className="mt-4 pt-3 border-t border-glass-border space-y-2.5">
                      {/* Rating */}
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1">
                          <Star size={14} className="text-amber-400 fill-amber-400" />
                          <span className="text-sm font-bold text-text-primary">
                            {artist.rating}
                          </span>
                          <span className="text-xs text-text-muted">
                            ({artist.reviews})
                          </span>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-primary-300">
                          ₹{artist.price}
                        </span>
                        <span className="text-xs text-text-muted">/event</span>
                      </div>
                    </div>
                  </div>

                  {/* Hover CTA - subtle overlay */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-primary-950/40 via-transparent to-transparent pointer-events-none rounded-2xl" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Scroll hint for mobile */}
        <p className="text-xs text-text-muted text-center mt-4 md:hidden">
          Swipe to see more artists →
        </p>
      </div>

      {/* CSS for animations */}
      <style>{`
        .drag-scroll {
          scroll-behavior: smooth;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  );
}
