'use client';

import { useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { motion } from 'framer-motion';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

const TESTIMONIALS = [
  {
    quote: 'ArtistBook made our wedding entertainment planning completely stress-free. We found the perfect Bollywood singer within hours!',
    name: 'Priya & Rahul',
    event: 'Wedding Reception',
    rating: 5,
  },
  {
    quote: 'As an event company managing 50+ events a year, the workspace CRM has been a game-changer. Booking artists used to take days, now it takes minutes.',
    name: 'Vikram Shah',
    event: 'Corporate Events',
    rating: 5,
  },
  {
    quote: 'The escrow payment system gave us complete peace of mind. Transparent pricing, no hidden fees, and the artist was phenomenal.',
    name: 'Meera Krishnan',
    event: 'Birthday Party',
    rating: 5,
  },
  {
    quote: 'I joined as an artist last year and have received 40+ bookings. The platform handles everything — payments, contracts, scheduling.',
    name: 'DJ Arjun',
    event: 'Artist Partner',
    rating: 5,
  },
  {
    quote: 'Finding quality comedians for our corporate retreat was impossible before ArtistBook. Verified profiles and honest reviews made the choice easy.',
    name: 'Sneha Gupta',
    event: 'Corporate Retreat',
    rating: 4,
  },
];

export function Testimonials() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'center', skipSnaps: false },
    [Autoplay({ delay: 5000, stopOnInteraction: true })]
  );

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <section className="py-20 px-6 relative overflow-hidden">
      <div className="max-w-section mx-auto">
        <AnimatedSection>
          <h2 className="text-h2 font-heading font-bold text-text-primary text-center mb-3">
            Loved by <span className="text-gradient">Event Planners</span>
          </h2>
          <p className="text-text-muted text-center mb-12">
            Thousands of happy clients and growing
          </p>
        </AnimatedSection>

        <div className="relative">
          {/* Carousel */}
          <div ref={emblaRef} className="overflow-hidden">
            <div className="flex gap-6">
              {TESTIMONIALS.map((t, i) => (
                <div
                  key={i}
                  className="flex-[0_0_90%] sm:flex-[0_0_45%] lg:flex-[0_0_33.333%] min-w-0"
                >
                  <motion.div
                    className="glass-card p-6 h-full flex flex-col"
                    whileHover={{ y: -2 }}
                  >
                    {/* Quote icon */}
                    <Quote size={28} className="text-primary-500/30 mb-3 flex-shrink-0" />

                    {/* Quote text */}
                    <p className="text-sm text-text-secondary leading-relaxed flex-1 mb-4">
                      &ldquo;{t.quote}&rdquo;
                    </p>

                    {/* Rating */}
                    <div className="flex gap-0.5 mb-3">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star
                          key={j}
                          size={14}
                          className={j < t.rating ? 'text-amber-400 fill-amber-400' : 'text-surface-elevated'}
                        />
                      ))}
                    </div>

                    {/* Author */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-accent flex items-center justify-center text-white text-sm font-bold">
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{t.name}</p>
                        <p className="text-xs text-text-muted">{t.event}</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>

          {/* Nav buttons */}
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={scrollPrev}
              className="w-10 h-10 rounded-full bg-glass-light border border-glass-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-primary-500/30 transition-all"
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={scrollNext}
              className="w-10 h-10 rounded-full bg-glass-light border border-glass-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-primary-500/30 transition-all"
              aria-label="Next testimonial"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
