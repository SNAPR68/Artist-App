'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, ArrowRight, Mic } from 'lucide-react';
import { GradientMeshBg } from '@/components/shared/GradientMeshBg';
import { FloatingBlob } from '@/components/shared/FloatingBlob';

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.3 },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.4, 0.25, 1] } },
};

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      <GradientMeshBg />

      {/* Floating blobs */}
      <FloatingBlob color="rgba(59,130,246,0.12)" size={400} top="-5%" left="5%" delay={0} />
      <FloatingBlob color="rgba(139,92,246,0.1)" size={350} top="30%" right="-5%" delay={2} />
      <FloatingBlob color="rgba(236,72,153,0.08)" size={300} bottom="5%" left="25%" delay={4} />

      <motion.div
        className="relative z-10 max-w-4xl mx-auto px-6 text-center"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Badge */}
        <motion.div variants={item}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-pill bg-glass-medium border border-glass-border text-xs font-semibold text-text-secondary shimmer-overlay">
            India&apos;s #1 Artist Booking Platform
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          className="mt-8 text-4xl sm:text-5xl md:text-hero font-heading font-extrabold text-text-primary leading-[1.05] tracking-tighter"
          variants={item}
        >
          Book the perfect artist
          <br />
          <span className="text-gradient">for your event</span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          className="mt-6 text-base sm:text-lg text-text-muted max-w-2xl mx-auto leading-relaxed"
          variants={item}
        >
          Weddings, corporate events, house parties, concerts — find and book verified artists
          in under 24 hours. Secure payments, transparent pricing, zero hassle.
        </motion.p>

        {/* Voice indicator */}
        <motion.div className="flex items-center justify-center gap-2 mt-6" variants={item}>
          <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center">
            <Mic size={14} className="text-primary-400" />
          </div>
          <span className="text-sm text-text-muted">Voice-enabled — just say what you need</span>
        </motion.div>

        {/* CTAs */}
        <motion.div className="flex flex-col sm:flex-row gap-4 justify-center mt-10" variants={item}>
          <Link
            href="/search"
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-accent hover:bg-gradient-accent-hover text-white font-semibold rounded-xl transition-all hover-glow hover:scale-[1.02] active:scale-[0.98]"
          >
            <Search size={18} />
            Find Artists
          </Link>
          <Link
            href="/artist/onboarding"
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-transparent border border-glass-border hover:border-primary-500/40 text-text-primary font-semibold rounded-xl transition-all hover:bg-glass-light"
          >
            Join as Artist
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        {/* Avatar Stack */}
        <motion.div className="flex items-center justify-center gap-3 mt-10" variants={item}>
          <div className="flex -space-x-2">
            {[
              'bg-primary-500', 'bg-secondary-500', 'bg-accent-magenta',
              'bg-accent-indigo', 'bg-primary-600',
            ].map((bg, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full ${bg} border-2 border-surface-bg flex items-center justify-center text-[10px] text-white font-bold`}
              >
                {String.fromCharCode(65 + i)}
              </div>
            ))}
          </div>
          <span className="text-sm text-text-muted">
            <span className="text-text-secondary font-semibold">5,000+</span> verified artists
          </span>
        </motion.div>
      </motion.div>
    </section>
  );
}
