interface SearchParams {
  q?: string;
  genre?: string;
  city?: string;
  event_type?: string;
  date?: string;
  budget_min?: number;
  budget_max?: number;
  distance_km?: number;
  lat?: number;
  lng?: number;
  sort_by?: 'relevance' | 'trust_score' | 'price_low' | 'price_high' | 'newest';
  page: number;
  per_page: number;
}

export function buildSearchQuery(params: SearchParams) {
  const must: unknown[] = [];
  const filter: unknown[] = [];

  // Full text search
  if (params.q) {
    must.push({
      multi_match: {
        query: params.q,
        fields: ['stage_name^3', 'bio', 'genres^2', 'base_city'],
        type: 'best_fields',
        fuzziness: 'AUTO',
      },
    });
  }

  // Genre filter
  if (params.genre) {
    filter.push({ term: { genres: params.genre } });
  }

  // City filter
  if (params.city) {
    filter.push({
      match: { 'base_city': { query: params.city, fuzziness: 'AUTO' } },
    });
  }

  // Event type filter
  if (params.event_type) {
    filter.push({ term: { event_types: params.event_type } });
  }

  // Budget range filter (nested pricing)
  if (params.budget_min !== undefined || params.budget_max !== undefined) {
    const rangeFilter: Record<string, unknown> = {};
    if (params.budget_min !== undefined) {
      rangeFilter['pricing.min_price'] = { lte: params.budget_max ?? params.budget_min * 10 };
    }
    if (params.budget_max !== undefined) {
      rangeFilter['pricing.max_price'] = { gte: params.budget_min ?? 0 };
    }

    filter.push({
      nested: {
        path: 'pricing',
        query: {
          bool: {
            must: Object.entries(rangeFilter).map(([field, cond]) => ({
              range: { [field]: cond },
            })),
          },
        },
      },
    });
  }

  // Geo-distance filter
  if (params.lat !== undefined && params.lng !== undefined && params.distance_km) {
    filter.push({
      geo_distance: {
        distance: `${params.distance_km}km`,
        location: { lat: params.lat, lon: params.lng },
      },
    });
  }

  // Only show profiles with minimum completion
  filter.push({ range: { profile_completion_pct: { gte: 50 } } });

  // Build sort
  const sort = buildSort(params.sort_by, params.q);

  const query: Record<string, unknown> = {
    bool: {
      must: must.length > 0 ? must : [{ match_all: {} }],
      filter,
    },
  };

  return {
    query,
    sort,
    from: (params.page - 1) * params.per_page,
    size: params.per_page,
    aggs: {
      genres: { terms: { field: 'genres', size: 20 } },
      cities: { terms: { field: 'base_city.keyword', size: 20 } },
      event_types: { terms: { field: 'event_types', size: 15 } },
      price_stats: {
        nested: { path: 'pricing' },
        aggs: {
          min_price: { min: { field: 'pricing.min_price' } },
          max_price: { max: { field: 'pricing.max_price' } },
        },
      },
    },
  };
}

function buildSort(sortBy?: string, hasQuery?: string): unknown[] {
  switch (sortBy) {
    case 'trust_score':
      return [{ trust_score: 'desc' }, '_score'];
    case 'price_low':
      return [{ 'pricing.min_price': { order: 'asc', nested: { path: 'pricing' } } }];
    case 'price_high':
      return [{ 'pricing.max_price': { order: 'desc', nested: { path: 'pricing' } } }];
    case 'newest':
      return [{ created_at: 'desc' }];
    case 'relevance':
    default:
      // Composite ranking: ES relevance + trust_score + completion
      if (hasQuery) {
        return [
          '_score',
          { trust_score: 'desc' },
        ];
      }
      return [
        { trust_score: 'desc' },
        { total_bookings: 'desc' },
      ];
  }
}
