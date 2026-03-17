import { opensearch, ARTIST_INDEX } from './search.index.js';
import { buildSearchQuery } from './query-builder.js';
import { redis } from '../../infrastructure/redis.js';
import { db } from '../../infrastructure/database.js';

const SEARCH_CACHE_TTL = 120; // 2 minutes

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

export class SearchService {
  async searchArtists(params: SearchParams) {
    // Check cache
    const cacheKey = `search:${JSON.stringify(params)}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    let result: {
      data: Record<string, unknown>[];
      total: number;
      facets: {
        genres: { value: string; count: number }[];
        cities: { value: string; count: number }[];
        event_types: { value: string; count: number }[];
        price_range: { min: number; max: number };
      };
    };

    try {
      const body = buildSearchQuery(params);

      const response = await opensearch.search({
        index: ARTIST_INDEX,
        body,
      });

      const hits = response.body.hits;
      const aggs = response.body.aggregations;

      result = {
        data: hits.hits.map((hit: { _source: Record<string, unknown>; _score: number }) => ({
          ...hit._source,
          _score: hit._score,
        })),
        total: typeof hits.total === 'object' ? hits.total.value : hits.total,
        facets: {
          genres: extractBuckets(aggs?.genres),
          cities: extractBuckets(aggs?.cities),
          event_types: extractBuckets(aggs?.event_types),
          price_range: {
            min: aggs?.price_stats?.min_price?.value ?? 0,
            max: aggs?.price_stats?.max_price?.value ?? 0,
          },
        },
      };
    } catch (err) {
      console.warn('[SearchService] OpenSearch unavailable, falling back to Postgres:', (err as Error).message);
      result = await this.searchArtistsPostgres(params);
    }

    // Cache result
    await redis.set(cacheKey, JSON.stringify(result), 'EX', SEARCH_CACHE_TTL);

    return result;
  }

  private async searchArtistsPostgres(params: SearchParams) {
    const { q, genre, city, event_type, budget_min, budget_max, sort_by, page, per_page } = params;

    let query = db('artist_profiles as ap')
      .join('users as u', 'u.id', 'ap.user_id')
      .where({ 'u.is_active': true, 'ap.deleted_at': null });

    if (q) {
      query = query.where(function() {
        this.whereILike('ap.stage_name', `%${q}%`)
          .orWhereILike('ap.bio', `%${q}%`);
      });
    }

    if (genre) {
      query = query.whereRaw('LOWER(?) = ANY(SELECT LOWER(unnest(ap.genres)))', [genre]);
    }

    if (city) {
      query = query.whereILike('ap.base_city', `%${city}%`);
    }

    if (event_type) {
      query = query.whereRaw('LOWER(?) = ANY(SELECT LOWER(unnest(ap.event_types)))', [event_type]);
    }

    if (budget_min !== undefined) {
      query = query.whereRaw("(ap.pricing->>'base_price')::numeric >= ?", [budget_min]);
    }

    if (budget_max !== undefined) {
      query = query.whereRaw("(ap.pricing->>'base_price')::numeric <= ?", [budget_max]);
    }

    // Count query (clone before adding sort/pagination)
    const countQuery = query.clone().clearSelect().clearOrder().count('ap.id as count').first();

    // Sort
    switch (sort_by) {
      case 'trust_score':
        query = query.orderBy('ap.trust_score', 'desc');
        break;
      case 'price_low':
        query = query.orderByRaw("(ap.pricing->>'base_price')::numeric ASC NULLS LAST");
        break;
      case 'price_high':
        query = query.orderByRaw("(ap.pricing->>'base_price')::numeric DESC NULLS LAST");
        break;
      case 'newest':
        query = query.orderBy('ap.created_at', 'desc');
        break;
      default:
        query = query.orderBy('ap.trust_score', 'desc');
    }

    const offset = (page - 1) * per_page;
    const artists = await query
      .select('ap.*')
      .offset(offset)
      .limit(per_page);

    const countResult = await countQuery;
    const total = Number((countResult as any)?.count ?? 0);

    // Fetch first thumbnail for each artist
    const artistIds = artists.map((a: any) => a.id);
    const thumbnails = artistIds.length > 0
      ? await db('media_items')
          .whereIn('artist_id', artistIds)
          .where({ deleted_at: null })
          .orderBy('sort_order', 'asc')
          .select('artist_id', 'thumbnail_url', 'original_url')
          .groupBy('artist_id', 'thumbnail_url', 'original_url', 'sort_order')
      : [];
    const thumbMap = new Map(thumbnails.map((t: any) => [t.artist_id, t.thumbnail_url ?? t.original_url]));

    // Compute facets from DB
    const genreFacets = await db.raw(`
      SELECT genre, count(*) as count FROM (
        SELECT unnest(ap.genres) as genre
        FROM artist_profiles ap
        JOIN users u ON u.id = ap.user_id
        WHERE u.is_active = true AND ap.deleted_at IS NULL
      ) sub
      GROUP BY genre
      ORDER BY count(*) DESC
      LIMIT 20
    `).then((r: any) => r.rows);

    const cityFacets = await db('artist_profiles as ap')
      .join('users as u', 'u.id', 'ap.user_id')
      .where({ 'u.is_active': true, 'ap.deleted_at': null })
      .whereNotNull('ap.base_city')
      .groupBy('ap.base_city')
      .orderByRaw('count(*) desc')
      .limit(20)
      .select('ap.base_city as city', db.raw('count(*) as count'));

    const eventTypeFacets = await db.raw(`
      SELECT event_type, count(*) as count FROM (
        SELECT unnest(ap.event_types) as event_type
        FROM artist_profiles ap
        JOIN users u ON u.id = ap.user_id
        WHERE u.is_active = true AND ap.deleted_at IS NULL
      ) sub
      GROUP BY event_type
      ORDER BY count(*) DESC
      LIMIT 20
    `).then((r: any) => r.rows);

    const [priceRange] = await db('artist_profiles as ap')
      .join('users as u', 'u.id', 'ap.user_id')
      .where({ 'u.is_active': true, 'ap.deleted_at': null })
      .select(
        db.raw("COALESCE(MIN((ap.pricing->>'base_price')::numeric), 0) as min_price"),
        db.raw("COALESCE(MAX((ap.pricing->>'base_price')::numeric), 0) as max_price"),
      );

    return {
      data: artists.map((a: any) => ({
        ...a,
        thumbnail_url: thumbMap.get(a.id) ?? null,
        _score: a.trust_score ?? 0,
      })),
      total,
      facets: {
        genres: genreFacets.map((r: any) => ({ value: r.genre, count: Number(r.count) })),
        cities: cityFacets.map((r: any) => ({ value: r.city, count: Number(r.count) })),
        event_types: eventTypeFacets.map((r: any) => ({ value: r.event_type, count: Number(r.count) })),
        price_range: { min: Number(priceRange?.min_price ?? 0), max: Number(priceRange?.max_price ?? 0) },
      },
    };
  }
}

function extractBuckets(agg: { buckets?: Array<{ key: string; doc_count: number }> } | undefined) {
  if (!agg?.buckets) return [];
  return agg.buckets.map((b) => ({ value: b.key, count: b.doc_count }));
}

export const searchService = new SearchService();
