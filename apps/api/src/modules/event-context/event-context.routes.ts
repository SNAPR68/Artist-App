import type { FastifyInstance } from 'fastify';
import { eventContextService } from './event-context.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { submitEventContextSchema } from '@artist-booking/shared';

export async function eventContextRoutes(app: FastifyInstance) {
  /**
   * POST /v1/bookings/:id/event-context — Submit post-event context data
   */
  app.post('/v1/bookings/:id/event-context', {
    preHandler: [authMiddleware, requirePermission('event_context:create')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = submitEventContextSchema.parse(request.body);
    const result = await eventContextService.submitEventContext(id, request.user!.user_id, data);

    return reply.status(201).send({ success: true, data: result, errors: [] });
  });

  /**
   * GET /v1/bookings/:id/event-context — Get event context for a booking
   */
  app.get('/v1/bookings/:id/event-context', {
    preHandler: [authMiddleware, requirePermission('event_context:read')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await eventContextService.getEventContext(id, request.user!.user_id);

    return reply.send({ success: true, data: result, errors: [] });
  });

  /**
   * GET /v1/analytics/event-context — Aggregated event context stats (admin)
   */
  app.get('/v1/analytics/event-context', {
    preHandler: [authMiddleware, requirePermission('analytics:read')],
  }, async (request, reply) => {
    const { city, genre, event_type } = request.query as { city?: string; genre?: string; event_type?: string };
    const result = await eventContextService.getAggregatedStats({ city, genre, event_type });

    return reply.send({ success: true, data: result, errors: [] });
  });
}
