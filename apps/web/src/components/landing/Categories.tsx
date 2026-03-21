'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useDragScroll } from '@/hooks/useDragScroll';

const GENRES = [
  { name: 'All', genre: '', emoji: '🎵', active: true },
  { name: 'Bollywood', genre: 'Bollywood', emoji: '🎤' },
  { name: 'EDM', genre: 'EDM', emoji: '🎧' },
  { name: 'Live Band', genre: 'Live Band', emoji: '🎸' },
  { name: 'Classical', genre: 'Classical', emoji: '🎻' },
  { name: 'Hip-Hop', genre: 'Hip-Hop', emoji: '🎤' },
  { name: 'Rock', genre: 'Rock', emoji: '🤘' },
  { name: 'Sufi', genre: 'Sufi', emoji: '💫' },
  { name: 'Jazz', genre: 'Jazz', emoji: '🎷' },
  { name: 'Comedy', genre: 'Comedy', emoji: '😂' },
  { name: 'Folk', genre: 'Folk', emoji: '💃' },
  { name: 'Wedding', genre: 'Wedding', emoji: '💍' },
  { name: 'Acoustic', genre: 'Acoustic', emoji: '🎵' },
  { name: 'Fusion', genre: 'Fusion', emoji: '🔥' },
];

const EVENT_TYPES = [
  {
    name: 'Weddings',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&q=80',
    count: '2,500+',
    href: '/search?event_type=wedding',
  },
  {
    name: 'Corporate',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80',
    count: '1,800+',
    href: '/search?event_type=corporate',
  },
  {
    name: 'House Parties',
    image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&q=80',
    count: '3,200+',
    href: '/search?event_type=house_party',
  },
  {
    name: 'Concerts',
    image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&q=80',
    count: '900+',
    href: '/search?event_type=concert',
  },
  {
    name: 'College Fests',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&q=80',
    count: '1,100+',
    href: '/search?event_type=college',
  },
];

export function Categories() {
  const genreScrollRef = useDragScroll<HTMLDivElement>();
  const eventScrollRef = useDragScroll<HTMLDivElement>();

  return (
    <section className="py-12 md:py-16">
      {/* ─── Genre Chips ─── */}
      <div className="max-w-section mx-auto px-6 mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-heading font-bold text-text-primary">
            Genres
          </h2>
          <Link href="/search" className="text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors">
            See All
          </Link>
        </div>

        <div
          ref={genreScrollRef}
          className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide drag-scroll"
        >
          {GENRES.map((g) => (
            <Link
              key={g.name}
              href={g.genre ? `/search?genre=${encodeURIComponent(g.genre)}` : '/search'}
              className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-pill text-sm font-medium transition-all shrink-0 ${
                g.active
                  ? 'bg-gradient-accent text-white shadow-glow-sm'
                  : 'bg-glass-medium border border-glass-border text-text-secondary hover:bg-glass-heavy hover:text-text-primary hover:border-primary-500/30'
              }`}
            >
              <span className="text-base">{g.emoji}</span>
              {g.name}
            </Link>
          ))}
        </div>
      </div>

      {/* ─── Event Type Cards ─── */}
      <div className="max-w-section mx-auto px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-heading font-bold text-text-primary">
            Browse by Event
          </h2>
          <Link href="/search" className="text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors">
            See All
          </Link>
        </div>

        <div
          ref={eventScrollRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide drag-scroll"
        >
          {EVENT_TYPES.map((event) => (
            <Link
              key={event.name}
              href={event.href}
              className="group relative w-[160px] md:w-[200px] aspect-[3/4] rounded-2xl overflow-hidden shrink-0"
            >
              <Image
                src={event.image}
                alt={event.name}
                fill
                sizes="(max-width: 768px) 160px, 200px"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              {/* Content */}
              <div className="absolute inset-x-0 bottom-0 p-4">
                <h3 className="text-white font-semibold text-sm">{event.name}</h3>
                <p className="text-white/60 text-xs mt-0.5">{event.count} bookings</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
