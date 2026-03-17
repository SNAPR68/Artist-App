import type { FastifyInstance } from 'fastify';
import { eventDayService } from './event-day.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { recordArrivalSchema, flagIssueSchema } from '@artist-booking/shared';

export async function eventDayRoutes(app: FastifyInstance) {
  /**
   * GET /v1/bookings/:id/event-day — Get event day log
   */
  app.get('/v1/bookings/:id/event-day', {
    preHandler: [authMiddleware, requirePermission('event_day:manage')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const log = await eventDayService.getEventDayLog(id, request.user!.user_id);

    return reply.send({ success: true, data: log, errors: [] });
  });

  /**
   * POST /v1/bookings/:id/event-day/arrival — Record GPS arrival
   */
  app.post('/v1/bookings/:id/event-day/arrival', {
    preHandler: [authMiddleware, requirePermission('event_day:manage')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = recordArrivalSchema.parse(request.body);
    const updated = await eventDayService.recordArrival(id, request.user!.user_id, data.lat, data.lng);

    return reply.send({ success: true, data: updated, errors: [] });
  });

  /**
   * POST /v1/bookings/:id/event-day/soundcheck — Confirm soundcheck
   */
  app.post('/v1/bookings/:id/event-day/soundcheck', {
    preHandler: [authMiddleware, requirePermission('event_day:manage')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updated = await eventDayService.confirmSoundcheck(id, request.user!.user_id);

    return reply.send({ success: true, data: updated, errors: [] });
  });

  /**
   * POST /v1/bookings/:id/event-day/set-start — Record set start
   */
  app.post('/v1/bookings/:id/event-day/set-start', {
    preHandler: [authMiddleware, requirePermission('event_day:manage')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updated = await eventDayService.startSet(id, request.user!.user_id);

    return reply.send({ success: true, data: updated, errors: [] });
  });

  /**
   * POST /v1/bookings/:id/event-day/set-end — Record set end
   */
  app.post('/v1/bookings/:id/event-day/set-end', {
    preHandler: [authMiddleware, requirePermission('event_day:manage')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updated = await eventDayService.endSet(id, request.user!.user_id);

    return reply.send({ success: true, data: updated, errors: [] });
  });

  /**
   * POST /v1/bookings/:id/event-day/issue — Flag an issue
   */
  app.post('/v1/bookings/:id/event-day/issue', {
    preHandler: [authMiddleware, requirePermission('event_day:manage')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = flagIssueSchema.parse(request.body);
    const updated = await eventDayService.flagIssue(id, request.user!.user_id, data.type, data.description);

    return reply.send({ success: true, data: updated, errors: [] });
  });

  /**
   * POST /v1/bookings/:id/event-day/complete — Confirm event completion
   */
  app.post('/v1/bookings/:id/event-day/complete', {
    preHandler: [authMiddleware, requirePermission('event_day:manage')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updated = await eventDayService.confirmCompletion(id, request.user!.user_id);

    return reply.send({ success: true, data: updated, errors: [] });
  });
}
