import type { FastifyInstance } from 'fastify';
import { searchService } from './search.service.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import { PAGINATION } from '@artist-booking/shared';

export async function searchRoutes(app: FastifyInstance) {
  /**
   * GET /v1/search/artists — Search artists with filters
   */
  app.get('/v1/search/artists', {
    preHandler: [rateLimit('SEARCH')],
  }, async (request, reply) => {
    const query = request.query as Record<string, string>;

    const page = Math.max(1, parseInt(query.page ?? '1'));
    const per_page = Math.min(PAGINATION.MAX_PER_PAGE, Math.max(1, parseInt(query.per_page ?? '20')));

    const result = await searchService.searchArtists({
      q: query.q,
      genre: query.genre,
      city: query.city,
      event_type: query.event_type,
      date: query.date,
      budget_min: query.budget_min ? parseInt(query.budget_min) : undefined,
      budget_max: query.budget_max ? parseInt(query.budget_max) : undefined,
      distance_km: query.distance_km ? parseInt(query.distance_km) : undefined,
      lat: query.lat ? parseFloat(query.lat) : undefined,
      lng: query.lng ? parseFloat(query.lng) : undefined,
      sort_by: (query.sort_by as 'relevance' | 'trust_score' | 'price_low' | 'price_high' | 'newest') ?? 'relevance',
      page,
      per_page,
    });

    return reply
      .header('Cache-Control', 'public, max-age=120, s-maxage=120')
      .send({
        success: true,
        data: result.data,
        meta: {
          page,
          per_page,
          total: result.total,
          total_pages: Math.ceil(result.total / per_page),
        },
        facets: result.facets,
        errors: [],
      });
  });
}
