import type { FastifyInstance } from 'fastify';
import { dynamicPricingService } from './dynamic-pricing.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import {
  createPriceRuleSchema,
  updatePriceRuleSchema,
  dynamicPriceQuerySchema,
  surgeIndicatorQuerySchema,
} from '@artist-booking/shared';

export async function dynamicPricingRoutes(app: FastifyInstance) {
  /**
   * GET /v1/artists/me/price-rules — List artist's price rules (active + inactive)
   */
  app.get('/v1/artists/me/price-rules', {
    preHandler: [authMiddleware, requirePermission('dynamic_pricing:read')],
  }, async (request, reply) => {
    const rules = await dynamicPricingService.getArtistRules(request.user!.user_id);
    return reply.send({ success: true, data: rules, errors: [] });
  });

  /**
   * POST /v1/artists/me/price-rules — Create a new price rule
   */
  app.post('/v1/artists/me/price-rules', {
    preHandler: [authMiddleware, requirePermission('dynamic_pricing:manage_rules')],
  }, async (request, reply) => {
    const data = createPriceRuleSchema.parse(request.body);
    const rule = await dynamicPricingService.createRule(request.user!.user_id, data);
    return reply.status(201).send({ success: true, data: rule, errors: [] });
  });

  /**
   * PUT /v1/artists/me/price-rules/:id — Update a price rule
   */
  app.put('/v1/artists/me/price-rules/:id', {
    preHandler: [authMiddleware, requirePermission('dynamic_pricing:manage_rules')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updatePriceRuleSchema.parse(request.body);

    try {
      const rule = await dynamicPricingService.updateRule(request.user!.user_id, id, data);
      return reply.send({ success: true, data: rule, errors: [] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update rule';
      return reply.status(404).send({
        success: false,
        data: null,
        errors: [{ code: 'NOT_FOUND', message }],
      });
    }
  });

  /**
   * DELETE /v1/artists/me/price-rules/:id — Delete a price rule
   */
  app.delete('/v1/artists/me/price-rules/:id', {
    preHandler: [authMiddleware, requirePermission('dynamic_pricing:manage_rules')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      await dynamicPricingService.deleteRule(request.user!.user_id, id);
      return reply.send({ success: true, data: { deleted: true }, errors: [] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete rule';
      return reply.status(404).send({
        success: false,
        data: null,
        errors: [{ code: 'NOT_FOUND', message }],
      });
    }
  });

  /**
   * GET /v1/artists/me/price-elasticity — Elasticity report for the artist
   */
  app.get('/v1/artists/me/price-elasticity', {
    preHandler: [authMiddleware, requirePermission('dynamic_pricing:read')],
  }, async (request, reply) => {
    const profile = await (await import('../../infrastructure/database.js')).db('artist_profiles')
      .where({ user_id: request.user!.user_id })
      .first();

    if (!profile) {
      return reply.status(404).send({
        success: false,
        data: null,
        errors: [{ code: 'NOT_FOUND', message: 'Artist profile not found' }],
      });
    }

    const report = await dynamicPricingService.computeElasticityReport(profile.id);
    return reply.send({ success: true, data: report, errors: [] });
  });

  /**
   * GET /v1/artists/me/dynamic-price — Get dynamic price for artist's own listing
   */
  app.get('/v1/artists/me/dynamic-price', {
    preHandler: [authMiddleware, requirePermission('dynamic_pricing:read')],
  }, async (request, reply) => {
    const query = dynamicPriceQuerySchema.parse(request.query);
    const profile = await (await import('../../infrastructure/database.js')).db('artist_profiles')
      .where({ user_id: request.user!.user_id })
      .first();

    if (!profile) {
      return reply.status(404).send({
        success: false,
        data: null,
        errors: [{ code: 'NOT_FOUND', message: 'Artist profile not found' }],
      });
    }

    const price = await dynamicPricingService.getDynamicPrice(
      profile.id,
      query.event_type,
      query.city,
      query.event_date,
    );
    return reply.send({ success: true, data: price, errors: [] });
  });

  /**
   * GET /v1/pricing/surge-indicator — Public surge indicator for city/date
   */
  app.get('/v1/pricing/surge-indicator', {
    preHandler: [authMiddleware, requirePermission('dynamic_pricing:surge_indicator')],
  }, async (request, reply) => {
    const query = surgeIndicatorQuerySchema.parse(request.query);
    const indicator = await dynamicPricingService.getSurgeIndicator(
      query.city,
      query.event_date,
      query.event_type,
    );
    return reply.send({ success: true, data: indicator, errors: [] });
  });

  /**
   * GET /v1/pricing/dynamic/:artistId — Get dynamic price for a specific artist
   */
  app.get('/v1/pricing/dynamic/:artistId', {
    preHandler: [authMiddleware, requirePermission('dynamic_pricing:surge_indicator')],
  }, async (request, reply) => {
    const { artistId } = request.params as { artistId: string };
    const query = dynamicPriceQuerySchema.parse(request.query);

    const price = await dynamicPricingService.getDynamicPrice(
      artistId,
      query.event_type,
      query.city,
      query.event_date,
    );
    return reply.send({ success: true, data: price, errors: [] });
  });
}
