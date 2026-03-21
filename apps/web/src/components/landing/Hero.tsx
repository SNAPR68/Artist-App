'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, Play, Building2, Sparkles } from 'lucide-react';

// Curated artist images for the hero collage (Unsplash — free to use)
// Using direct Unsplash image URLs with auto=format for best browser compatibility
const HERO_IMAGES = [
  { src: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80', alt: 'Singer performing on stage' },
  { src: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80', alt: 'DJ mixing at a club' },
  { src: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80', alt: 'Live concert crowd' },
  { src: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80', alt: 'Music festival lights' },
  { src: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80', alt: 'DJ performing with lights' },
  { src: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&w=600&q=80', alt: 'Band performing live' },
];

const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Jaipur'];

export function Hero() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    const params = new URLSearchParams();
    if (searchQuery) params.append('q', searchQuery);
    if (selectedCity !== 'All Cities') params.append('city', selectedCity);
    setTimeout(() => {
      router.push(`/search?${params.toString()}`);
    }, 100);
  };

  return (
    <section className="relative min-h-[100vh] md:min-h-[90vh] flex items-end md:items-center overflow-hidden">
      {/* ─── Animated Particle/Mesh Gradient Background ─── */}
      <style>{`
        @keyframes mesh-gradient {
          0% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
          100% { background-position: 0% 0%; }
        }
        @keyframes pulse-border {
          0%, 100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.7); }
          50% { box-shadow: 0 0 0 8px rgba(139, 92, 246, 0); }
        }
        .mesh-gradient-animated {
          animation: mesh-gradient 15s ease-in-out infinite;
          background-size: 400% 400%;
          background-image:
            radial-gradient(at 20% 50%, rgba(139, 92, 246, 0.4) 0px, transparent 50%),
            radial-gradient(at 60% 30%, rgba(59, 130, 246, 0.3) 0px, transparent 50%),
            radial-gradient(at 80% 70%, rgba(168, 85, 247, 0.25) 0px, transparent 50%);
        }
        .pulse-ring {
          animation: pulse-border 2.5s infinite;
        }
      `}</style>

      {/* ─── Background Image ─── */}
      <div className="absolute inset-0">
        {/* Primary hero image */}
        <Image
          src={HERO_IMAGES[0].src}
          alt={HERO_IMAGES[0].alt}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        {/* Fallback solid gradient if image fails */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]" style={{ zIndex: -1 }} />

        {/* Animated Mesh Gradient Overlay */}
        <div className="absolute inset-0 mesh-gradient-animated opacity-60" />

        {/* Dark overlay with gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-bg via-surface-bg/80 to-surface-bg/30" />
        {/* Neon color overlay for vibe */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/20 via-transparent to-accent-magenta/20" />
        {/* Bottom heavy gradient for text readability */}
        <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-surface-bg via-surface-bg/95 to-transparent" />
      </div>

      {/* ─── Floating Thumbnails (Desktop) with Enhanced Positioning ─── */}
      <div className="hidden lg:block absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top-right cluster */}
        <div className="absolute top-20 right-[10%] w-48 h-64 rounded-2xl overflow-hidden rotate-6 opacity-70 shadow-2xl animate-float-slow hover:opacity-80 transition-opacity">
          <Image src={HERO_IMAGES[1].src} alt={HERO_IMAGES[1].alt} fill sizes="192px" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-bg/60 to-transparent" />
        </div>
        <div className="absolute top-48 right-[26%] w-36 h-48 rounded-2xl overflow-hidden -rotate-3 opacity-60 shadow-2xl animate-float-slow-reverse hover:opacity-75 transition-opacity">
          <Image src={HERO_IMAGES[2].src} alt={HERO_IMAGES[2].alt} fill sizes="144px" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-bg/60 to-transparent" />
        </div>
        {/* Left accent */}
        <div className="absolute top-32 left-[5%] w-40 h-56 rounded-2xl overflow-hidden -rotate-6 opacity-50 shadow-2xl animate-float-slow hover:opacity-65 transition-opacity" style={{ animationDelay: '2s' }}>
          <Image src={HERO_IMAGES[3].src} alt={HERO_IMAGES[3].alt} fill sizes="160px" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-bg/60 to-transparent" />
        </div>
        {/* Bottom right accent */}
        <div className="absolute bottom-20 right-[15%] w-32 h-44 rounded-2xl overflow-hidden rotate-3 opacity-40 shadow-xl animate-float" style={{ animationDelay: '1s' }}>
          <Image src={HERO_IMAGES[4].src} alt={HERO_IMAGES[4].alt} fill sizes="128px" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-bg/60 to-transparent" />
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="relative z-10 w-full max-w-section mx-auto px-6 pb-12 md:pb-20 pt-32 md:pt-0">
        <div className="max-w-3xl">
          {/* Badge with Pulsing Ring */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="pulse-ring inline-flex items-center gap-2 px-4 py-1.5 rounded-pill bg-white/10 backdrop-blur-sm border border-white/20 text-xs font-semibold text-white/90">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              India&apos;s #1 Artist Booking Platform
            </div>
          </div>

          {/* Massive Heading with Better Typography Hierarchy */}
          <h1
            className="mt-8 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-heading font-extrabold text-white leading-[1.0] tracking-tighter animate-fade-in-up"
            style={{ animationDelay: '0.25s' }}
          >
            Book the
            <br />
            <span className="text-gradient bg-gradient-to-r from-cyan-400 via-primary-400 to-purple-400 text-transparent bg-clip-text">
              perfect artist
            </span>
            <br />
            for your event
          </h1>

          {/* Enhanced Subtext */}
          <p
            className="mt-6 text-lg sm:text-xl text-white/70 max-w-xl leading-relaxed animate-fade-in-up"
            style={{ animationDelay: '0.4s' }}
          >
            DJs, singers, bands, comedians — find and book verified artists for any occasion. Instant quotes, secure payments.
          </p>

          {/* Inline Search Bar */}
          <form
            onSubmit={handleSearch}
            className="mt-8 animate-fade-in-up glass-card p-1 flex flex-col sm:flex-row gap-2 max-w-2xl rounded-2xl"
            style={{ animationDelay: '0.5s' }}
          >
            <input
              type="text"
              placeholder="Search by artist name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-primary-400/50 focus:bg-white/10 transition-all text-sm"
            />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/80 focus:outline-none focus:border-primary-400/50 focus:bg-white/10 transition-all text-sm appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23ffffff' opacity='0.5' d='M1 1l5 5 5-5'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
                paddingRight: '28px',
              }}
            >
              <option>All Cities</option>
              {CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isSearching}
              className="group relative px-6 py-3 bg-gradient-accent hover:bg-gradient-accent-hover text-white font-semibold rounded-xl transition-all hover-glow hover:scale-[1.02] active:scale-[0.98] text-sm disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0"
            >
              <Search size={18} className="group-hover:rotate-12 transition-transform" />
              <span className="hidden sm:inline">Search</span>
            </button>
          </form>

          {/* CTAs with Animated Gradient Borders */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8 animate-fade-in-up" style={{ animationDelay: '0.65s' }}>
            <button
              onClick={() => router.push('/search')}
              className="group relative inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-white font-semibold rounded-xl transition-all text-sm overflow-hidden"
            >
              {/* Animated gradient border */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-400 via-primary-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ animation: 'borderShimmer 3s ease-in-out infinite' }} />
              <div className="absolute inset-0.5 bg-gradient-accent rounded-xl" />
              <div className="relative flex items-center justify-center gap-2.5 hover-glow group-hover:scale-[1.02] active:scale-[0.98]">
                <Search size={17} />
                Explore Artists
              </div>
            </button>

            <Link
              href="/login"
              className="group relative inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 hover:border-white/30 text-white font-semibold rounded-xl transition-all text-sm hover-glow"
            >
              <Building2 size={17} />
              Event Company Login
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Join as Artist Button */}
          <div className="mt-4 animate-fade-in-up" style={{ animationDelay: '0.75s' }}>
            <Link
              href="/artist/onboarding"
              className="group inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white/70 hover:text-white font-medium rounded-lg transition-all text-xs"
            >
              <Play size={14} />
              Join as Artist
              <Sparkles size={14} className="group-hover:scale-110 transition-transform" />
            </Link>
          </div>

          {/* Social proof row */}
          <div className="flex items-center gap-4 mt-8 animate-fade-in-up" style={{ animationDelay: '0.85s' }}>
            {/* Avatar stack */}
            <div className="flex -space-x-2.5">
              {HERO_IMAGES.slice(0, 4).map((img, i) => (
                <div key={i} className="w-9 h-9 rounded-full border-2 border-surface-bg overflow-hidden bg-surface-elevated ring-1 ring-primary-500/20">
                  <Image src={img.src} alt="" fill sizes="36px" className="object-cover" />
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

      {/* Border shimmer animation keyframes */}
      <style>{`
        @keyframes borderShimmer {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
      `}</style>
    </section>
  );
}
