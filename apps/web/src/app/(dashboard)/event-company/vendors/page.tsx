'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Store,
  Music2,
  Speaker,
  Camera,
  Flower2,
  ScrollText,
  Megaphone,
  Truck,
  MapPin,
  Star,
  CheckCircle2,
  Search,
  ChevronRight,
  SlidersHorizontal,
  Heart,
  Ban,
  Clock,
} from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';

type VendorCategory =
  | 'artist'
  | 'av'
  | 'photo'
  | 'decor'
  | 'license'
  | 'promoters'
  | 'transport';

interface Vendor {
  id: string;
  stage_name: string;
  bio: string | null;
  base_city: string;
  category: VendorCategory;
  category_attributes: Record<string, unknown> | null;
  trust_score: number;
  total_bookings: number;
  is_verified: boolean;
  profile_completion_pct: number;
  rating: number | string | null;
  rating_count: number;
  ontime_rate: number | string | null;
  events_done: number;
  is_preferred: boolean;
  is_blacklisted: boolean;
  last_used_at: string | null;
}

interface ListResponse {
  data: Vendor[];
  meta: { total: number; page: number; per_page: number; total_pages: number };
}

const CATEGORIES: {
  value: VendorCategory | 'all';
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  { value: 'all',       label: 'All',       icon: <Store size={14} />,       color: 'text-white/70' },
  { value: 'artist',    label: 'Artists',   icon: <Music2 size={14} />,      color: 'text-[#c39bff]' },
  { value: 'av',        label: 'AV',         icon: <Speaker size={14} />,     color: 'text-[#a1faff]' },
  { value: 'photo',     label: 'Photo',      icon: <Camera size={14} />,      color: 'text-[#ffbf00]' },
  { value: 'decor',     label: 'Decor',      icon: <Flower2 size={14} />,     color: 'text-emerald-300' },
  { value: 'license',   label: 'License',    icon: <ScrollText size={14} />,  color: 'text-orange-300' },
  { value: 'promoters', label: 'Promoters',  icon: <Megaphone size={14} />,   color: 'text-pink-300' },
  { value: 'transport', label: 'Transport',  icon: <Truck size={14} />,       color: 'text-sky-300' },
];

const CATEGORY_ACCENT: Record<VendorCategory, string> = {
  artist:    '#c39bff',
  av:        '#a1faff',
  photo:     '#ffbf00',
  decor:     '#6ee7b7',
  license:   '#fdba74',
  promoters: '#f9a8d4',
  transport: '#7dd3fc',
};

const CITIES = ['All Cities', 'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata'];

