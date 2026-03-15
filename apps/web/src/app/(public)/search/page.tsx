'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { ArtistCard } from '../../../components/search/ArtistCard';
import Link from 'next/link';

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
  pricing?: Array<{ min_price: number; max_price: number }>;
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
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>}>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary-500">ArtistBooking</Link>
          <Link href="/login" className="text-sm text-primary-500 hover:text-primary-600">Login</Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search artists, bands, DJs..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm font-medium"
            >
              Search
            </button>
          </div>
        </form>

        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <aside className="w-56 shrink-0 hidden desktop:block">
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4 sticky top-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">Filters</h3>
                {(genre || city || eventType) && (
                  <button onClick={clearFilters} className="text-xs text-primary-500 hover:text-primary-600">
                    Clear all
                  </button>
                )}
              </div>

              {/* Genre */}
              {facets?.genres && facets.genres.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Genre</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {facets.genres.map((f) => (
                      <button
                        key={f.value}
                        onClick={() => { setGenre(genre === f.value ? '' : f.value); setPage(1); }}
                        className={`block w-full text-left text-sm px-2 py-1 rounded ${
                          genre === f.value ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {f.value} <span className="text-gray-400">({f.count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* City */}
              {facets?.cities && facets.cities.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">City</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {facets.cities.map((f) => (
                      <button
                        key={f.value}
                        onClick={() => { setCity(city === f.value ? '' : f.value); setPage(1); }}
                        className={`block w-full text-left text-sm px-2 py-1 rounded ${
                          city === f.value ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {f.value} <span className="text-gray-400">({f.count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Event Type */}
              {facets?.event_types && facets.event_types.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Event Type</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {facets.event_types.map((f) => (
                      <button
                        key={f.value}
                        onClick={() => { setEventType(eventType === f.value ? '' : f.value); setPage(1); }}
                        className={`block w-full text-left text-sm px-2 py-1 rounded ${
                          eventType === f.value ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {f.value} <span className="text-gray-400">({f.count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Results */}
          <main className="flex-1">
            {/* Results header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                {loading ? 'Searching...' : `${total} artist${total !== 1 ? 's' : ''} found`}
              </p>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
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
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-xl text-gray-400 mb-2">No artists found</p>
                <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-4">
                  {results.map((artist) => (
                    <ArtistCard key={artist.id} {...artist} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50"
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
    </div>
  );
}
