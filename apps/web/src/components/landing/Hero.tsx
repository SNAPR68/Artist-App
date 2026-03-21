'use client';

import Link from 'next/link';
import { Search, ArrowRight, Play, Building2 } from 'lucide-react';

// Curated artist images for the hero collage (Unsplash — free to use)
// Using direct Unsplash image URLs with auto=format for best browser compatibility
const HERO_IMAGES = [
  { src: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80', alt: 'Singer performing on stage' },
  { src: 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?auto=format&fit=crop&w=600&q=80', alt: 'DJ mixing at a club' },
  { src: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80', alt: 'Live concert crowd' },
  { src: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80', alt: 'Music festival lights' },
  { src: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80', alt: 'DJ performing with lights' },
  { src: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&w=600&q=80', alt: 'Band performing live' },
];

export function Hero() {
  return (
    <section className="relative min-h-[100vh] md:min-h-[90vh] flex items-end md:items-center overflow-hidden">
      {/* ─── Background Image ─── */}
      <div className="absolute inset-0">
        {/* Primary hero image — no crossOrigin to avoid CORS issues with Unsplash */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_IMAGES[0].src}
          alt={HERO_IMAGES[0].alt}
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        {/* Fallback solid gradient if image fails */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]" style={{ zIndex: -1 }} />
        {/* Dark overlay with gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-bg via-surface-bg/80 to-surface-bg/30" />
        {/* Neon color overlay for vibe */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/20 via-transparent to-accent-magenta/20" />
        {/* Bottom heavy gradient for text readability */}
        <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-surface-bg via-surface-bg/95 to-transparent" />
      </div>

      {/* ─── Floating Thumbnails (Desktop) ─── */}
      <div className="hidden lg:block absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top-right cluster */}
        <div className="absolute top-24 right-[8%] w-48 h-64 rounded-2xl overflow-hidden rotate-6 opacity-60 shadow-2xl animate-float-slow">
          <img src={HERO_IMAGES[1].src} alt={HERO_IMAGES[1].alt} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-bg/60 to-transparent" />
        </div>
        <div className="absolute top-40 right-[22%] w-36 h-48 rounded-2xl overflow-hidden -rotate-3 opacity-50 shadow-2xl animate-float-slow-reverse">
          <img src={HERO_IMAGES[2].src} alt={HERO_IMAGES[2].alt} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-bg/60 to-transparent" />
        </div>
        {/* Left accent */}
        <div className="absolute top-32 left-[5%] w-40 h-56 rounded-2xl overflow-hidden -rotate-6 opacity-40 shadow-2xl animate-float-slow" style={{ animationDelay: '2s' }}>
          <img src={HERO_IMAGES[3].src} alt={HERO_IMAGES[3].alt} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-bg/60 to-transparent" />
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="relative z-10 w-full max-w-section mx-auto px-6 pb-12 md:pb-20 pt-32 md:pt-0">
        <div className="max-w-2xl">
          {/* Badge */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-pill bg-white/10 backdrop-blur-sm border border-white/20 text-xs font-semibold text-white/90">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              India&apos;s #1 Artist Booking Platform
            </span>
          </div>

          {/* Heading */}
          <h1
            className="mt-6 text-4xl sm:text-5xl md:text-6xl lg:text-hero font-heading font-extrabold text-white leading-[1.05] tracking-tighter animate-fade-in-up"
            style={{ animationDelay: '0.25s' }}
          >
            Book the perfect
            <br />
            <span className="text-gradient">artist for your event</span>
          </h1>

          {/* Subtext */}
          <p
            className="mt-5 text-base sm:text-lg text-white/70 max-w-lg leading-relaxed animate-fade-in-up"
            style={{ animationDelay: '0.4s' }}
          >
            DJs, singers, bands, comedians — find and book verified artists for any occasion. Instant quotes, secure payments.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8 animate-fade-in-up" style={{ animationDelay: '0.55s' }}>
            <Link
              href="/search"
              className="group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-gradient-accent hover:bg-gradient-accent-hover text-white font-semibold rounded-xl transition-all hover-glow hover:scale-[1.02] active:scale-[0.98] text-sm"
            >
              <Search size={17} />
              Find Artists
            </Link>
            <Link
              href="/login"
              className="group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 hover:border-white/30 text-white font-semibold rounded-xl transition-all text-sm"
            >
              <Building2 size={17} />
              Event Company Login
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/artist/onboarding"
              className="group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white/80 hover:text-white font-medium rounded-xl transition-all text-sm"
            >
              <Play size={17} />
              Join as Artist
            </Link>
          </div>

          {/* Social proof row */}
          <div className="flex items-center gap-4 mt-8 animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
            {/* Avatar stack */}
            <div className="flex -space-x-2.5">
              {HERO_IMAGES.slice(0, 4).map((img, i) => (
                <div key={i} className="w-9 h-9 rounded-full border-2 border-surface-bg overflow-hidden bg-surface-elevated">
                  <img src={img.src} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
            <div className="text-sm">
              <span className="text-white font-semibold">5,000+</span>
              <span className="text-white/50 ml-1">verified artists</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Scroll indicator ─── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 animate-float hidden md:block">
        <div className="w-6 h-10 rounded-pill border-2 border-white/20 flex items-start justify-center p-1.5">
          <div className="w-1 h-2.5 rounded-full bg-white/50 animate-pulse" />
        </div>
      </div>
    </section>
  );
}
