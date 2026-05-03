import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { riderService } from './rider.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { createRiderSchema, addRiderLineItemSchema, updateRiderLineItemSchema, updateRiderCheckSchema } from '@artist-booking/shared';

// ── Phase 4: Rider sections + fulfilment validators ─────────────────────────
const jsonRecord = z.record(z.unknown());
const updateRiderSectionsSchema = z.object({
  sound: jsonRecord.optional(),
  backline: jsonRecord.optional(),
  stage_plot: jsonRecord.optional(),
  lighting: jsonRecord.optional(),
  power: jsonRecord.optional(),
  green_room: jsonRecord.optional(),
  hospitality_requirements: jsonRecord.optional(),
  travel_requirements: jsonRecord.optional(),
  stage_plot_url: z.string().url().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

const fulfillmentStatuses = ['not_checked', 'available', 'partial', 'unavailable', 'alternative_offered'] as const;
const updateFulfillmentSchema = z.object({
  assigned_vendor_id: z.string().uuid().nullable().optional(),
  fulfillment_status: z.enum(fulfillmentStatuses).optional(),
  alternative_offered: z.string().max(500).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

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

  // ── Phase 4: Structured rider sections (artist-facing) ──────────────────
  /**
   * PUT /v1/artists/me/rider/sections — Replace any subset of rider sections.
   * Body: { sound?, backline?, stage_plot?, lighting?, power?, green_room?,
   *         hospitality_requirements?, travel_requirements?, stage_plot_url?,
   *         notes? }
   */
  app.put('/v1/artists/me/rider/sections', {
    preHandler: [authMiddleware, requirePermission('rider:manage')],
  }, async (request, reply) => {
    const parsed = updateRiderSectionsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        errors: parsed.error.issues.map((i) => ({
          code: 'INVALID_BODY',
          message: `${i.path.join('.') || '(root)'}: ${i.message}`,
        })),
      });
    }
    const updated = await riderService.updateSections(request.user!.user_id, parsed.data);
    return reply.send({ success: true, data: updated, errors: [] });
  });

  // ── Phase 4: Event rider fulfilment (event-company-facing) ──────────────
  /**
   * GET /v1/event-files/:id/rider-fulfillment — list every line item across
   * all artist riders on this event with vendor assignment + cross-check.
   * Auto-seeds on first call.
   */
  app.get('/v1/event-files/:id/rider-fulfillment', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = await riderService.listEventFulfillment(id);
    return reply.send({ success: true, data, errors: [] });
  });

  /**
   * PUT /v1/event-files/:id/rider-fulfillment/:rowId — assign a vendor or
   * change the fulfilment status of one line item. Re-runs cross-check.
   */
  app.put('/v1/event-files/:id/rider-fulfillment/:rowId', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { rowId } = request.params as { rowId: string };
    const parsed = updateFulfillmentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        errors: parsed.error.issues.map((i) => ({
          code: 'INVALID_BODY',
          message: `${i.path.join('.') || '(root)'}: ${i.message}`,
        })),
      });
    }
    const updated = await riderService.updateEventFulfillment(rowId, request.user!.user_id, parsed.data);
    return reply.send({ success: true, data: updated, errors: [] });
  });

  /**
   * POST /v1/event-files/:id/rider-fulfillment/seed — force re-seed of
   * fulfilment rows from current rosters. Idempotent.
   */
  app.post('/v1/event-files/:id/rider-fulfillment/seed', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const rows = await riderService.seedEventFulfillment(id);
    return reply.send({ success: true, data: { seeded: rows.length }, errors: [] });
  });
}
