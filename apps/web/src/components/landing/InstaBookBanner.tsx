'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const FEATURES = [
  { icon: '💰', text: 'See the price upfront — no negotiation, no surprises' },
  { icon: '⚡', text: 'Book in 60 seconds — select, pay, confirmed' },
  { icon: '🔒', text: 'Escrow-protected payments — money safe until event is done' },
  { icon: '🔄', text: 'Emergency substitution — backup artist if anything goes wrong' },
];

export function InstaBookBanner() {
  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#c39bff]/8 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#a1faff]/6 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass-card rounded-2xl p-8 md:p-12 border border-white/5 relative overflow-hidden"
        >
          {/* Corner glow */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#c39bff]/15 blur-[80px] rounded-full pointer-events-none" />

          <div className="relative z-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#a1faff]/10 border border-[#a1faff]/20 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-[#a1faff] animate-pulse" />
              <span className="text-[#a1faff] text-xs font-bold uppercase tracking-widest">Coming Soon</span>
            </div>

            {/* Headline */}
            <h2 className="text-3xl md:text-4xl font-display font-extrabold tracking-tighter text-white mb-3">
              Insta<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c39bff] to-[#a1faff]">Book</span>
            </h2>
            <p className="text-white/50 text-lg mb-8 max-w-xl">
              Book an artist in 60 seconds. Transparent pricing. Escrow-protected payments. No middlemen.
            </p>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 + 0.3, duration: 0.4 }}
                  className="flex items-start gap-3"
                >
                  <span className="text-xl flex-shrink-0">{f.icon}</span>
                  <span className="text-white/60 text-sm">{f.text}</span>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/instabook"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#c39bff] to-[#b68cf6] text-[#0e0e0f] hover:shadow-[0_0_30px_rgba(195,155,255,0.3)] transition-all"
              >
                Join the Waitlist
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <span className="text-white/30 text-xs self-center">
                Be the first to know. Priority access for early supporters.
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
