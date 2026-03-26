'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export function Categories() {
  return (
    <section className="py-32 px-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Large Card: AI Discovery */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="md:col-span-8 group relative overflow-hidden rounded-xl bg-[#1a191b] h-[500px]"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
          <Image
            src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80"
            alt="AI Artist Discovery"
            fill
            className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
          />
          <div className="absolute bottom-0 left-0 p-10 z-20 space-y-4 max-w-xl">
            <span className="px-3 py-1 bg-[#a1faff]/10 text-[#a1faff] text-[10px] font-bold tracking-widest uppercase rounded-full border border-[#a1faff]/20">
              Smart Search
            </span>
            <h3 className="text-4xl font-display font-extrabold tracking-tight text-white">
              Find the right artist in minutes
            </h3>
            <p className="text-white/50 text-lg">
              Search by city, genre, budget, and availability. Compare ratings, watch showreels, and check real reviews — all before you book.
            </p>
          </div>
        </motion.div>

        {/* Tall Card: Branded PDFs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="md:col-span-4 rounded-xl bg-[#2c2c2d] p-10 flex flex-col justify-between border border-white/5"
        >
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-[#c39bff]/10 flex items-center justify-center text-[#c39bff]">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>
            </div>
            <h3 className="text-2xl font-display font-bold text-white">Proposals in seconds</h3>
            <p className="text-white/50 leading-relaxed">
              Create branded PDF proposals with artist profiles, pricing, and rider details. Share with clients instantly via WhatsApp or email.
            </p>
          </div>
          <div className="mt-8 pt-8 border-t border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-16 bg-[#1a191b] rounded border border-white/10 flex flex-col items-center justify-center gap-1 opacity-50">
                <div className="w-8 h-1 bg-white/20 rounded-full" />
                <div className="w-6 h-1 bg-white/20 rounded-full" />
                <div className="w-4 h-1 bg-white/20 rounded-full" />
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffbf00" strokeWidth="2" className="animate-bounce"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
              <div className="w-12 h-16 bg-[#b68cf6] rounded flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#320067"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5z"/></svg>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Secure Payments */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="md:col-span-4 rounded-xl bg-[#201f21] p-10 border border-white/5 hover:bg-[#2c2c2d] transition-colors"
        >
          <div className="space-y-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#ffbf00"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
            <h3 className="text-xl font-display font-bold text-white">Money stays safe</h3>
            <p className="text-white/50 text-sm leading-relaxed">
              Payments are held in escrow until the event is done. Artists get paid on time. Clients get protection. No middleman drama.
            </p>
          </div>
        </motion.div>

        {/* Global Network */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="md:col-span-8 rounded-xl bg-[#262627] overflow-hidden border border-white/5"
        >
          <div className="flex flex-col md:flex-row h-full">
            <div className="p-10 flex-1 flex flex-col justify-center">
              <h3 className="text-xl font-display font-bold mb-4 text-white">5,000+ verified artists</h3>
              <p className="text-white/50 text-sm mb-6">
                DJs, singers, bands, comedians, dancers — across Mumbai, Delhi, Bangalore, and 7 more cities. Every artist is ID-verified and reviewed.
              </p>
              <div className="flex -space-x-3">
                {[
                  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=80&q=80',
                  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=80&q=80',
                  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=80&q=80',
                ].map((src, i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-[#262627] overflow-hidden relative">
                    <Image src={src} alt="" fill sizes="40px" className="object-cover" />
                  </div>
                ))}
                <div className="w-10 h-10 rounded-full border-2 border-[#262627] bg-[#c39bff] text-[10px] font-bold flex items-center justify-center text-[#320067]">
                  +450
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-[200px] relative">
              <Image
                src="https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80"
                alt="Global Reach"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
