import type { FastifyInstance } from 'fastify';
import { pricingBrainService } from './pricing-brain.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { pricingBrainQuerySchema } from '@artist-booking/shared';

export async function pricingBrainRoutes(app: FastifyInstance) {
  /**
   * GET /v1/artists/me/pricing-brain — Artist's pricing dashboard
   */
  app.get('/v1/artists/me/pricing-brain', {
    preHandler: [authMiddleware, requirePermission('pricing_brain:read')],
  }, async (request, reply) => {
    const dashboard = await pricingBrainService.getArtistDashboard(request.user!.user_id);
    if (!dashboard) {
      return reply.status(404).send({ success: false, data: null, errors: [{ code: 'NOT_FOUND', message: 'Artist profile not found' }] });
    }

    return reply.send({ success: true, data: dashboard, errors: [] });
  });

  /**
   * GET /v1/artists/me/pricing-brain/position — Market position details
   */
  app.get('/v1/artists/me/pricing-brain/position', {
    preHandler: [authMiddleware, requirePermission('pricing_brain:read')],
  }, async (request, reply) => {
    const filters = pricingBrainQuerySchema.parse(request.query);
    const positions = await pricingBrainService.getPositionDetails(request.user!.user_id, filters);

    return reply.send({ success: true, data: positions, errors: [] });
  });

  /**
   * GET /v1/artists/me/pricing-brain/recommendations — Active recommendations
   */
  app.get('/v1/artists/me/pricing-brain/recommendations', {
    preHandler: [authMiddleware, requirePermission('pricing_brain:read')],
  }, async (request, reply) => {
    const recommendations = await pricingBrainService.getRecommendations(request.user!.user_id);

    return reply.send({ success: true, data: recommendations, errors: [] });
  });

  /**
   * PUT /v1/artists/me/pricing-brain/recommendations/:id/dismiss — Dismiss recommendation
   */
  app.put('/v1/artists/me/pricing-brain/recommendations/:id/dismiss', {
    preHandler: [authMiddleware, requirePermission('pricing_brain:read')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updated = await pricingBrainService.dismissRecommendation(request.user!.user_id, id);

    return reply.send({ success: true, data: updated, errors: [] });
  });

  /**
   * GET /v1/analytics/pricing-brain/:artistId — Admin: view any artist's pricing brain
   */
  app.get('/v1/analytics/pricing-brain/:artistId', {
    preHandler: [authMiddleware, requirePermission('analytics:read')],
  }, async (request, reply) => {
    const { artistId } = request.params as { artistId: string };
    const { pricingBrainRepository } = await import('./pricing-brain.repository.js');

    const positions = await pricingBrainRepository.getPositions(artistId);
    const recommendations = await pricingBrainRepository.getActiveRecommendations(artistId);

    return reply.send({ success: true, data: { positions, recommendations }, errors: [] });
  });
}
