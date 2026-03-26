'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SlidersHorizontal, ChevronLeft, ChevronRight, Search } from 'lucide-react';
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

export default function SearchPageClient() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nocturne-accent" />
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
  const [error, setError] = useState<string | null>(null);

  const doSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (genre) params.set('genre', genre);
    if (city) params.set('city', city);
    if (eventType) params.set('event_type', eventType);
    params.set('sort_by', sortBy);
    params.set('page', String(page));
    params.set('per_page', '20');

    try {
      const res = await apiClient<SearchResponse>(`/v1/search/artists?${params.toString()}`);

      if (res.success) {
        const data = res as unknown as { data: ArtistResult[]; meta: SearchResponse['meta']; facets: SearchResponse['facets'] };
        setResults(data.data ?? []);
        setFacets(data.facets);
        setTotal(data.meta.total);
        setTotalPages(data.meta.total_pages);
      } else {
        console.error('[Search] API returned error:', res.errors);
        setError('Failed to load artists. The server may be starting up — try again in 30 seconds.');
      }
    } catch (err) {
      console.error('[Search] fetch error:', err);
      setError('Could not connect to the server. Please try again.');
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

  const activeFiltersCount = [genre, city, eventType].filter(Boolean).length;
  const pageSize = 20;
  const startResult = loading ? 0 : (page - 1) * pageSize + 1;
  const endResult = loading ? 0 : Math.min(page * pageSize, total);

  return (
    <div className="theme-nocturne bg-gradient-nocturne-hero min-h-screen">
      {/* Enhanced Search Header */}
      <div className="bg-gradient-to-b from-nocturne-surface/50 to-transparent border-b border-nocturne-border sticky top-0 z-40 backdrop-blur-sm">
        <div className="max-w-section mx-auto px-4 sm:px-6 py-6">
          <div className="mb-4 animate-fade-in-up">
            <h1 className="text-3xl sm:text-hero font-display text-gradient-nocturne mb-2">
              Find Your Perfect Artist
            </h1>
            <p className="text-nocturne-text-secondary text-sm">Browse thousands of talented performers for your event</p>
          </div>
          <SearchBar value={query} onChange={setQuery} onSubmit={handleSearch} />
        </div>
      </div>

      <div className="max-w-section mx-auto px-4 sm:px-6 py-8">
        {/* Active Filters + Mobile Filter Button */}
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mobile filter button */}
            <button
              onClick={() => setFilterDrawerOpen(true)}
              className="desktop:hidden flex items-center gap-1.5 px-4 py-2.5 glass-card border border-nocturne-border rounded-lg text-sm text-nocturne-text-secondary hover:border-nocturne-border-strong transition-colors"
            >
              <SlidersHorizontal size={16} />
              Filters
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-gradient-accent text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Active filter pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: genre, onClear: () => { setGenre(''); setPage(1); } },
                { label: city, onClear: () => { setCity(''); setPage(1); } },
                { label: eventType, onClear: () => { setEventType(''); setPage(1); } },
              ].filter(f => f.label).map((f) => (
                <span key={f.label} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full badge-nocturne text-xs font-medium text-nocturne-text-primary transition-colors animate-fade-in-up">
                  <span className="inline-block w-2 h-2 rounded-full bg-nocturne-accent"></span>
                  {f.label}
                  <button onClick={f.onClear} className="hover:text-nocturne-accent transition-colors">
                    <span className="text-sm font-bold">&times;</span>
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-xs text-nocturne-text-secondary font-medium hidden sm:block">Sort by:</label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="text-sm glass-card border border-nocturne-border rounded-lg px-3 py-2 text-nocturne-text-secondary focus:outline-none focus:border-nocturne-border-strong focus:ring-1 focus:ring-nocturne-accent/20 transition-all"
            >
              <option value="relevance">Most Relevant</option>
              <option value="trust_score">Highest Rated</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Enhanced Desktop Sidebar */}
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

          {/* Results Section */}
          <main className="flex-1">
            {/* Results Count Header */}
            {!loading && results.length > 0 && (
              <div className="mb-6 p-4 glass-panel rounded-xl animate-fade-in-up">
                <p className="text-sm text-nocturne-text-primary font-medium">
                  Showing <span className="text-nocturne-accent">{startResult} - {endResult}</span> of <span className="text-nocturne-accent">{total}</span> artist{total !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* Loading State - Skeleton Cards */}
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                    <SkeletonCard />
                  </div>
                ))}
              </div>
            ) : error ? (
              /* Error State */
              <div className="text-center py-20 animate-fade-in-up">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 mb-4">
                  <Search size={32} className="text-red-400 opacity-70" />
                </div>
                <h3 className="text-xl font-display text-nocturne-text-primary mb-2">Something went wrong</h3>
                <p className="text-sm text-nocturne-text-secondary mb-6 max-w-sm mx-auto">
                  {error}
                </p>
                <button
                  onClick={doSearch}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-accent text-white text-sm font-semibold rounded-lg hover-glow transition-all"
                >
                  Try again
                </button>
              </div>
            ) : results.length === 0 ? (
              /* Empty State */
              <div className="text-center py-20 animate-fade-in-up">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass-panel border border-nocturne-border mb-4">
                  <Search size={32} className="text-nocturne-text-secondary opacity-50" />
                </div>
                <h3 className="text-xl font-display text-nocturne-text-primary mb-2">No artists found</h3>
                <p className="text-sm text-nocturne-text-secondary mb-6 max-w-sm mx-auto">
                  Try adjusting your search terms or filters to discover more talented performers
                </p>
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-accent text-white text-sm font-semibold rounded-lg hover-glow transition-all"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                {/* Results Grid */}
                <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4 mb-8">
                  {results.map((artist, i) => (
                    <div
                      key={artist.id}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <ArtistCard {...artist} />
                    </div>
                  ))}
                </div>

                {/* Enhanced Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-1 mt-12 py-8 border-t border-nocturne-border">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="flex items-center justify-center w-10 h-10 rounded-lg glass-card border border-nocturne-border text-nocturne-text-secondary disabled:opacity-30 hover:border-nocturne-accent hover:text-nocturne-text-primary transition-all"
                      title="Previous page"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <div className="flex items-center gap-0.5 px-4">
                      {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => {
                        let pageNum = idx + 1;
                        if (totalPages > 5) {
                          if (page <= 3) {
                            pageNum = idx + 1;
                          } else if (page >= totalPages - 2) {
                            pageNum = totalPages - 4 + idx;
                          } else {
                            pageNum = page - 2 + idx;
                          }
                        }

                        if (pageNum < 1 || pageNum > totalPages) return null;

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`w-10 h-10 rounded-lg font-medium text-sm transition-all ${
                              page === pageNum
                                ? 'bg-gradient-accent text-white hover-glow'
                                : 'glass-card border border-nocturne-border text-nocturne-text-secondary hover:border-nocturne-accent hover:text-nocturne-text-primary'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="flex items-center justify-center w-10 h-10 rounded-lg glass-card border border-nocturne-border text-nocturne-text-secondary disabled:opacity-30 hover:border-nocturne-accent hover:text-nocturne-text-primary transition-all"
                      title="Next page"
                    >
                      <ChevronRight size={16} />
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
