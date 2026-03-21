'use client';

import { useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';

const TESTIMONIALS = [
  {
    quote: 'Found the perfect Bollywood singer for our wedding within hours. Completely stress-free!',
    name: 'Priya & Rahul',
    event: 'Wedding',
    rating: 5,
    initials: 'PR',
  },
  {
    quote: 'As an event company managing 50+ events a year, the workspace CRM has been a game-changer.',
    name: 'Vikram Shah',
    event: 'Corporate',
    rating: 5,
    initials: 'VS',
  },
  {
    quote: 'Escrow payments gave us complete peace of mind. Transparent pricing, no hidden fees.',
    name: 'Meera Krishnan',
    event: 'Birthday',
    rating: 5,
    initials: 'MK',
  },
  {
    quote: 'Joined as an artist last year — 40+ bookings! The platform handles everything.',
    name: 'DJ Arjun',
    event: 'Artist',
    rating: 5,
    initials: 'DA',
  },
  {
    quote: 'Verified profiles and honest reviews made choosing a comedian for our retreat easy.',
    name: 'Sneha Gupta',
    event: 'Corporate',
    rating: 4,
    initials: 'SG',
  },
];

export function Testimonials() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'start', skipSnaps: false },
    [Autoplay({ delay: 4000, stopOnInteraction: true })]
  );

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <section className="py-16 md:py-24 px-6 relative overflow-hidden">
      <div className="max-w-section mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-gradient mb-2">
              What People Say
            </h2>
            <p className="text-text-muted text-sm md:text-base">
              Join thousands of happy customers and artists
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={scrollPrev}
              className="w-10 h-10 rounded-full bg-glass-medium border border-glass-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-primary-500/50 hover:bg-glass-light transition-all duration-300 hover:shadow-glow-sm"
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={scrollNext}
              className="w-10 h-10 rounded-full bg-glass-medium border border-glass-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-primary-500/50 hover:bg-glass-light transition-all duration-300 hover:shadow-glow-sm"
              aria-label="Next testimonial"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex gap-5 md:gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="flex-[0_0_85%] sm:flex-[0_0_45%] lg:flex-[0_0_32%] min-w-0 animate-fade-in"
              >
                <div className="group relative h-full rounded-2xl bg-glass-medium border border-glass-border hover:border-primary-500/30 transition-all duration-300 hover:shadow-glow-sm overflow-hidden p-6 flex flex-col backdrop-blur-sm hover:bg-glass-light">
                  {/* Gradient border effect on hover */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-500/0 to-accent-magenta/0 group-hover:from-primary-500/10 group-hover:to-accent-magenta/10 transition-all duration-300 pointer-events-none" />

                  <div className="relative z-10 flex flex-col h-full">
                    {/* Quote Icon */}
                    <div className="flex items-center gap-3 mb-4">
                      <Quote size={20} className="text-primary-400/60 shrink-0" />
                      <div className="w-1 h-6 bg-gradient-to-b from-primary-500 to-accent-magenta/30 rounded-full" />
                    </div>

                    {/* Rating */}
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star
                          key={j}
                          size={16}
                          className={j < t.rating ? 'text-amber-400 fill-amber-400' : 'text-surface-elevated/40'}
                        />
                      ))}
                    </div>

                    {/* Quote Text */}
                    <p className="text-sm md:text-base text-text-secondary leading-relaxed flex-1 mb-6 italic">
                      &ldquo;{t.quote}&rdquo;
                    </p>

                    {/* Divider */}
                    <div className="w-full h-px bg-gradient-to-r from-glass-border via-glass-border to-transparent mb-5" />

                    {/* Author */}
                    <div className="flex items-center gap-4">
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-magenta flex items-center justify-center text-white text-sm font-bold ring-2 ring-white/10 group-hover:ring-primary-400/30 transition-all duration-300">
                          {t.initials}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{t.name}</p>
                        <p className="text-xs text-text-muted">{t.event}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
