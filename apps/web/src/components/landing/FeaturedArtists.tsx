'use client';

import Link from 'next/link';
import { Star, BadgeCheck, ArrowRight } from 'lucide-react';
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
    <section className="py-12 md:py-16">
      <div className="max-w-section mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg md:text-xl font-heading font-bold text-text-primary">
              Most Popular
            </h2>
            <p className="text-xs text-text-muted mt-0.5">Top-rated artists this month</p>
          </div>
          <Link
            href="/search"
            className="flex items-center gap-1 text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors"
          >
            See All
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Horizontal scroll artist cards */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide drag-scroll"
        >
          {FEATURED_ARTISTS.map((artist) => (
            <Link
              key={artist.id}
              href={`/artists/${artist.id}`}
              className="group shrink-0 w-[150px] md:w-[170px]"
            >
              {/* Circular image */}
              <div className="relative mx-auto w-[120px] h-[120px] md:w-[140px] md:h-[140px] rounded-full overflow-hidden mb-3 ring-2 ring-glass-border group-hover:ring-primary-500/50 transition-all">
                <img
                  src={artist.image}
                  alt={artist.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                {/* Gradient overlay at bottom */}
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
                {/* Verified badge */}
                {artist.verified && (
                  <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center ring-2 ring-surface-bg">
                    <BadgeCheck size={14} className="text-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="text-center">
                <h3 className="text-sm font-semibold text-text-primary truncate group-hover:text-primary-400 transition-colors">
                  {artist.name}
                </h3>
                <p className="text-[11px] text-text-muted mt-0.5">{artist.category}</p>
                {/* Rating + Price */}
                <div className="flex items-center justify-center gap-2 mt-1.5">
                  <span className="flex items-center gap-0.5 text-xs">
                    <Star size={11} className="text-amber-400 fill-amber-400" />
                    <span className="text-text-secondary font-medium">{artist.rating}</span>
                  </span>
                  <span className="text-glass-border">|</span>
                  <span className="text-[11px] text-primary-400 font-semibold">
                    &#8377;{artist.price}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
