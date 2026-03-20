'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Mic2, Disc3, Guitar, Laugh, Footprints, Camera,
  Palette, Megaphone, Sparkles, Piano,
} from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';
import { useDragScroll } from '@/hooks/useDragScroll';

const CATEGORIES = [
  { name: 'Singers & Vocalists', icon: Mic2, count: '500+', gradient: 'from-primary-500/20 to-primary-600/5' },
  { name: 'DJs & Electronic', icon: Disc3, count: '400+', gradient: 'from-secondary-500/20 to-secondary-600/5' },
  { name: 'Live Bands', icon: Guitar, count: '350+', gradient: 'from-accent-magenta/20 to-accent-pink/5' },
  { name: 'Comedians', icon: Laugh, count: '300+', gradient: 'from-amber-500/20 to-orange-600/5' },
  { name: 'Dancers', icon: Footprints, count: '250+', gradient: 'from-green-500/20 to-emerald-600/5' },
  { name: 'Photographers', icon: Camera, count: '250+', gradient: 'from-cyan-500/20 to-sky-600/5' },
  { name: 'Mehendi Artists', icon: Palette, count: '200+', gradient: 'from-rose-500/20 to-pink-600/5' },
  { name: 'Anchors/Emcees', icon: Megaphone, count: '200+', gradient: 'from-violet-500/20 to-purple-600/5' },
  { name: 'Magicians', icon: Sparkles, count: '150+', gradient: 'from-indigo-500/20 to-blue-600/5' },
  { name: 'Instrumentalists', icon: Piano, count: '150+', gradient: 'from-teal-500/20 to-cyan-600/5' },
];

export function Categories() {
  const scrollRef = useDragScroll<HTMLDivElement>();

  return (
    <section className="py-20 px-6">
      <div className="max-w-section mx-auto">
        <AnimatedSection>
          <h2 className="text-h2 font-heading font-bold text-text-primary text-center mb-3">
            Browse by <span className="text-gradient">Category</span>
          </h2>
          <p className="text-text-muted text-center mb-12">
            Find the right entertainment for any occasion
          </p>
        </AnimatedSection>

        {/* Mobile: horizontal scroll, Desktop: grid */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-3 lg:grid-cols-5 md:overflow-x-visible drag-scroll md:cursor-default"
        >
          {CATEGORIES.map((cat, i) => (
            <AnimatedSection key={cat.name} delay={i * 0.05}>
              <Link
                href={`/search?genre=${encodeURIComponent(cat.name)}`}
                className="group flex-shrink-0 w-[160px] md:w-auto"
              >
                <motion.div
                  className={`flex flex-col items-center p-6 rounded-xl bg-gradient-to-br ${cat.gradient} border border-glass-border hover:border-primary-500/30 transition-all`}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-12 h-12 rounded-xl bg-glass-medium flex items-center justify-center mb-3 group-hover:shadow-glow-sm transition-shadow">
                    <cat.icon size={24} className="text-text-secondary group-hover:text-text-primary transition-colors" />
                  </div>
                  <span className="font-semibold text-text-primary text-sm text-center">
                    {cat.name}
                  </span>
                  <span className="text-xs text-text-muted mt-1">{cat.count}</span>
                </motion.div>
              </Link>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
