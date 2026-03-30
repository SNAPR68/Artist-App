'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { ArrowUp, Mic, Building2, Guitar } from 'lucide-react';

// ─── Hero Background Images ─────────────────────────────────
const HERO_SLIDES = [
  { url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920&q=90&fit=crop', label: 'Concert Night' },
  { url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1920&q=90&fit=crop', label: 'Festival Stage' },
  { url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1920&q=90&fit=crop', label: 'Music Festival' },
  { url: 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=1920&q=90&fit=crop', label: 'Wedding Sangeet' },
  { url: 'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=1920&q=90&fit=crop', label: 'DJ Performance' },
];

const EXAMPLE_BRIEFS = [
  'Delhi wedding, 300 guests, Punjabi singer for sangeet night, 5L budget',
  'Mumbai corporate annual day, 1000 pax, high-energy host + band',
  'Bangalore house party, 50 people, acoustic singer, under 50k',
  'Goa beach wedding, live DJ + dhol player, sunset ceremony',
  'Hyderabad college fest, rapper + beatboxer, 2L budget',
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 100 } },
};

export function Hero() {
  const router = useRouter();
  const containerRef = useRef(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { scrollY } = useScroll();
  const [activeSlide, setActiveSlide] = useState(0);
  const [briefText, setBriefText] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Rotate placeholder examples
  useEffect(() => {
    if (briefText) return; // Don't rotate if user is typing
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % EXAMPLE_BRIEFS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [briefText]);

  const violetOrbY = useTransform(scrollY, [0, 500], [0, 150]);
  const cyanOrbY = useTransform(scrollY, [0, 500], [0, -100]);

  const openVoiceAssistant = useCallback((lang: 'en' | 'hi') => {
    window.dispatchEvent(new CustomEvent('open-voice-assistant', { detail: { lang } }));
  }, []);

  const handleSubmit = useCallback(() => {
    const text = briefText.trim();
    if (!text || isSubmitting) return;
    setIsSubmitting(true);
    router.push(`/brief?q=${encodeURIComponent(text)}`);
  }, [briefText, isSubmitting, router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Auto-resize textarea
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBriefText(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, []);

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
        <div className="absolute inset-0 bg-gradient-to-b from-[#0e0e0f]/85 via-[#0e0e0f]/70 to-[#0e0e0f] z-[1]" />
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
      <div className="relative z-10 max-w-4xl w-full text-center pt-20">
        <motion.div className="space-y-5" variants={containerVariants} initial="hidden" animate="visible">

          {/* Headline */}
          <motion.h1 variants={itemVariants} className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tighter leading-[1] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
            Plug into India&apos;s{' '}
            <span className="bg-gradient-to-r from-[#c39bff] via-[#b68cf6] to-[#a1faff] bg-clip-text text-transparent">
              live entertainment grid.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p variants={itemVariants} className="text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            <span className="text-[#c39bff]">Artists grow careers.</span>{' '}
            <span className="text-[#a1faff]">Companies build events.</span>{' '}
            <span className="text-white/70">The industry moves — all on one platform.</span>
          </motion.p>

          {/* ─── Chat-Style Input ─── */}
          <motion.div variants={itemVariants} className="relative mx-auto">
            {/* Gradient border glow — always visible */}
            <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-[#c39bff]/50 via-[#a1faff]/20 to-[#c39bff]/50 blur-[1px] pointer-events-none" />
            <div
              className="relative rounded-3xl border border-[#c39bff]/25 hover:border-[#c39bff]/40 focus-within:border-[#c39bff]/60 transition-all duration-300"
              style={{
                background: 'rgba(26, 25, 27, 0.85)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 0 60px rgba(195, 155, 255, 0.08), 0 8px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
              }}
            >
              {/* Ambient glow on focus */}
              <div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-[#c39bff]/10 to-[#a1faff]/5 opacity-0 focus-within:opacity-100 transition-opacity pointer-events-none" />

              <textarea
                ref={textareaRef}
                value={briefText}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={EXAMPLE_BRIEFS[placeholderIndex]}
                rows={6}
                className="w-full bg-transparent text-white placeholder:text-white/25 text-lg md:text-xl px-7 pt-7 pb-18 resize-none focus:outline-none leading-relaxed"
                style={{ minHeight: '220px', maxHeight: '320px' }}
              />

              {/* Bottom toolbar */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Voice button */}
                  <button
                    onClick={() => openVoiceAssistant('en')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/30 hover:text-[#c39bff] hover:bg-[#c39bff]/10 transition-all text-xs font-medium"
                    title="Use voice"
                  >
                    <Mic size={14} />
                    <span className="hidden sm:inline">Voice</span>
                  </button>
                </div>

                {/* Submit button */}
                <motion.button
                  onClick={handleSubmit}
                  disabled={!briefText.trim() || isSubmitting}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${
                    briefText.trim()
                      ? 'bg-[#c39bff] text-[#1a191b] shadow-[0_0_20px_rgba(195,155,255,0.4)] cursor-pointer'
                      : 'bg-white/10 text-white/20 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowUp size={18} strokeWidth={2.5} />
                  )}
                </motion.button>
              </div>
            </div>

            {/* Example chips */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap items-center justify-center gap-2 mt-4"
            >
              {[
                'Wedding sangeet in Delhi',
                'Corporate event Mumbai',
                'College fest band',
                'House party DJ',
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => {
                    setBriefText(example);
                    textareaRef.current?.focus();
                  }}
                  className="px-3 py-1.5 rounded-full border border-white/8 text-white/35 hover:text-white/60 hover:border-white/15 hover:bg-white/5 transition-all text-xs"
                >
                  {example}
                </button>
              ))}
            </motion.div>
          </motion.div>

          {/* ─── Secondary Links ─── */}
          <motion.div variants={itemVariants} className="flex items-center justify-center gap-6 pt-2">
            <button
              onClick={() => router.push('/search')}
              className="flex items-center gap-2 text-white/30 hover:text-white/60 transition-colors text-sm"
            >
              <Guitar size={14} />
              Browse Artists
            </button>
            <div className="w-px h-4 bg-white/10" />
            <button
              onClick={() => router.push('/login')}
              className="flex items-center gap-2 text-white/30 hover:text-white/60 transition-colors text-sm"
            >
              <Building2 size={14} />
              Event Company OS
            </button>
          </motion.div>

          {/* ─── Event Type Label + Dots ─── */}
          <motion.div variants={itemVariants} className="pt-1">
            <AnimatePresence mode="wait">
              <motion.span key={activeSlide} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/20"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#c39bff]/60 animate-pulse" />
                {HERO_SLIDES[activeSlide].label}
              </motion.span>
            </AnimatePresence>
            <div className="flex items-center justify-center gap-2 mt-3">
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
