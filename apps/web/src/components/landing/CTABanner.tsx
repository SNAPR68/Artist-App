'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export function CTABanner({ variant }: { variant?: 'artist' | 'company' }) {
  const router = useRouter();

  return (
    <section className="py-32 px-6">
      <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-br from-[#201f21] to-black p-12 md:p-24 text-center relative overflow-hidden border border-white/5">
        {/* Ambient glows */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#c39bff]/5 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#a1faff]/5 blur-[60px] rounded-full pointer-events-none" />

        <div className="relative z-10 space-y-8">
          <h2 className="text-4xl md:text-6xl font-display font-extrabold tracking-tight text-white">
            Your next event deserves the{' '}
            <span className="text-[#c39bff] italic">perfect</span> artist
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Whether it&apos;s a wedding sangeet, corporate gala, or college fest — find, book, and pay artists without the back-and-forth.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.button
              onClick={() => router.push('/search')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              className="px-10 py-5 bg-white text-black font-black rounded-full transition-transform hover:shadow-xl"
            >
              Browse Artists
            </motion.button>
            <motion.button
              onClick={() => router.push('/login')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              className="px-10 py-5 border border-white/20 text-white font-bold rounded-full transition-all hover:bg-white/5"
              style={{
                background: 'rgba(38, 38, 39, 0.6)',
                backdropFilter: 'blur(20px)',
              }}
            >
              List as Artist
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
}
