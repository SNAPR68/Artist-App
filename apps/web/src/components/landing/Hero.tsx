'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, Star, ChevronDown } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 100,
    },
  },
};

export function Hero() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef(null);
  const { scrollY } = useScroll();

  // Parallax values for floating orbs
  const violetOrbY = useTransform(scrollY, [0, 500], [0, 150]);
  const orangeOrbY = useTransform(scrollY, [0, 500], [0, -100]);
  const pinkOrbY = useTransform(scrollY, [0, 500], [0, 120]);

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
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-violet-50 via-white to-orange-50"
    >
      {/* ─── Floating Gradient Orbs with Parallax ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Violet Orb - Top Left */}
        <motion.div
          style={{ y: violetOrbY }}
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          transition={{ duration: 1.5 }}
        >
          <div
            className="w-full h-full"
            style={{
              background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)',
            }}
          />
        </motion.div>

        {/* Orange/Amber Orb - Bottom Right */}
        <motion.div
          style={{ y: orangeOrbY }}
          className="absolute -bottom-32 -right-48 w-[600px] h-[600px] rounded-full opacity-15 blur-3xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          transition={{ duration: 1.5, delay: 0.2 }}
        >
          <div
            className="w-full h-full"
            style={{
              background: 'radial-gradient(circle, #f97316 0%, transparent 70%)',
            }}
          />
        </motion.div>

        {/* Pink Orb - Right Center */}
        <motion.div
          style={{ y: pinkOrbY }}
          className="absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full opacity-10 blur-3xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          transition={{ duration: 1.5, delay: 0.4 }}
        >
          <div
            className="w-full h-full"
            style={{
              background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)',
            }}
          />
        </motion.div>
      </div>

      {/* ─── Main Content Container ─── */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 py-20 md:py-32">
        <motion.div
          className="space-y-8 md:space-y-12"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* ─── Main Heading with Line-by-Line Animation ─── */}
          <div className="max-w-3xl space-y-4">
            <div className="space-y-3">
              {/* Line 1: "Book the" */}
              <motion.h1
                variants={itemVariants}
                className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-heading font-extrabold text-neutral-900 tracking-tighter leading-[1.05]"
              >
                Book the
              </motion.h1>

              {/* Line 2: "perfect artist" with gradient */}
              <motion.h1
                variants={itemVariants}
                className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-heading font-extrabold bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 text-transparent bg-clip-text tracking-tighter leading-[1.05]"
              >
                perfect artist
              </motion.h1>

              {/* Line 3: "for your event" */}
              <motion.h1
                variants={itemVariants}
                className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-heading font-extrabold text-neutral-900 tracking-tighter leading-[1.05]"
              >
                for your event
              </motion.h1>
            </div>

            {/* ─── Subheading ─── */}
            <motion.p
              variants={itemVariants}
              className="text-lg text-neutral-500 max-w-xl leading-relaxed font-sans pt-2"
            >
              Discover and book verified DJs, singers, bands, and comedians instantly. Transparent pricing, secure payments.
            </motion.p>
          </div>

          {/* ─── Search Form with Animations ─── */}
          <motion.form
            onSubmit={handleSearch}
            variants={itemVariants}
            className="mt-4 max-w-xl"
          >
            <motion.div
              className="bg-white border border-neutral-200 rounded-2xl p-2 shadow-xl focus-within:shadow-2xl focus-within:border-violet-200 transition-all duration-300"
              whileHover={{ boxShadow: '0 25px 50px -12px rgba(124, 58, 237, 0.15)' }}
            >
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Search Input */}
                <input
                  type="text"
                  placeholder="Artist name, category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-5 py-3.5 bg-transparent border-0 text-neutral-900 placeholder:text-neutral-400 focus:outline-none font-sans text-sm"
                />

                {/* City Select */}
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="px-5 py-3.5 bg-transparent border-0 text-neutral-700 focus:outline-none font-sans text-sm appearance-none cursor-pointer hover:text-neutral-900 transition-colors"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%236b7280' opacity='0.6' d='M1 1l5 5 5-5'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 16px center',
                    paddingRight: '32px',
                  }}
                >
                  <option>All Cities</option>
                  {CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>

                {/* Search Button with Micro-interactions */}
                <motion.button
                  type="submit"
                  disabled={isSearching}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3.5 min-h-12 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shrink-0 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                >
                  <Search size={18} />
                  <span className="hidden sm:inline">Search</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.form>

          {/* ─── CTA Buttons Row ─── */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 pt-2"
          >
            {/* Primary CTA Button */}
            <motion.button
              onClick={() => router.push('/search')}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-4 min-h-12 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-lg"
            >
              <Search size={18} />
              Explore Artists
            </motion.button>

            {/* Secondary CTA Button with Arrow Animation */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto"
            >
              <Link
                href="/login"
                className="px-8 py-4 min-h-12 bg-white border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 text-neutral-700 font-semibold rounded-xl transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-sm group w-full"
              >
                Event Company Login
                <span className="inline-block group-hover:translate-x-1 transition-transform duration-300">
                  <ArrowRight size={18} />
                </span>
              </Link>
            </motion.div>
          </motion.div>

          {/* ─── Social Proof Section ─── */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center gap-6 pt-4">
            {/* Avatar Stack */}
            <div className="flex -space-x-2">
              {HERO_IMAGES.slice(0, 4).map((img, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: 'spring',
                    damping: 20,
                    stiffness: 100,
                    delay: 1.0 + i * 0.1,
                  }}
                  whileHover={{ scale: 1.15, zIndex: 10 }}
                  className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-neutral-100 shadow-md hover:shadow-lg transition-shadow"
                >
                  <Image src={img.src} alt="" fill sizes="40px" className="object-cover" />
                </motion.div>
              ))}
            </div>

            {/* Stats & Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="text-sm font-sans">
                <span className="text-neutral-900 font-semibold">5,000+</span>
                <span className="text-neutral-500 ml-2">verified artists</span>
              </div>

              {/* Rating Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.4, type: 'spring', damping: 25, stiffness: 100 }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-50 rounded-full border border-neutral-200"
              >
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        delay: 1.5 + i * 0.05,
                        type: 'spring',
                        damping: 20,
                        stiffness: 100,
                      }}
                    >
                      <Star size={14} className="fill-yellow-400 text-yellow-400" />
                    </motion.div>
                  ))}
                </div>
                <span className="text-xs font-semibold text-neutral-900">4.9</span>
              </motion.div>

              {/* Available Badge */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.6 }}
                className="flex items-center gap-2 text-xs font-medium text-neutral-700"
              >
                <motion.div
                  className="w-2 h-2 rounded-full bg-green-500"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
                Available now
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* ─── Animated Scroll Indicator ─── */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 hidden md:flex flex-col items-center gap-2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 0.6 }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
        >
          <ChevronDown size={24} className="text-neutral-400" strokeWidth={1.5} />
        </motion.div>
      </motion.div>
    </section>
  );
}
