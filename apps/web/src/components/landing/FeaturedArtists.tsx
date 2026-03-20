'use client';

import Link from 'next/link';
import { Star, MapPin, BadgeCheck, Heart, ArrowRight } from 'lucide-react';

// Static featured artists data (avoids API dependency for landing page)
const FEATURED_ARTISTS = [
  {
    id: 'featured-1',
    name: 'Priya Sharma',
    category: 'Bollywood Singer',
    city: 'Mumbai',
    rating: 4.9,
    reviews: 128,
    price: '₹25,000',
    verified: true,
    gradient: 'from-primary-500/30 to-secondary-500/10',
  },
  {
    id: 'featured-2',
    name: 'DJ Arjun',
    category: 'DJ & Electronic',
    city: 'Delhi',
    rating: 4.8,
    reviews: 95,
    price: '₹15,000',
    verified: true,
    gradient: 'from-secondary-500/30 to-accent-magenta/10',
  },
  {
    id: 'featured-3',
    name: 'The Groove Band',
    category: 'Live Band',
    city: 'Bangalore',
    rating: 4.9,
    reviews: 76,
    price: '₹50,000',
    verified: true,
    gradient: 'from-accent-magenta/30 to-primary-500/10',
  },
  {
    id: 'featured-4',
    name: 'Ravi Kumar',
    category: 'Classical Vocalist',
    city: 'Chennai',
    rating: 4.7,
    reviews: 54,
    price: '₹20,000',
    verified: false,
    gradient: 'from-amber-500/30 to-orange-600/10',
  },
  {
    id: 'featured-5',
    name: 'Ananya Dance Crew',
    category: 'Dance Group',
    city: 'Hyderabad',
    rating: 4.8,
    reviews: 89,
    price: '₹35,000',
    verified: true,
    gradient: 'from-green-500/30 to-emerald-600/10',
  },
  {
    id: 'featured-6',
    name: 'Comic Vikram',
    category: 'Stand-up Comedian',
    city: 'Pune',
    rating: 4.6,
    reviews: 42,
    price: '₹12,000',
    verified: true,
    gradient: 'from-cyan-500/30 to-sky-600/10',
  },
];

export function FeaturedArtists() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-section mx-auto">
        <div>
          <h2 className="text-h2 font-heading font-bold text-text-primary text-center mb-3">
            Top Artists <span className="text-gradient">This Month</span>
          </h2>
          <p className="text-text-muted text-center mb-12">
            Handpicked talent trusted by thousands of event planners
          </p>
        </div>

        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURED_ARTISTS.map((artist) => (
              <div
                key={artist.id}
                className="group glass-card overflow-hidden hover:-translate-y-1 transition-transform"
              >
                {/* Image Placeholder */}
                <div className={`relative aspect-[4/3] bg-gradient-to-br ${artist.gradient} overflow-hidden`}>
                  <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-20">
                    ♪
                  </div>
                  {/* Gradient overlay at bottom */}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-surface-bg/80 to-transparent" />

                  {/* Category pill */}
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-pill bg-surface-bg/60 backdrop-blur-sm border border-glass-border text-[11px] font-medium text-text-secondary">
                    {artist.category}
                  </span>

                  {/* Heart icon */}
                  <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-bg/40 backdrop-blur-sm border border-glass-border flex items-center justify-center text-text-muted hover:text-accent-magenta transition-colors">
                    <Heart size={14} />
                  </button>

                  {/* Book Now - appears on hover */}
                  <div className="absolute inset-x-3 bottom-3">
                    <Link
                      href={`/artists/${artist.id}`}
                      className="block w-full text-center py-2.5 bg-gradient-accent text-white text-sm font-semibold rounded-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all"
                    >
                      Book Now
                    </Link>
                  </div>
                </div>

                {/* Content */}
                <Link href={`/artists/${artist.id}`} className="block p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <h3 className="font-semibold text-text-primary truncate">{artist.name}</h3>
                    {artist.verified && <BadgeCheck size={14} className="text-primary-400 flex-shrink-0" />}
                  </div>

                  <div className="flex items-center gap-1 text-xs text-text-muted mb-2">
                    <MapPin size={12} />
                    <span>{artist.city}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star size={13} className="text-amber-400 fill-amber-400" />
                      <span className="text-sm font-medium text-text-primary">{artist.rating}</span>
                      <span className="text-xs text-text-muted">({artist.reviews})</span>
                    </div>
                    <span className="text-sm font-semibold text-text-primary">
                      From {artist.price}
                    </span>
                  </div>
                </Link>
              </div>
          ))}
          </div>
        </div>

        <div>
          <div className="text-center mt-10">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary-400 hover:text-primary-300 transition-colors group"
            >
              View All Artists
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
