import type { FastifyInstance } from 'fastify';
import { calendarService } from './calendar.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validateBody } from '../../middleware/validation.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import { updateCalendarSchema } from '@artist-booking/shared';

export async function calendarRoutes(app: FastifyInstance) {
  /**
   * GET /v1/calendar — Get own availability (authenticated artist)
   */
  app.get('/v1/calendar', {
    preHandler: [authMiddleware, requirePermission('calendar:read_own')],
  }, async (request, reply) => {
    const query = request.query as { start_date: string; end_date: string };

    // Default to current month if not provided
    const now = new Date();
    const startDate = query.start_date ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = query.end_date ?? new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    // Look up artist by user ID
    const { artistRepository } = await import('../artist/artist.repository.js');
    const artist = await artistRepository.findByUserId(request.user!.user_id);
    if (!artist) {
      return reply.status(404).send({ success: false, data: null, errors: [{ code: 'PROFILE_NOT_FOUND', message: 'Artist profile not found' }] });
    }

    const entries = await calendarService.getAvailability(artist.id, startDate, endDate);

    return reply.send({
      success: true,
      data: entries,
      errors: [],
    });
  });

  /**
   * PUT /v1/calendar — Update availability dates
   */
  app.put('/v1/calendar', {
    preHandler: [
      authMiddleware,
      requirePermission('calendar:update_own'),
      rateLimit('WRITE'),
      validateBody(updateCalendarSchema),
    ],
  }, async (request, reply) => {
    const { dates } = request.body as { dates: { date: string; status: 'available' | 'held' | 'booked'; notes?: string }[] };
    const result = await calendarService.updateAvailability(request.user!.user_id, dates);

    return reply.send({
      success: true,
      data: result,
      errors: [],
    });
  });

  /**
   * GET /v1/artists/:id/availability — Public availability view
   */
  app.get('/v1/artists/:id/availability', {
    preHandler: [rateLimit('READ')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as { start_date?: string; end_date?: string };

    const now = new Date();
    const startDate = query.start_date ?? now.toISOString().split('T')[0];
    const endDate = query.end_date ?? new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString().split('T')[0];

    const entries = await calendarService.getPublicAvailability(id, startDate, endDate);

    return reply.send({
      success: true,
      data: entries,
      errors: [],
    });
  });
}
