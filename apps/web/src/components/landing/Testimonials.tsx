'use client';

import { useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

const TESTIMONIALS = [
  {
    quote: 'Found the perfect Bollywood singer for our wedding within hours. Completely stress-free!',
    name: 'Priya & Rahul',
    event: 'Wedding',
    rating: 5,
  },
  {
    quote: 'As an event company managing 50+ events a year, the workspace CRM has been a game-changer.',
    name: 'Vikram Shah',
    event: 'Corporate',
    rating: 5,
  },
  {
    quote: 'Escrow payments gave us complete peace of mind. Transparent pricing, no hidden fees.',
    name: 'Meera Krishnan',
    event: 'Birthday',
    rating: 5,
  },
  {
    quote: 'Joined as an artist last year — 40+ bookings! The platform handles everything.',
    name: 'DJ Arjun',
    event: 'Artist',
    rating: 5,
  },
  {
    quote: 'Verified profiles and honest reviews made choosing a comedian for our retreat easy.',
    name: 'Sneha Gupta',
    event: 'Corporate',
    rating: 4,
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
    <section className="py-12 md:py-16 px-6">
      <div className="max-w-section mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg md:text-xl font-heading font-bold text-text-primary">
            What People Say
          </h2>
          <div className="flex gap-2">
            <button
              onClick={scrollPrev}
              className="w-8 h-8 rounded-full bg-glass-medium border border-glass-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-primary-500/30 transition-all"
              aria-label="Previous"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={scrollNext}
              className="w-8 h-8 rounded-full bg-glass-medium border border-glass-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-primary-500/30 transition-all"
              aria-label="Next"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex gap-4">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="flex-[0_0_85%] sm:flex-[0_0_45%] lg:flex-[0_0_32%] min-w-0"
              >
                <div className="glass-card p-5 h-full flex flex-col">
                  {/* Rating */}
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star
                        key={j}
                        size={12}
                        className={j < t.rating ? 'text-amber-400 fill-amber-400' : 'text-surface-elevated'}
                      />
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="text-sm text-text-secondary leading-relaxed flex-1 mb-4">
                    &ldquo;{t.quote}&rdquo;
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-accent flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{t.name}</p>
                      <p className="text-[10px] text-text-muted">{t.event}</p>
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
