'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { ArtistCard } from '../../../components/search/ArtistCard';
import { SearchBar } from '../../../components/search/SearchBar';
import { FilterSidebar } from '../../../components/search/FilterSidebar';
import { FilterDrawer } from '../../../components/search/FilterDrawer';
import { SkeletonCard } from '../../../components/shared/SkeletonCard';

interface ArtistResult {
  id: string;
  stage_name: string;
  bio?: string;
  genres: string[];
  base_city: string;
  trust_score: number;
  total_bookings: number;
  is_verified: boolean;
  thumbnail_url?: string;
  pricing?: Array<{ min_price?: number; max_price?: number; min_paise?: number; max_paise?: number }>;
}

interface Facet {
  value: string;
  count: number;
}

interface SearchResponse {
  data: ArtistResult[];
  meta: { page: number; per_page: number; total: number; total_pages: number };
  facets: {
    genres: Facet[];
    cities: Facet[];
    event_types: Facet[];
    price_range: { min: number; max: number };
  };
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [genre, setGenre] = useState(searchParams.get('genre') ?? '');
  const [city, setCity] = useState(searchParams.get('city') ?? '');
  const [eventType, setEventType] = useState(searchParams.get('event_type') ?? '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort_by') ?? 'relevance');
  const [page, setPage] = useState(parseInt(searchParams.get('page') ?? '1'));

  const [results, setResults] = useState<ArtistResult[]>([]);
  const [facets, setFacets] = useState<SearchResponse['facets'] | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const doSearch = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (genre) params.set('genre', genre);
    if (city) params.set('city', city);
    if (eventType) params.set('event_type', eventType);
    params.set('sort_by', sortBy);
    params.set('page', String(page));
    params.set('per_page', '20');

    const res = await apiClient<SearchResponse>(`/v1/search/artists?${params.toString()}`);

    if (res.success) {
      const data = res as unknown as { data: ArtistResult[]; meta: SearchResponse['meta']; facets: SearchResponse['facets'] };
      setResults(data.data);
      setFacets(data.facets);
      setTotal(data.meta.total);
      setTotalPages(data.meta.total_pages);
    }
    setLoading(false);
  }, [query, genre, city, eventType, sortBy, page]);

  useEffect(() => {
    doSearch();
  }, [doSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    doSearch();
  };

  const clearFilters = () => {
    setGenre('');
    setCity('');
    setEventType('');
    setPage(1);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-section mx-auto px-4 sm:px-6 py-8">
        {/* Search Bar */}
        <SearchBar value={query} onChange={setQuery} onSubmit={handleSearch} />

        {/* Active filters + mobile filter button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mobile filter button */}
            <button
              onClick={() => setFilterDrawerOpen(true)}
              className="desktop:hidden flex items-center gap-1.5 px-3 py-2 bg-glass-light border border-glass-border rounded-lg text-sm text-text-secondary"
            >
              <SlidersHorizontal size={14} />
              Filters
              {(genre || city || eventType) && (
                <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {[genre, city, eventType].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Active filter pills */}
            {[
              { label: genre, onClear: () => { setGenre(''); setPage(1); } },
              { label: city, onClear: () => { setCity(''); setPage(1); } },
              { label: eventType, onClear: () => { setEventType(''); setPage(1); } },
            ].filter(f => f.label).map((f) => (
              <span key={f.label} className="flex items-center gap-1 px-2.5 py-1 rounded-pill bg-primary-500/10 border border-primary-500/20 text-xs text-primary-300">
                {f.label}
                <button onClick={f.onClear} className="hover:text-primary-100 ml-0.5">&times;</button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-6">
          {/* Desktop Sidebar */}
          <FilterSidebar
            facets={facets}
            genre={genre}
            city={city}
            eventType={eventType}
            onGenreChange={(v) => { setGenre(v); setPage(1); }}
            onCityChange={(v) => { setCity(v); setPage(1); }}
            onEventTypeChange={(v) => { setEventType(v); setPage(1); }}
            onClearAll={clearFilters}
          />

          {/* Results */}
          <main className="flex-1">
            {/* Results header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-text-muted">
                {loading ? 'Searching...' : `${total} artist${total !== 1 ? 's' : ''} found`}
              </p>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="text-sm bg-glass-light border border-glass-border rounded-lg px-3 py-1.5 text-text-secondary focus:outline-none focus:border-primary-500/30"
              >
                <option value="relevance">Most Relevant</option>
                <option value="trust_score">Highest Rated</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="newest">Newest</option>
              </select>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-xl text-text-muted mb-2">No artists found</p>
                <p className="text-sm text-text-muted">Try adjusting your search or filters</p>
              </div>
            ) : (
              <>
                <motion.div
                  className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-4"
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.05 } },
                  }}
                >
                  {results.map((artist) => (
                    <motion.div
                      key={artist.id}
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        show: { opacity: 1, y: 0 },
                      }}
                    >
                      <ArtistCard {...artist} />
                    </motion.div>
                  ))}
                </motion.div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 text-sm bg-glass-light border border-glass-border rounded-lg text-text-secondary disabled:opacity-30 hover:border-primary-500/20 transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-text-muted px-3">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 text-sm bg-glass-light border border-glass-border rounded-lg text-text-secondary disabled:opacity-30 hover:border-primary-500/20 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <FilterDrawer
        isOpen={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        facets={facets}
        genre={genre}
        city={city}
        eventType={eventType}
        onGenreChange={(v) => { setGenre(v); setPage(1); }}
        onCityChange={(v) => { setCity(v); setPage(1); }}
        onEventTypeChange={(v) => { setEventType(v); setPage(1); }}
        onClearAll={clearFilters}
      />
    </div>
  );
}
