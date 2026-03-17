import type { FastifyInstance } from 'fastify';
import { riderService } from './rider.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { createRiderSchema, addRiderLineItemSchema, updateRiderLineItemSchema, updateRiderCheckSchema } from '@artist-booking/shared';

export async function riderRoutes(app: FastifyInstance) {
  /**
   * POST /v1/artists/me/rider — Create or update rider
   */
  app.post('/v1/artists/me/rider', {
    preHandler: [authMiddleware, requirePermission('rider:manage')],
  }, async (request, reply) => {
    const data = createRiderSchema.parse(request.body);
    const rider = await riderService.createOrUpdateRider(request.user!.user_id, data);

    return reply.status(201).send({ success: true, data: rider, errors: [] });
  });

  /**
   * GET /v1/artists/:id/rider — Get artist's rider
   */
  app.get('/v1/artists/:id/rider', {
    preHandler: [authMiddleware, requirePermission('rider:read')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const rider = await riderService.getRider(id);

    return reply.send({ success: true, data: rider, errors: [] });
  });

  /**
   * POST /v1/artists/me/rider/items — Add a line item
   */
  app.post('/v1/artists/me/rider/items', {
    preHandler: [authMiddleware, requirePermission('rider:manage')],
  }, async (request, reply) => {
    const data = addRiderLineItemSchema.parse(request.body);
    const item = await riderService.addLineItem(request.user!.user_id, data);

    return reply.status(201).send({ success: true, data: item, errors: [] });
  });

  /**
   * PUT /v1/artists/me/rider/items/:itemId — Update a line item
   */
  app.put('/v1/artists/me/rider/items/:itemId', {
    preHandler: [authMiddleware, requirePermission('rider:manage')],
  }, async (request, reply) => {
    const { itemId } = request.params as { itemId: string };
    const data = updateRiderLineItemSchema.parse(request.body);
    const item = await riderService.updateLineItem(request.user!.user_id, itemId, data);

    return reply.send({ success: true, data: item, errors: [] });
  });

  /**
   * DELETE /v1/artists/me/rider/items/:itemId — Remove a line item
   */
  app.delete('/v1/artists/me/rider/items/:itemId', {
    preHandler: [authMiddleware, requirePermission('rider:manage')],
  }, async (request, reply) => {
    const { itemId } = request.params as { itemId: string };
    await riderService.removeLineItem(request.user!.user_id, itemId);

    return reply.send({ success: true, data: { deleted: true }, errors: [] });
  });

  /**
   * POST /v1/bookings/:id/rider-check — Generate rider vs venue check
   */
  app.post('/v1/bookings/:id/rider-check', {
    preHandler: [authMiddleware, requirePermission('rider:check')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const checks = await riderService.generateBookingRiderCheck(id);

    return reply.status(201).send({ success: true, data: checks, errors: [] });
  });

  /**
   * GET /v1/bookings/:id/rider-check — Get rider check results + gap report
   */
  app.get('/v1/bookings/:id/rider-check', {
    preHandler: [authMiddleware, requirePermission('rider:read')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const checks = await riderService.getRiderCheck(id);
    const gap = await riderService.getRiderGapReport(id);

    return reply.send({ success: true, data: { checks, gap_report: gap }, errors: [] });
  });

  /**
   * PUT /v1/bookings/:id/rider-check/:checkId — Update fulfillment status
   */
  app.put('/v1/bookings/:id/rider-check/:checkId', {
    preHandler: [authMiddleware, requirePermission('rider:check')],
  }, async (request, reply) => {
    const { checkId } = request.params as { checkId: string };
    const data = updateRiderCheckSchema.parse(request.body);
    const updated = await riderService.updateRiderCheck(checkId, request.user!.user_id, data);

    return reply.send({ success: true, data: updated, errors: [] });
  });
}
