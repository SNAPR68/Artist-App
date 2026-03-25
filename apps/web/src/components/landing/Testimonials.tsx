'use client';

import { useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { FadeIn } from '@/components/motion/FadeIn';

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

const TestimonialCard = ({ testimonial, index }: { testimonial: typeof TESTIMONIALS[0]; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    viewport={{ once: true, amount: 0.3 }}
    className="flex-[0_0_85%] sm:flex-[0_0_45%] lg:flex-[0_0_32%] min-w-0"
  >
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="h-full rounded-2xl bg-neutral-50 border border-neutral-100 p-8 flex flex-col shadow-sm hover:shadow-md transition-all duration-300 relative"
    >
      {/* Quote Mark Decoration */}
      <motion.div
        className="absolute top-4 left-6 text-violet-100 text-6xl font-serif leading-none pointer-events-none"
        animate={{ opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        "
      </motion.div>

      {/* Rating */}
      <div className="flex gap-1 mb-6 relative z-10">
        {Array.from({ length: 5 }).map((_, j) => (
          <motion.div
            key={j}
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 + j * 0.05 }}
            viewport={{ once: true }}
          >
            <Star
              size={16}
              className={j < testimonial.rating ? 'text-amber-400 fill-amber-400' : 'text-neutral-200'}
            />
          </motion.div>
        ))}
      </div>

      {/* Quote text */}
      <p className="text-base text-neutral-700 leading-relaxed flex-1 mb-6 italic">
        &ldquo;{testimonial.quote}&rdquo;
      </p>

      {/* Divider */}
      <motion.div className="w-full h-px bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 mb-5" />

      {/* Author */}
      <div className="flex items-center gap-3">
        <motion.div
          whileHover={{ scale: 1.1 }}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-violet-700 flex items-center justify-center text-white text-xs font-bold shrink-0"
        >
          {testimonial.initials}
        </motion.div>
        <div>
          <p className="text-sm font-medium text-neutral-900">{testimonial.name}</p>
          <p className="text-xs text-neutral-500">{testimonial.event}</p>
        </div>
      </div>
    </motion.div>
  </motion.div>
);

export function Testimonials() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'start', skipSnaps: false },
    [Autoplay({ delay: 4000, stopOnInteraction: true })]
  );

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-section mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-14">
          <div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200 mb-4"
            >
              <span className="text-xs font-semibold text-violet-700 uppercase tracking-widest">
                Testimonials
              </span>
            </motion.div>
            <FadeIn direction="up" delay={0.1} duration={0.7}>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-neutral-900">
                What People Say
              </h2>
            </FadeIn>
            <FadeIn direction="up" delay={0.2} duration={0.7}>
              <p className="text-sm text-neutral-500 mt-2">
                Join thousands of happy customers and artists
              </p>
            </FadeIn>
          </div>

          {/* Nav Buttons */}
          <div className="flex gap-2 shrink-0">
            <motion.button
              onClick={scrollPrev}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-500 hover:text-violet-600 hover:border-violet-300 transition-colors"
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={18} />
            </motion.button>
            <motion.button
              onClick={scrollNext}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-500 hover:text-violet-600 hover:border-violet-300 transition-colors"
              aria-label="Next testimonial"
            >
              <ChevronRight size={18} />
            </motion.button>
          </div>
        </div>

        {/* Carousel */}
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex gap-5">
            {TESTIMONIALS.map((t, i) => (
              <TestimonialCard key={i} testimonial={t} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
