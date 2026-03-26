'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform } from 'framer-motion';


const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 100 },
  },
};

export function Hero() {
  const router = useRouter();
  const containerRef = useRef(null);
  const { scrollY } = useScroll();

  const violetOrbY = useTransform(scrollY, [0, 500], [0, 150]);
  const cyanOrbY = useTransform(scrollY, [0, 500], [0, -100]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#0e0e0f] px-6"
    >
      {/* ─── Stage Lighting Background ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          style={{ y: violetOrbY }}
          className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
        >
          <div className="w-full h-full bg-[#c39bff]/10 blur-[120px] rounded-full" />
        </motion.div>

        <motion.div
          style={{ y: cyanOrbY }}
          className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.2 }}
        >
          <div className="w-full h-full bg-[#ffbf00]/5 blur-[100px] rounded-full" />
        </motion.div>

        {/* Carbon fibre texture overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "url('https://www.transparenttextures.com/patterns/carbon-fibre.png')",
          }}
        />
      </div>

      {/* ─── Main Content ─── */}
      <div className="relative z-10 max-w-6xl w-full text-center">
        <motion.div
          className="space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* ─── Badge ─── */}
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 text-[#a1faff]"
            style={{
              background: 'rgba(38, 38, 39, 0.6)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
            <span className="text-[0.6875rem] font-bold tracking-widest uppercase">Verified Artists · Secure Payments</span>
          </motion.div>

          {/* ─── Headline ─── */}
          <motion.h1
            variants={itemVariants}
            className="font-display text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter leading-[0.9] max-w-4xl mx-auto text-white"
          >
            Book the{' '}
            <span className="bg-gradient-to-r from-[#c39bff] via-[#b68cf6] to-[#a1faff] bg-clip-text text-transparent italic">
              perfect artist
            </span>{' '}
            for your event
          </motion.h1>

          {/* ─── Subtitle ─── */}
          <motion.p
            variants={itemVariants}
            className="text-white/50 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
          >
            DJs, singers, bands, comedians — 5,000+ verified artists across India.
            Browse, compare, book, and pay. All in one place.
          </motion.p>

          {/* ─── CTA Buttons ─── */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <motion.button
              onClick={() => router.push('/search')}
              whileHover={{ scale: 1.05, boxShadow: '0px 24px 48px rgba(195,155,255,0.4)' }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-gradient-to-br from-[#c39bff] to-[#b68cf6] text-[#3f0e7a] font-bold rounded-full transition-all duration-300"
            >
              Find Artists
            </motion.button>

            <motion.button
              onClick={() => router.push('/login')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-4 bg-transparent border border-white/20 text-white font-bold rounded-full transition-all duration-300 hover:bg-white/5 hover:border-white/40"
            >
              I&apos;m an Event Company
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Voice assistant is the floating Backstage AI widget — no placeholder needed here */}
      </div>
    </section>
  );
}
