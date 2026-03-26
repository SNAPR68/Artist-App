'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

const ARTISTS = [
  {
    name: 'DJ RANA',
    genre: 'Bollywood + EDM',
    badge: 'Verified',
    badgeColor: 'bg-[#c39bff]/80 text-[#3f0e7a]',
    stat: '4.9 ★ • 120+ events • Mumbai',
    statIcon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffbf00"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
    ),
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'THE KONIAC NET',
    genre: 'Live Band • Fusion',
    badge: 'Top Rated',
    badgeColor: 'bg-[#a1faff]/80 text-[#006165]',
    stat: '4.8 ★ • 85 events • Delhi NCR',
    statIcon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffbf00"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
    ),
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'AANYA SHARMA',
    genre: 'Bollywood Vocalist',
    badge: 'Rising Star',
    badgeColor: 'bg-[#ffbf00]/80 text-[#563e00]',
    stat: '5.0 ★ • 60 events • Bangalore',
    statIcon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffbf00"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
    ),
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80',
  },
];

export function FeaturedArtists() {
  return (
    <section className="py-24 bg-[#131314]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
          <div className="max-w-xl">
            <span className="text-[#ffbf00] tracking-widest uppercase text-xs mb-4 block font-bold">
              Featured Artists
            </span>
            <h2 className="text-4xl md:text-5xl font-display font-extrabold tracking-tighter text-white">
              Booked and loved
            </h2>
          </div>
          <Link
            href="/search"
            className="text-[#c39bff] font-bold hover:text-[#b68cf6] transition-colors flex items-center gap-2 group"
          >
            Explore Full Roster
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="group-hover:translate-x-1 transition-transform"><path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4z"/></svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {ARTISTS.map((artist, i) => (
            <motion.div
              key={artist.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group cursor-pointer"
            >
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#262627] mb-6">
                <Image
                  src={artist.image}
                  alt={artist.name}
                  fill
                  className="object-cover grayscale transition-all duration-500 group-hover:grayscale-0 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                <div className="absolute bottom-6 left-6 flex flex-wrap gap-2">
                  <span className="bg-black/60 backdrop-blur-md text-[10px] px-2 py-1 rounded text-white font-bold tracking-widest uppercase border border-white/10">
                    {artist.genre}
                  </span>
                  <span className={`backdrop-blur-md text-[10px] px-2 py-1 rounded font-bold tracking-widest uppercase ${artist.badgeColor}`}>
                    {artist.badge}
                  </span>
                </div>
              </div>
              <h4 className="text-xl font-display font-bold text-white">{artist.name}</h4>
              <div className="flex items-center gap-2 mt-2">
                {artist.statIcon}
                <span className="text-sm text-white/50">{artist.stat}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
