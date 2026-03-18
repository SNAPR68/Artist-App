import type { FastifyInstance } from 'fastify';
import { recommendationService } from './recommendation.service.js';
import { recommendationRepository } from './recommendation.repository.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';

export async function recommendationRoutes(app: FastifyInstance) {
  /**
   * GET /v1/recommendations/for-me — Personalized recommendations for client
   */
  app.get('/v1/recommendations/for-me', {
    preHandler: [authMiddleware, requirePermission('recommendations:read_client'), rateLimit('READ')],
  }, async (request, reply) => {
    const query = request.query as Record<string, string>;

    const result = await recommendationService.getClientRecommendations(request.user!.user_id, {
      event_type: query.event_type,
      city: query.city,
      budget_min: query.budget_min ? parseInt(query.budget_min) : undefined,
      budget_max: query.budget_max ? parseInt(query.budget_max) : undefined,
      limit: query.limit ? parseInt(query.limit) : 10,
    });

    return reply.send({
      success: true,
      data: result,
      errors: [],
    });
  });

  /**
   * GET /v1/recommendations/similar/:artistId — Similar artist recommendations
   */
  app.get('/v1/recommendations/similar/:artistId', {
    preHandler: [authMiddleware, requirePermission('recommendations:read_client'), rateLimit('READ')],
  }, async (request, reply) => {
    const { artistId } = request.params as { artistId: string };
    const query = request.query as Record<string, string>;
    const limit = query.limit ? parseInt(query.limit) : 10;

    const recommendations = await recommendationRepository.getRecommendations({
      source_type: 'artist',
      source_id: artistId,
      recommendation_type: 'similar_artist',
      limit,
    });

    return reply.send({
      success: true,
      data: recommendations,
      errors: [],
    });
  });

  /**
   * GET /v1/recommendations/popular — Popular artists for event type/city
   */
  app.get('/v1/recommendations/popular', {
    preHandler: [authMiddleware, requirePermission('recommendations:read_client'), rateLimit('READ')],
  }, async (request, reply) => {
    const query = request.query as Record<string, string>;
    const limit = query.limit ? parseInt(query.limit) : 10;

    const recommendations = await recommendationRepository.getRecommendationsForClient(
      'popular_for_event',
      {
        event_type: query.event_type,
        city: query.city,
      },
      limit,
    );

    return reply.send({
      success: true,
      data: recommendations,
      errors: [],
    });
  });

  /**
   * GET /v1/recommendations/rising-stars — Rising star recommendations
   */
  app.get('/v1/recommendations/rising-stars', {
    preHandler: [authMiddleware, requirePermission('recommendations:read_client'), rateLimit('READ')],
  }, async (request, reply) => {
    const query = request.query as Record<string, string>;
    const limit = query.limit ? parseInt(query.limit) : 10;

    const recommendations = await recommendationRepository.getRecommendationsForClient(
      'rising_star',
      {
        event_type: query.event_type,
        city: query.city,
      },
      limit,
    );

    return reply.send({
      success: true,
      data: recommendations,
      errors: [],
    });
  });

  /**
   * GET /v1/artists/me/recommendations — Recommendations for the authenticated artist
   */
  app.get('/v1/artists/me/recommendations', {
    preHandler: [authMiddleware, requirePermission('recommendations:read_artist'), rateLimit('READ')],
  }, async (request, reply) => {
    const result = await recommendationService.getArtistRecommendations(request.user!.user_id);

    return reply.send({
      success: true,
      data: result,
      errors: [],
    });
  });

  /**
   * GET /v1/artists/me/recommendations/complementary — Complementary artists
   */
  app.get('/v1/artists/me/recommendations/complementary', {
    preHandler: [authMiddleware, requirePermission('recommendations:read_artist'), rateLimit('READ')],
  }, async (request, reply) => {
    const query = request.query as Record<string, string>;
    const limit = query.limit ? parseInt(query.limit) : 10;

    // Resolve artist from user
    const { db } = await import('../../infrastructure/database.js');
    const artist = await db('artist_profiles')
      .where({ user_id: request.user!.user_id, deleted_at: null })
      .first();

    if (!artist) {
      return reply.status(404).send({
        success: false,
        data: null,
        errors: [{ code: 'ARTIST_NOT_FOUND', message: 'Artist profile not found' }],
      });
    }

    const collaborativeArtists = await recommendationRepository.getCollaborativeArtists(artist.id, limit);

    return reply.send({
      success: true,
      data: collaborativeArtists,
      errors: [],
    });
  });

  /**
   * POST /v1/recommendations/:id/feedback — Record feedback on a recommendation
   */
  app.post('/v1/recommendations/:id/feedback', {
    preHandler: [authMiddleware, requirePermission('recommendations:feedback'), rateLimit('WRITE')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { feedback_type: string; metadata?: Record<string, unknown> };

    // Verify the recommendation exists
    const score = await recommendationRepository.getScoreById(id);
    if (!score) {
      return reply.status(404).send({
        success: false,
        data: null,
        errors: [{ code: 'NOT_FOUND', message: 'Recommendation not found' }],
      });
    }

    const feedback = await recommendationRepository.recordFeedback({
      recommendation_score_id: id,
      user_id: request.user!.user_id,
      feedback_type: body.feedback_type,
      metadata: body.metadata,
    });

    return reply.status(201).send({
      success: true,
      data: feedback,
      errors: [],
    });
  });
}
