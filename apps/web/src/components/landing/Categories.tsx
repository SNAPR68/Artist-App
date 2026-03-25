'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useDragScroll } from '@/hooks/useDragScroll';
import { FadeIn } from '@/components/motion';

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

const eventCardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      type: 'spring',
      damping: 20,
      stiffness: 100,
    },
  }),
};

export function Categories() {
  const genreScrollRef = useDragScroll<HTMLDivElement>();
  const eventScrollRef = useDragScroll<HTMLDivElement>();
  const [activeGenre, setActiveGenre] = useState('All');

  return (
    <section className="bg-white py-20 px-6">
      <div className="max-w-section mx-auto">
        {/* Header */}
        <FadeIn>
          <div className="flex items-center justify-center mb-12">
            <div className="text-center">
              <motion.span
                className="inline-block mb-4 px-3 py-1 rounded-full bg-violet-50 text-violet-600 text-xs font-semibold uppercase tracking-wider"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
              >
                Categories
              </motion.span>
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3">
                Browse by Category
              </h2>
              <p className="text-neutral-500 text-base">
                Explore a wide range of artists and entertainers
              </p>
            </div>
          </div>
        </FadeIn>

        {/* Genre Chips */}
        <div className="mb-16">
          <div
            ref={genreScrollRef}
            className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide drag-scroll justify-center md:justify-start"
          >
            <AnimatePresence mode="wait">
              {GENRES.map((g) => (
                <motion.div
                  key={g.name}
                  initial={{ opacity: 0, y: -10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                >
                  <Link
                    href={g.genre ? `/search?genre=${encodeURIComponent(g.genre)}` : '/search'}
                    onClick={() => setActiveGenre(g.name)}
                  >
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`flex items-center gap-2 whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 shrink-0 relative ${
                        g.active || activeGenre === g.name
                          ? 'text-white'
                          : 'border border-neutral-200 text-neutral-600 hover:border-violet-300 hover:text-violet-600'
                      }`}
                    >
                      {(g.active || activeGenre === g.name) && (
                        <motion.div
                          layoutId="activeGenre"
                          className="absolute inset-0 bg-violet-600 rounded-full -z-10"
                          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                        />
                      )}
                      <span className="text-base">{g.emoji}</span>
                      {g.name}
                    </motion.button>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Event Type Cards */}
        <div>
          <div
            ref={eventScrollRef}
            className="grid grid-cols-2 md:grid-cols-5 gap-4"
          >
            {EVENT_TYPES.map((event, index) => (
              <motion.div
                key={event.name}
                custom={index}
                variants={eventCardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                whileHover={{ y: -6 }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
              >
                <Link href={event.href}>
                  <div className="group relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 cursor-pointer">
                    <Image
                      src={event.image}
                      alt={event.name}
                      fill
                      sizes="(max-width: 768px) 160px, 220px"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                    />
                    {/* Overlay gradient */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent"
                      initial={{ opacity: 0.6 }}
                      whileHover={{ opacity: 0.8 }}
                      transition={{ duration: 0.3 }}
                    />
                    {/* Content */}
                    <motion.div
                      className="absolute inset-x-0 bottom-0 p-4"
                      initial={{ y: 8, opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 + index * 0.08, duration: 0.4 }}
                    >
                      <h3 className="text-white text-sm font-semibold">{event.name}</h3>
                      <motion.p
                        className="text-white/70 text-xs mt-1"
                        whileHover={{ color: 'rgba(255, 255, 255, 1)' }}
                      >
                        {event.count} bookings
                      </motion.p>
                    </motion.div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
