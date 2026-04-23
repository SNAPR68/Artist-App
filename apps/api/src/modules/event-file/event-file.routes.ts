/**
 * Event Company OS pivot (2026-04-22) — Event File routes.
 *
 * All routes scoped to request.user.user_id as client_id (event company owns
 * the file). Vendors are added/removed via sub-routes.
 *
 * POST   /v1/event-files                      — Create
 * GET    /v1/event-files                      — List (client's own)
 * GET    /v1/event-files/:id                  — Get with vendor roster
 * PUT    /v1/event-files/:id                  — Update
 * DELETE /v1/event-files/:id                  — Soft delete
 * POST   /v1/event-files/:id/vendors          — Add vendor to roster
 * DELETE /v1/event-files/:id/vendors/:rowId   — Remove vendor row
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eventFileRepository } from './event-file.repository.js';
import { callSheetService } from './call-sheet.service.js';
import { consolidatedRiderService } from './consolidated-rider.service.js';
import { boqService, type BOQItemInput } from './boq.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import {
  createEventFileSchema,
  updateEventFileSchema,
  addEventFileVendorSchema,
  EventFileStatus,
  PAGINATION,
} from '@artist-booking/shared';

function zodFail(reply: any, status: number, issues: { path: (string | number)[]; message: string }[]) {
  return reply.status(status).send({
    success: false,
    errors: issues.map((i) => ({
      code: 'VALIDATION_ERROR',
      message: `${i.path.join('.') || '(root)'}: ${i.message}`,
    })),
  });
}

export async function eventFileRoutes(app: FastifyInstance) {
  app.post('/v1/event-files', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const parsed = createEventFileSchema.safeParse(request.body);
    if (!parsed.success) return zodFail(reply, 400, parsed.error.issues);

    const clientId = request.user!.user_id;
    const row = await eventFileRepository.create(clientId, parsed.data);
    return reply.status(201).send({ success: true, data: row, errors: [] });
  });

  app.get('/v1/event-files', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (request, reply) => {
    const query = request.query as Record<string, string>;
    const page = Math.max(1, parseInt(query.page ?? '1'));
    const per_page = Math.min(
      PAGINATION.MAX_PER_PAGE,
      Math.max(1, parseInt(query.per_page ?? '20')),
    );

    let status: string | undefined;
    if (query.status) {
      const parsed = EventFileStatus.safeParse(query.status);
      if (!parsed.success) return zodFail(reply, 400, parsed.error.issues);
      status = parsed.data;
    }

    const result = await eventFileRepository.list({
      client_id: request.user!.user_id,
      status,
      page,
      per_page,
    });

    return reply.send({
      success: true,
      data: result.data,
      meta: {
        page,
        per_page,
        total: result.total,
        total_pages: Math.ceil(result.total / per_page),
      },
      errors: [],
    });
  });

  app.get('/v1/event-files/:id', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const file = await eventFileRepository.findById(id, request.user!.user_id);
    if (!file) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Event file not found' }],
      });
    }
    return reply.send({ success: true, data: file, errors: [] });
  });

  app.put('/v1/event-files/:id', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const parsed = updateEventFileSchema.safeParse(request.body);
    if (!parsed.success) return zodFail(reply, 400, parsed.error.issues);

    const { id } = request.params as { id: string };
    const row = await eventFileRepository.update(id, request.user!.user_id, parsed.data);
    if (!row) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Event file not found' }],
      });
    }
    return reply.send({ success: true, data: row, errors: [] });
  });

  app.delete('/v1/event-files/:id', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = await eventFileRepository.softDelete(id, request.user!.user_id);
    if (!row) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Event file not found' }],
      });
    }
    return reply.send({ success: true, data: { id: row.id }, errors: [] });
  });

  app.post('/v1/event-files/:id/vendors', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const parsed = addEventFileVendorSchema.safeParse(request.body);
    if (!parsed.success) return zodFail(reply, 400, parsed.error.issues);

    const { id } = request.params as { id: string };
    const owns = await eventFileRepository.isOwner(id, request.user!.user_id);
    if (!owns) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Event file not found' }],
      });
    }

    try {
      const row = await eventFileRepository.addVendor(id, parsed.data);
      return reply.status(201).send({ success: true, data: row, errors: [] });
    } catch (err: any) {
      // unique_violation (event_file_id, vendor_profile_id, role)
      if (err?.code === '23505') {
        return reply.status(409).send({
          success: false,
          errors: [{ code: 'ALREADY_ON_ROSTER', message: 'Vendor already added with this role' }],
        });
      }
      throw err;
    }
  });

  app.delete('/v1/event-files/:id/vendors/:rowId', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const { id, rowId } = request.params as { id: string; rowId: string };
    const owns = await eventFileRepository.isOwner(id, request.user!.user_id);
    if (!owns) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Event file not found' }],
      });
    }

    const row = await eventFileRepository.removeVendor(id, rowId);
    if (!row) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Vendor row not found' }],
      });
    }
    return reply.send({ success: true, data: { id: row.id }, errors: [] });
  });

  /**
   * POST /v1/event-files/:id/call-sheet — Generate PDF + Excel call sheet.
   * Returns artifact URLs; does NOT auto-dispatch — UI chooses when to send.
   */
  app.post('/v1/event-files/:id/call-sheet', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const owns = await eventFileRepository.isOwner(id, request.user!.user_id);
    if (!owns) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Event file not found' }],
      });
    }
    const row = await callSheetService.generate(id, request.user!.user_id);
    return reply.status(201).send({ success: true, data: row, errors: [] });
  });

  /**
   * GET /v1/event-files/:id/call-sheets — List prior generations for this file.
   */
  app.get('/v1/event-files/:id/call-sheets', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const owns = await eventFileRepository.isOwner(id, request.user!.user_id);
    if (!owns) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Event file not found' }],
      });
    }
    const rows = await callSheetService.listForEventFile(id);
    return reply.send({ success: true, data: rows, errors: [] });
  });

  /**
   * POST /v1/event-files/:id/call-sheets/:dispatchId/dispatch — Fan out
   * to vendor roster via WhatsApp (fallback SMS) + Email.
   */
  app.post('/v1/event-files/:id/call-sheets/:dispatchId/dispatch', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const { id, dispatchId } = request.params as { id: string; dispatchId: string };
    const owns = await eventFileRepository.isOwner(id, request.user!.user_id);
    if (!owns) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Event file not found' }],
      });
    }
    try {
      const result = await callSheetService.dispatch(dispatchId);
      return reply.send({ success: true, data: result, errors: [] });
    } catch (err: any) {
      if (err?.message === 'DISPATCH_NOT_FOUND') {
        return reply.status(404).send({
          success: false,
          errors: [{ code: 'NOT_FOUND', message: 'Call sheet not found' }],
        });
      }
      throw err;
    }
  });

  /**
   * POST /v1/event-files/:id/consolidated-rider — Generate merged PDF + Excel
   * from per-vendor artist_riders rows. Returns artifact URLs.
   */
  app.post('/v1/event-files/:id/consolidated-rider', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const owns = await eventFileRepository.isOwner(id, request.user!.user_id);
    if (!owns) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Event file not found' }],
      });
    }
    const row = await consolidatedRiderService.generate(id, request.user!.user_id);
    return reply.status(201).send({ success: true, data: row, errors: [] });
  });

  /**
   * POST /v1/event-files/:id/consolidated-rider/upload — Record a hand-merged
   * PDF as the file-of-record. Bytes are uploaded via the normal storage flow;
   * this endpoint only registers the URL/key + optional note.
   */
  const uploadRiderSchema = z.object({
    pdf_url: z.string().url(),
    pdf_s3_key: z.string().optional(),
    xlsx_url: z.string().url().optional(),
    xlsx_s3_key: z.string().optional(),
    note: z.string().max(500).optional(),
  });

  app.post('/v1/event-files/:id/consolidated-rider/upload', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const parsed = uploadRiderSchema.safeParse(request.body);
    if (!parsed.success) return zodFail(reply, 400, parsed.error.issues);

    const { id } = request.params as { id: string };
    const owns = await eventFileRepository.isOwner(id, request.user!.user_id);
    if (!owns) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Event file not found' }],
      });
    }
    const row = await consolidatedRiderService.recordUpload({
      event_file_id: id,
      created_by_user_id: request.user!.user_id,
      ...parsed.data,
    });
    return reply.status(201).send({ success: true, data: row, errors: [] });
  });

  /**
   * GET /v1/event-files/:id/consolidated-rider — Latest artifact (generated
   * or uploaded — whichever is newest).
   */
  app.get('/v1/event-files/:id/consolidated-rider', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const owns = await eventFileRepository.isOwner(id, request.user!.user_id);
    if (!owns) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Event file not found' }],
      });
    }
    const row = await consolidatedRiderService.latest(id);
    return reply.send({ success: true, data: row ?? null, errors: [] });
  });

  /**
   * GET /v1/event-files/:id/consolidated-rider/history — All versions,
   * newest first.
   */
  app.get('/v1/event-files/:id/consolidated-rider/history', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const owns = await eventFileRepository.isOwner(id, request.user!.user_id);
    if (!owns) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Event file not found' }],
      });
    }
    const rows = await consolidatedRiderService.list(id);
    return reply.send({ success: true, data: rows, errors: [] });
  });

  // ---- BOQ (Bill of Quantities) ----

  const boqItemSchema = z.object({
    vendor_profile_id: z.string().uuid().nullable().optional(),
    category: z.string().min(1).max(32),
    description: z.string().min(1).max(255),
    quantity: z.number().int().positive(),
    unit_price_inr: z.number().nonnegative(),
    gst_rate_pct: z.number().min(0).max(100).nullable().optional(),
    sort_order: z.number().int().nonnegative().optional(),
  });

  const boqItemPatchSchema = boqItemSchema.partial();

  async function assertOwns(request: any, reply: any, id: string): Promise<boolean> {
    const owns = await eventFileRepository.isOwner(id, request.user!.user_id);
    if (!owns) {
      reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Event file not found' }],
      });
      return false;
    }
    return true;
  }

  app.get('/v1/event-files/:id/boq/items', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await assertOwns(request, reply, id))) return;
    const rows = await boqService.listItems(id);
    return reply.send({ success: true, data: rows, errors: [] });
  });

  app.post('/v1/event-files/:id/boq/seed', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await assertOwns(request, reply, id))) return;
    const result = await boqService.seedFromRoster(id);
    return reply.status(201).send({ success: true, data: result, errors: [] });
  });

  app.post('/v1/event-files/:id/boq/items', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const parsed = boqItemSchema.safeParse(request.body);
    if (!parsed.success) return zodFail(reply, 400, parsed.error.issues);

    const { id } = request.params as { id: string };
    if (!(await assertOwns(request, reply, id))) return;
    const row = await boqService.addItem(id, parsed.data as BOQItemInput);
    return reply.status(201).send({ success: true, data: row, errors: [] });
  });

  app.put('/v1/event-files/:id/boq/items/:itemId', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const parsed = boqItemPatchSchema.safeParse(request.body);
    if (!parsed.success) return zodFail(reply, 400, parsed.error.issues);

    const { id, itemId } = request.params as { id: string; itemId: string };
    if (!(await assertOwns(request, reply, id))) return;
    const row = await boqService.updateItem(id, itemId, parsed.data);
    if (!row) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Line item not found' }],
      });
    }
    return reply.send({ success: true, data: row, errors: [] });
  });

  app.delete('/v1/event-files/:id/boq/items/:itemId', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const { id, itemId } = request.params as { id: string; itemId: string };
    if (!(await assertOwns(request, reply, id))) return;
    const row = await boqService.removeItem(id, itemId);
    if (!row) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Line item not found' }],
      });
    }
    return reply.send({ success: true, data: { id: row.id }, errors: [] });
  });

  /** Generate PDF + Excel from current line items. */
  app.post('/v1/event-files/:id/boq', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await assertOwns(request, reply, id))) return;
    const row = await boqService.generate(id, request.user!.user_id);
    return reply.status(201).send({ success: true, data: row, errors: [] });
  });

  /** Re-upload hand-built BOQ as file-of-record. */
  const uploadBoqSchema = z.object({
    pdf_url: z.string().url().optional(),
    pdf_s3_key: z.string().optional(),
    xlsx_url: z.string().url().optional(),
    xlsx_s3_key: z.string().optional(),
    note: z.string().max(500).optional(),
  });

  app.post('/v1/event-files/:id/boq/upload', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const parsed = uploadBoqSchema.safeParse(request.body);
    if (!parsed.success) return zodFail(reply, 400, parsed.error.issues);

    const { id } = request.params as { id: string };
    if (!(await assertOwns(request, reply, id))) return;
    try {
      const row = await boqService.recordUpload({
        event_file_id: id,
        created_by_user_id: request.user!.user_id,
        ...parsed.data,
      });
      return reply.status(201).send({ success: true, data: row, errors: [] });
    } catch (err: any) {
      if (err?.message === 'UPLOAD_REQUIRES_PDF_OR_XLSX') {
        return reply.status(400).send({
          success: false,
          errors: [{ code: 'VALIDATION_ERROR', message: 'At least one of pdf_url or xlsx_url is required' }],
        });
      }
      throw err;
    }
  });

  app.get('/v1/event-files/:id/boq', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await assertOwns(request, reply, id))) return;
    const row = await boqService.latest(id);
    return reply.send({ success: true, data: row ?? null, errors: [] });
  });

  app.get('/v1/event-files/:id/boq/history', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await assertOwns(request, reply, id))) return;
    const rows = await boqService.list(id);
    return reply.send({ success: true, data: rows, errors: [] });
  });

  /**
   * DEMO-ONLY public routes — no auth. Only return event_files whose
   * event_name begins with 'DEMO:'. Used by /demo surface for Shows of India
   * stage walkthrough where stage WiFi + login = demo risk.
   */
  app.get('/v1/demo/event-files', {
    preHandler: [rateLimit('READ')],
  }, async (_request, reply) => {
    const rows = await eventFileRepository.listDemo();
    return reply.send({ success: true, data: rows, errors: [] });
  });

  app.get('/v1/demo/event-files/:id', {
    preHandler: [rateLimit('READ')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const file = await eventFileRepository.findDemoById(id);
    if (!file) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Demo event file not found' }],
      });
    }
    return reply.send({ success: true, data: file, errors: [] });
  });
}
