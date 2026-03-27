'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';

// ─── Hero Background Images ─────────────────────────────────
const HERO_SLIDES = [
  { url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920&q=90&fit=crop', label: 'Concert Night' },
  { url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1920&q=90&fit=crop', label: 'Festival Stage' },
  { url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1920&q=90&fit=crop', label: 'Music Festival' },
  { url: 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=1920&q=90&fit=crop', label: 'Wedding Sangeet' },
  { url: 'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=1920&q=90&fit=crop', label: 'DJ Performance' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 100 } },
};

// ─── 3D Mascot SVGs (larger, for hero section) ──────────────
function ZaraMascot3D({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <defs>
        <radialGradient id="zaraGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#e0c3ff" />
          <stop offset="100%" stopColor="#c39bff" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="19" fill="url(#zaraGrad)" fillOpacity="0.2" />
      <circle cx="20" cy="20" r="18" stroke="#c39bff" strokeWidth="1.5" strokeOpacity="0.6" fill="none" />
      <circle cx="20" cy="15" r="5.5" fill="#c39bff" fillOpacity="0.8" />
      <path d="M14 13c0-4 3-7 6-7s6 3 6 7c1-1 2-3 2-5 0 0 1 4-1 7-1 1.5-2.5 2-3 2h-6c-.5 0-2-.5-3-2-2-3-1-7-1-7 0 2 1 4 2 5z" fill="#c39bff" fillOpacity="0.5" />
      <path d="M12 33c0-5 3.5-8 8-8s8 3 8 8" fill="#c39bff" fillOpacity="0.4" />
      <path d="M11 15a9 9 0 0118 0" stroke="#c39bff" strokeWidth="1.5" strokeOpacity="0.7" fill="none" strokeLinecap="round" />
      <rect x="9" y="13" width="4" height="5" rx="2" fill="#c39bff" fillOpacity="0.6" />
      <rect x="27" y="13" width="4" height="5" rx="2" fill="#c39bff" fillOpacity="0.6" />
    </svg>
  );
}

function KabirMascot3D({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <defs>
        <radialGradient id="kabirGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#c8fcff" />
          <stop offset="100%" stopColor="#a1faff" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="19" fill="url(#kabirGrad)" fillOpacity="0.2" />
      <circle cx="20" cy="20" r="18" stroke="#a1faff" strokeWidth="1.5" strokeOpacity="0.6" fill="none" />
      <circle cx="20" cy="15" r="5.5" fill="#a1faff" fillOpacity="0.8" />
      <path d="M14 13c0-4 3-7 6-7s6 3 6 7c0-2-2-5-6-5s-6 3-6 5z" fill="#a1faff" fillOpacity="0.5" />
      <path d="M10 33c0-5 4-9 10-9s10 4 10 9" fill="#a1faff" fillOpacity="0.4" />
      <path d="M11 15a9 9 0 0118 0" stroke="#a1faff" strokeWidth="1.5" strokeOpacity="0.7" fill="none" strokeLinecap="round" />
      <rect x="9" y="13" width="4" height="5" rx="2" fill="#a1faff" fillOpacity="0.6" />
      <rect x="27" y="13" width="4" height="5" rx="2" fill="#a1faff" fillOpacity="0.6" />
    </svg>
  );
}

export function Hero() {
  const router = useRouter();
  const containerRef = useRef(null);
  const { scrollY } = useScroll();
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const violetOrbY = useTransform(scrollY, [0, 500], [0, 150]);
  const cyanOrbY = useTransform(scrollY, [0, 500], [0, -100]);

  // Dispatch custom event to open voice assistant with a specific language
  const openVoiceAssistant = (lang: 'en' | 'hi') => {
    window.dispatchEvent(new CustomEvent('open-voice-assistant', { detail: { lang } }));
  };

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#0e0e0f] px-6"
    >
      {/* ─── Rotating Background Images ─── */}
      <div className="absolute inset-0">
        {HERO_SLIDES.map((slide, i) => (
          <div
            key={slide.url}
            className={`absolute inset-0 transition-all duration-[2000ms] ease-in-out ${
              i === activeSlide ? 'opacity-100 scale-105' : 'opacity-0 scale-100'
            }`}
          >
            <Image src={slide.url} alt={slide.label} fill sizes="100vw" className="object-cover" priority={i === 0} />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0e0e0f]/80 via-[#0e0e0f]/60 to-[#0e0e0f] z-[1]" />
      </div>

      {/* ─── Stage Lighting ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-[2]">
        <motion.div style={{ y: violetOrbY }} className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5 }}>
          <div className="w-full h-full bg-[#c39bff]/15 blur-[120px] rounded-full" />
        </motion.div>
        <motion.div style={{ y: cyanOrbY }} className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5, delay: 0.2 }}>
          <div className="w-full h-full bg-[#ffbf00]/8 blur-[100px] rounded-full" />
        </motion.div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="relative z-10 max-w-6xl w-full text-center">
        <motion.div className="space-y-8" variants={containerVariants} initial="hidden" animate="visible">
          {/* Badge */}
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 text-[#a1faff]"
            style={{ background: 'rgba(38, 38, 39, 0.6)', backdropFilter: 'blur(20px)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
            <span className="text-[0.6875rem] font-bold tracking-widest uppercase">Verified Artists · Secure Payments</span>
          </motion.div>

          {/* Headline */}
          <motion.h1 variants={itemVariants} className="font-display text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter leading-[0.9] max-w-4xl mx-auto text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
            Book the{' '}
            <span className="bg-gradient-to-r from-[#c39bff] via-[#b68cf6] to-[#a1faff] bg-clip-text text-transparent italic">
              perfect artist
            </span>{' '}
            for your event
          </motion.h1>

          {/* Subtitle */}
          <motion.p variants={itemVariants} className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
            DJs, singers, bands, comedians — 5,000+ verified artists across India.
            Browse, compare, book, and pay. All in one place.
          </motion.p>

          {/* ─── 3 CTA Buttons ─── */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <motion.button
              onClick={() => router.push('/search')}
              whileHover={{ scale: 1.05, boxShadow: '0px 24px 48px rgba(195,155,255,0.4)' }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-gradient-to-br from-[#c39bff] to-[#b68cf6] text-[#3f0e7a] font-bold rounded-full transition-all duration-300"
            >
              Hire an Artist
            </motion.button>

            <motion.button
              onClick={() => router.push('/login')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-4 rounded-full font-bold transition-all duration-300 border border-white/20 text-white hover:border-[#a1faff]/40 hover:bg-[#a1faff]/5"
              style={{ backdropFilter: 'blur(12px)', background: 'rgba(255,255,255,0.05)' }}
            >
              <span className="block text-sm">Event Company OS</span>
              <span className="block text-[10px] text-white/40 font-normal -mt-0.5">CRM · Bookings · Payouts</span>
            </motion.button>

            <motion.button
              onClick={() => router.push('/login')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-4 bg-transparent border border-white/20 text-white font-bold rounded-full transition-all duration-300 hover:bg-white/5 hover:border-white/40"
            >
              Join as Artist
            </motion.button>
          </motion.div>

          {/* ─── 3D Voice Assistant Mascots ─── */}
          <motion.div variants={itemVariants} className="pt-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-4">Voice Assistant</p>
            <div className="flex items-center justify-center gap-8">
              {/* Zara — English */}
              <button
                onClick={() => openVoiceAssistant('en')}
                className="mascot-3d group flex flex-col items-center gap-2 cursor-pointer"
              >
                <div className="mascot-avatar mascot-glow-purple rounded-full p-1 border border-[#c39bff]/30 bg-[#c39bff]/10 group-hover:bg-[#c39bff]/20 transition-all">
                  <ZaraMascot3D size={56} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-[#c39bff] group-hover:text-white transition-colors">Zara</p>
                  <p className="text-[10px] text-white/30">English</p>
                </div>
              </button>

              {/* Divider */}
              <div className="w-px h-12 bg-white/10" />

              {/* Kabir — Hindi */}
              <button
                onClick={() => openVoiceAssistant('hi')}
                className="mascot-3d group flex flex-col items-center gap-2 cursor-pointer"
              >
                <div className="mascot-avatar mascot-glow-cyan rounded-full p-1 border border-[#a1faff]/30 bg-[#a1faff]/10 group-hover:bg-[#a1faff]/20 transition-all" style={{ animationDelay: '0.5s' }}>
                  <KabirMascot3D size={56} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-[#a1faff] group-hover:text-white transition-colors">Kabir</p>
                  <p className="text-[10px] text-white/30">हिंदी</p>
                </div>
              </button>
            </div>
          </motion.div>

          {/* ─── Event Type Label + Dots ─── */}
          <motion.div variants={itemVariants} className="pt-4">
            <AnimatePresence mode="wait">
              <motion.span key={activeSlide} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#c39bff] animate-pulse" />
                {HERO_SLIDES[activeSlide].label}
              </motion.span>
            </AnimatePresence>
            <div className="flex items-center justify-center gap-2 mt-4">
              {HERO_SLIDES.map((_, i) => (
                <button key={i} onClick={() => setActiveSlide(i)}
                  className={`rounded-full transition-all duration-500 ${i === activeSlide ? 'w-6 h-1.5 bg-[#c39bff]' : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'}`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
