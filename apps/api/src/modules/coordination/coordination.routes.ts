import type { FastifyInstance } from 'fastify';
import { coordinationService } from './coordination.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { confirmCheckpointSchema, updateLogisticsSchema } from '@artist-booking/shared';

export async function coordinationRoutes(app: FastifyInstance) {
  /**
   * GET /v1/bookings/:id/coordination — Get coordination checklist with deadlines
   */
  app.get('/v1/bookings/:id/coordination', {
    preHandler: [authMiddleware, requirePermission('coordination:read')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const checklist = await coordinationService.getChecklist(id, request.user!.user_id);

    return reply.send({
      success: true,
      data: checklist,
      errors: [],
    });
  });

  /**
   * POST /v1/bookings/:id/coordination/confirm — Confirm a checkpoint
   */
  app.post('/v1/bookings/:id/coordination/confirm', {
    preHandler: [authMiddleware, requirePermission('coordination:update')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = confirmCheckpointSchema.parse(request.body);
    const updated = await coordinationService.confirmCheckpoint(id, request.user!.user_id, data.checkpoint);

    return reply.send({
      success: true,
      data: updated,
      errors: [],
    });
  });

  /**
   * PUT /v1/bookings/:id/coordination/logistics — Update logistics details
   */
  app.put('/v1/bookings/:id/coordination/logistics', {
    preHandler: [authMiddleware, requirePermission('coordination:update')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateLogisticsSchema.parse(request.body);
    const updated = await coordinationService.updateLogistics(id, request.user!.user_id, data);

    return reply.send({
      success: true,
      data: updated,
      errors: [],
    });
  });
}
