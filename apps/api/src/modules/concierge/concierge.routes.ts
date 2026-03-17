import type { FastifyInstance } from 'fastify';
import { conciergeService } from './concierge.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';

export async function conciergeRoutes(app: FastifyInstance) {
  /**
   * POST /v1/concierge/search — Search artists on behalf of a client
   */
  app.post('/v1/concierge/search', {
    preHandler: [authMiddleware, requirePermission('concierge:manage'), rateLimit('SEARCH')],
  }, async (request, reply) => {
    const params = request.body as Record<string, unknown>;
    const artists = await conciergeService.searchOnBehalf(params);

    return reply.send({
      success: true,
      data: artists,
      errors: [],
    });
  });

  /**
   * POST /v1/concierge/bookings — Create booking on behalf of client
   */
  app.post('/v1/concierge/bookings', {
    preHandler: [authMiddleware, requirePermission('concierge:manage'), rateLimit('WRITE')],
  }, async (request, reply) => {
    const { client_user_id, ...bookingData } = request.body as { client_user_id: string } & Record<string, unknown>;

    const booking = await conciergeService.createBookingOnBehalf(
      request.user!.user_id,
      client_user_id,
      bookingData as never,
    );

    return reply.status(201).send({
      success: true,
      data: booking,
      errors: [],
    });
  });

  /**
   * GET /v1/concierge/clients/:id/pipeline — Client booking pipeline
   */
  app.get('/v1/concierge/clients/:id/pipeline', {
    preHandler: [authMiddleware, requirePermission('concierge:manage')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const pipeline = await conciergeService.getClientPipeline(id);

    return reply.send({
      success: true,
      data: pipeline,
      errors: [],
    });
  });

  /**
   * GET /v1/concierge/stats — Dashboard stats
   */
  app.get('/v1/concierge/stats', {
    preHandler: [authMiddleware, requirePermission('concierge:manage')],
  }, async (request, reply) => {
    const stats = await conciergeService.getStats();

    return reply.send({
      success: true,
      data: stats,
      errors: [],
    });
  });
}
