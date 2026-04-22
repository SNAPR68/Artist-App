'use client';

/**
 * Event Company OS pivot (2026-04-22) — Vendors directory.
 *
 * Unified listing for 7 MVP categories: artist | av | photo | decor | license
 * plus Sprint D wk1 adds promoters | transport. Backed by GET /v1/vendors (see
 * vendor.routes.ts). Reuses the glass-card Nocturne aesthetic so it feels
 * native next to /search and /brief.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Mic,
  Sparkles,
  Camera,
  Flower2,
  FileCheck,
  Music2,
  Loader2,
  Megaphone,
  Car,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://artist-booking-api.onrender.com';

type VendorCategory =
  | 'all'
  | 'artist'
  | 'av'
  | 'photo'
  | 'decor'
  | 'license'
  | 'promoters'
  | 'transport';

const CATEGORIES: { key: VendorCategory; label: string; icon: typeof Mic; blurb: string }[] = [
  { key: 'all', label: 'All', icon: Sparkles, blurb: 'Every vendor on GRID' },
  { key: 'artist', label: 'Artists', icon: Music2, blurb: 'Live performers, DJs, bands' },
  { key: 'av', label: 'AV', icon: Mic, blurb: 'Sound + lights + stage (bundled)' },
  { key: 'photo', label: 'Photo/Video', icon: Camera, blurb: 'Photographers, cinematographers' },
  { key: 'decor', label: 'Decor', icon: Flower2, blurb: 'Florals, fabrication, theming' },
  { key: 'license', label: 'Licenses', icon: FileCheck, blurb: 'PPL, IPRS, Novex, permits' },
  { key: 'promoters', label: 'Promoters', icon: Megaphone, blurb: 'Street teams, flyering, brand activations' },
  { key: 'transport', label: 'Transport', icon: Car, blurb: 'Artist + crew ground transport' },
];

interface Vendor {
  id: string;
  stage_name: string;
  bio: string | null;
  base_city: string;
  category: Exclude<VendorCategory, 'all'>;
  category_attributes: Record<string, unknown>;
  trust_score: number | null;
  total_bookings: number | null;
  is_verified: boolean;
  profile_completion_pct: number;
}

export default function VendorsPageClient() {
  const [category, setCategory] = useState<VendorCategory>('all');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ per_page: '40' });
    if (category !== 'all') params.set('category', category);
    if (city.trim()) params.set('city', city.trim());

    fetch(`${API_URL}/v1/vendors?${params.toString()}`, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = await r.json();
        if (!json.success) throw new Error(json.errors?.[0]?.message || 'Request failed');
        setVendors(json.data as Vendor[]);
        setTotal(json.meta?.total ?? 0);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [category, city]);

  const activeLabel = useMemo(
    () => CATEGORIES.find((c) => c.key === category)?.label ?? 'All',
    [category],
  );

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white pt-24 pb-20">
      {/* Ambient glow */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />

      <section className="relative max-w-section mx-auto px-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <span className="text-xs tracking-widest uppercase font-bold text-[#a1faff]">
            Event Company OS
          </span>
          <h1 className="mt-3 text-4xl md:text-5xl font-display font-extrabold tracking-tighter">
            Every vendor, one directory.
          </h1>
          <p className="mt-3 text-white/60 max-w-2xl">
            Artists, AV, photo, decor, license agents — all on GRID. Filter by category and city,
            then send one brief that routes to every vendor in seconds.
          </p>
        </motion.div>

        {/* Filters */}
        <div className="glass-card rounded-xl p-5 border border-white/5 mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = c.key === category;
              return (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 min-h-11 ${
                    active
                      ? 'bg-[#c39bff] text-[#0e0e0f] shadow-[0_0_20px_-5px_rgba(195,155,255,0.6)]'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                  aria-pressed={active}
                >
                  <Icon size={14} />
                  {c.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City (e.g. Mumbai, Delhi, Bangalore)"
              className="input-nocturne flex-1"
              aria-label="Filter by city"
            />
            <span className="text-xs tracking-widest uppercase font-bold text-white/40">
              {loading ? '…' : `${total} ${activeLabel.toLowerCase()}`}
            </span>
          </div>
        </div>

        {/* Results */}
        {error && (
          <div className="glass-card rounded-xl p-6 border border-red-500/20 text-red-300">
            Failed to load vendors: {error}
          </div>
        )}

        {loading && !error && (
          <div className="flex items-center justify-center py-20 text-white/40">
            <Loader2 className="animate-spin mr-2" size={18} /> Loading vendors…
          </div>
        )}

        {!loading && !error && vendors.length === 0 && (
          <div className="glass-card rounded-xl p-10 border border-white/5 text-center text-white/50">
            No vendors match those filters yet.
          </div>
        )}

        {!loading && !error && vendors.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {vendors.map((v, i) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02, duration: 0.3 }}
              >
                <Link
                  href={`/artists/${v.id}`}
                  className="block glass-card rounded-xl p-5 border border-white/5 hover:border-[#c39bff]/30 transition-all duration-200 h-full"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-[10px] tracking-widest uppercase font-bold text-[#a1faff]">
                      {v.category}
                    </span>
                    {v.is_verified && (
                      <span className="text-[10px] font-bold text-[#ffbf00]">VERIFIED</span>
                    )}
                  </div>
                  <h3 className="text-lg font-display font-extrabold tracking-tight mb-1">
                    {v.stage_name}
                  </h3>
                  <p className="text-xs text-white/50 mb-3">{v.base_city}</p>
                  {v.bio && (
                    <p className="text-sm text-white/60 line-clamp-2 mb-3">{v.bio}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    {typeof v.trust_score === 'number' && (
                      <span>Trust {Math.round(v.trust_score)}</span>
                    )}
                    <span>{v.total_bookings ?? 0} bookings</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
