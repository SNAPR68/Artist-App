'use client';

import { Search, MessageSquare, PartyPopper, ArrowRight } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/motion';

const steps = [
  {
    step: '1',
    title: 'Search',
    desc: 'Browse thousands of artists by genre, location, budget, and availability',
    icon: Search,
  },
  {
    step: '2',
    title: 'Book',
    desc: 'Get instant quotes from verified artists and confirm your booking',
    icon: MessageSquare,
  },
  {
    step: '3',
    title: 'Enjoy',
    desc: 'Relax knowing your payment is protected in escrow until performance',
    icon: PartyPopper,
  },
];

export function HowItWorks() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });

  return (
    <section className="bg-neutral-50 py-24 px-6">
      <div className="max-w-section mx-auto">
        {/* Header */}
        <div className="mb-16 text-center">
          {/* Badge */}
          <FadeIn direction="down" delay={0.1} once={true}>
            <div className="inline-block mb-4">
              <motion.span
                className="bg-violet-50 text-violet-700 rounded-full px-4 py-2 text-xs font-semibold inline-block"
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              >
                How it Works
              </motion.span>
            </div>
          </FadeIn>

          <FadeIn direction="up" delay={0.2} duration={0.7} once={true}>
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
              Three Simple Steps
            </h2>
          </FadeIn>

          <FadeIn direction="up" delay={0.3} duration={0.7} once={true}>
            <p className="text-neutral-500 max-w-md mx-auto text-base">
              Connect with the perfect artist for your event in just three steps
            </p>
          </FadeIn>
        </div>

        {/* Steps Container */}
        <div className="relative" ref={containerRef}>
          {/* Animated Connecting Line (desktop only) */}
          <svg
            className="hidden md:block absolute top-14 left-[16.67%] right-[16.67%] w-2/3 h-px z-0"
            preserveAspectRatio="none"
            viewBox="0 0 100 2"
          >
            <motion.path
              d="M 0 1 L 100 1"
              stroke="rgb(168, 85, 247)"
              strokeWidth="2"
              strokeDasharray="8,4"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
              transition={{ duration: 2.5, ease: 'easeInOut', delay: 0.3 }}
            />
          </svg>

          <StaggerContainer stagger={0.15} delay={0.2}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 relative z-10">
              {steps.map((s) => (
                <StaggerItem key={s.step}>
                  <div className="flex flex-col items-center text-center">
                    {/* Step Header with Number Circle */}
                    <div className="flex flex-col items-center gap-4 mb-6">
                      {/* Numbered Circle */}
                      <motion.div
                        className="w-14 h-14 rounded-2xl bg-violet-600 text-white font-bold flex items-center justify-center text-xl shadow-lg"
                        whileHover={{ scale: 1.1, rotate: 5, boxShadow: '0 20px 40px rgba(168, 85, 247, 0.3)' }}
                        transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                      >
                        {s.step}
                      </motion.div>

                      {/* Icon Circle */}
                      <motion.div
                        className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center"
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                      >
                        <s.icon size={32} className="text-violet-600" />
                      </motion.div>
                    </div>

                    {/* Connector arrow (mobile) */}
                    {steps.length > steps.indexOf(s) + 1 && (
                      <motion.div
                        className="md:hidden mb-6 text-violet-200"
                        animate={{ y: [0, 6, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <ArrowRight size={18} className="rotate-90" />
                      </motion.div>
                    )}

                    {/* Text Content */}
                    <motion.div
                      className="bg-white rounded-2xl p-8 border border-neutral-100 shadow-sm w-full"
                      whileHover={{
                        y: -8,
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
                      }}
                      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    >
                      <h3 className="text-xl font-semibold text-neutral-900 mb-3">
                        {s.title}
                      </h3>
                      <p className="text-sm text-neutral-500 leading-relaxed">
                        {s.desc}
                      </p>
                    </motion.div>
                  </div>
                </StaggerItem>
              ))}
            </div>
          </StaggerContainer>
        </div>
      </div>
    </section>
  );
}