function truncate(str: string | null, n: number) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<VendorCategory | 'all'>('all');
  const [city, setCity] = useState('All Cities');
  const [search, setSearch] = useState('');
  const [preferredOnly, setPreferredOnly] = useState(false);
  const [hideBlacklisted, setHideBlacklisted] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async (cat: VendorCategory | 'all', c: string, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: '24' });
      if (cat !== 'all') params.set('category', cat);
      if (c !== 'All Cities') params.set('city', c);
      const res = await apiClient<ListResponse>(`/v1/vendors?${params}`);
      if (!res.success) {
        setError(res.errors?.[0]?.message || 'Failed to load vendors');
        return;
      }
      const payload = res.data as unknown as ListResponse;
      setVendors(payload.data ?? []);
      setTotal(payload.meta?.total ?? 0);
      setTotalPages(payload.meta?.total_pages ?? 1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    load(category, city, 1);
  }, [category, city, load]);

  useEffect(() => {
    if (page > 1) load(category, city, page);
  }, [page, category, city, load]);

  let filtered = vendors;
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (v) => v.stage_name.toLowerCase().includes(q) || v.base_city.toLowerCase().includes(q),
    );
  }
  if (preferredOnly) filtered = filtered.filter((v) => v.is_preferred);
  if (hideBlacklisted) filtered = filtered.filter((v) => !v.is_blacklisted);

  const selectedCat = CATEGORIES.find((c) => c.value === category)!;

  return (
    <div className="min-h-screen bg-[#0e0e0f] text-white">
      {/* Hero */}
      <section className="relative border-b border-white/5 bg-[#1a191b]">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-[#a1faff]/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 py-10 relative">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs tracking-widest uppercase font-bold text-[#a1faff] mb-2">
                <Store className="w-4 h-4" /> Vendors
              </div>
              <h1 className="font-display text-4xl font-extrabold tracking-tighter">
                All your vendors, one place.
              </h1>
              <p className="text-white/50 mt-2 max-w-xl">
                Browse artists, AV, photo, decor, license agents, promoters and transport — shortlist and book via voice.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 text-white/50 text-sm">
              <SlidersHorizontal className="w-4 h-4" />
              {total > 0 ? `${total} vendors` : ''}
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-0 z-20 bg-[#0e0e0f]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Category chips */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  category === cat.value
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'bg-transparent border-white/10 text-white/50 hover:text-white/80 hover:border-white/20'
                }`}
              >
                <span className={category === cat.value ? cat.color : ''}>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>

          {/* City + Search + Preferred toggles */}
          <div className="flex gap-2 ml-auto items-center flex-wrap">
            <button
              onClick={() => setPreferredOnly((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all h-8 ${
                preferredOnly
                  ? 'bg-pink-500/15 border-pink-400/40 text-pink-300'
                  : 'bg-transparent border-white/10 text-white/50 hover:text-white/80 hover:border-white/20'
              }`}
              title="Show only your preferred vendors"
            >
              <Heart className="w-3 h-3" /> Preferred
            </button>
            <button
              onClick={() => setHideBlacklisted((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all h-8 ${
                hideBlacklisted
                  ? 'bg-transparent border-white/10 text-white/50 hover:text-white/80 hover:border-white/20'
                  : 'bg-red-500/10 border-red-400/30 text-red-300'
              }`}
              title={hideBlacklisted ? 'Blacklisted hidden' : 'Showing blacklisted'}
            >
              <Ban className="w-3 h-3" /> {hideBlacklisted ? 'Hide BL' : 'Show BL'}
            </button>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="input-nocturne text-xs py-1.5 px-3 pr-6 h-8"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-nocturne text-xs py-1.5 pl-7 pr-3 h-8 w-36"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="nocturne-skeleton h-48 rounded-xl" />
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="glass-card rounded-xl p-6 border border-red-500/20 text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="glass-card rounded-xl p-12 text-center border border-white/5">
            <Store className="w-10 h-10 text-[#c39bff] mx-auto mb-4" />
            <h3 className="font-display text-2xl font-extrabold tracking-tight">
              No {selectedCat.label === 'All' ? 'vendors' : selectedCat.label.toLowerCase()} found
            </h3>
            <p className="text-white/50 mt-2">Try a different city or category.</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((v) => {
                const accent = CATEGORY_ACCENT[v.category];
                const catMeta = CATEGORIES.find((c) => c.value === v.category);
                return (
                  <Link
                    key={v.id}
                    href={`/event-company/vendors/${v.id}`}
                    className="glass-card rounded-xl p-5 border border-white/5 hover:border-white/15 transition-all group relative overflow-hidden"
                  >
                    {/* Glow */}
                    <div
                      className="absolute -top-8 -right-8 w-28 h-28 blur-[60px] rounded-full pointer-events-none opacity-30 group-hover:opacity-60 transition"
                      style={{ backgroundColor: accent }}
                    />

                    {/* Category + status badges */}
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                        style={{ color: accent, borderColor: `${accent}40`, backgroundColor: `${accent}15` }}
                      >
                        {catMeta?.icon}
                        {catMeta?.label ?? v.category}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {v.is_preferred && (
                          <span
                            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-pink-400/30 bg-pink-500/15 text-pink-300"
                            title="Preferred vendor"
                          >
                            <Heart className="w-2.5 h-2.5" /> Pref
                          </span>
                        )}
                        {v.is_blacklisted && (
                          <span
                            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-red-400/30 bg-red-500/15 text-red-300"
                            title="Blacklisted"
                          >
                            <Ban className="w-2.5 h-2.5" /> BL
                          </span>
                        )}
                        {v.is_verified && !v.is_blacklisted && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </div>
                    </div>

                    <h3 className="font-display font-extrabold text-lg tracking-tight truncate">
                      {v.stage_name}
                    </h3>

                    {v.bio && (
                      <p className="text-white/50 text-xs mt-1 line-clamp-2">
                        {truncate(v.bio, 80)}
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-between text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {v.base_city}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-[#ffbf00]" />
                          <span className="text-white/80 font-bold">
                            {v.rating != null
                              ? Number(v.rating).toFixed(1)
                              : Number(v.trust_score ?? 0).toFixed(1)}
                          </span>
                          {v.rating_count > 0 && (
                            <span className="text-white/30">({v.rating_count})</span>
                          )}
                        </span>
                      </span>
                    </div>

                    {/* Ops quality strip */}
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-white/40">
                      {v.ontime_rate != null && (
                        <span className="flex items-center gap-1" title="On-time rate">
                          <Clock className="w-3 h-3 text-[#a1faff]" />
                          {Number(v.ontime_rate).toFixed(0)}% on-time
                        </span>
                      )}
                      {v.events_done > 0 && (
                        <span className="text-white/30">{v.events_done} events</span>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs text-white/30">
                        {v.profile_completion_pct}% complete
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-white/30 group-hover:text-white/70 transition" />
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-4 py-2 rounded-lg text-sm border border-white/10 text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>
                <span className="text-white/40 text-sm">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 rounded-lg text-sm border border-white/10 text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
