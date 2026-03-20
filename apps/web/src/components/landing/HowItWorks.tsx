'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Search, MessageSquare, PartyPopper } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

const steps = [
  {
    step: '01',
    title: 'Search & Discover',
    desc: 'Browse artists by genre, city, budget, and availability. Compare profiles side by side.',
    icon: Search,
    color: 'from-primary-500 to-primary-600',
  },
  {
    step: '02',
    title: 'Book Instantly',
    desc: 'Share your event details. Get a quote within hours, not days. Confirm in minutes.',
    icon: MessageSquare,
    color: 'from-secondary-500 to-secondary-600',
  },
  {
    step: '03',
    title: 'Enjoy Your Event',
    desc: 'Artist shows up, you enjoy a memorable experience. Escrow-protected payments for peace of mind.',
    icon: PartyPopper,
    color: 'from-accent-magenta to-accent-pink',
  },
];

export function HowItWorks() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section ref={sectionRef} className="py-20 px-6 relative">
      <div className="max-w-section mx-auto">
        <AnimatedSection>
          <h2 className="text-h2 font-heading font-bold text-text-primary text-center mb-3">
            How It <span className="text-gradient">Works</span>
          </h2>
          <p className="text-text-muted text-center mb-16">
            Book an artist in 3 simple steps
          </p>
        </AnimatedSection>

        <div className="relative grid md:grid-cols-3 gap-8">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-16 left-[16.67%] right-[16.67%] h-[2px]">
            <motion.div
              className="h-full bg-gradient-accent origin-left"
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : undefined}
              transition={{ duration: 1, delay: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
            />
          </div>

          {steps.map((s, i) => (
            <AnimatedSection key={s.step} delay={0.2 + i * 0.2}>
              <div className="relative text-center">
                {/* Step Circle */}
                <motion.div
                  className={`relative z-10 w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br ${s.color} flex items-center justify-center shadow-glow-md`}
                  animate={isInView ? { scale: [0.8, 1.05, 1] } : undefined}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.2 }}
                >
                  <s.icon size={24} className="text-white" />
                </motion.div>

                {/* Step Number */}
                <div className="text-6xl font-heading font-black text-glass-light/50 absolute top-0 right-4 md:right-8 select-none">
                  {s.step}
                </div>

                <h3 className="text-h4 font-heading font-bold text-text-primary mb-2">{s.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed max-w-xs mx-auto">{s.desc}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
