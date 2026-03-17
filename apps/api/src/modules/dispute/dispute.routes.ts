import type { FastifyInstance } from 'fastify';
import { disputeService } from './dispute.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validateBody } from '../../middleware/validation.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import {
  submitDisputeSchema,
  addDisputeEvidenceSchema,
  resolveDisputeSchema,
  appealDisputeSchema,
  DisputeStatus,
  PAGINATION,
} from '@artist-booking/shared';

export async function disputeRoutes(app: FastifyInstance) {
  /**
   * POST /v1/disputes — Submit a dispute
   */
  app.post('/v1/disputes', {
    preHandler: [
      authMiddleware,
      requirePermission('dispute:create'),
      rateLimit('WRITE'),
      validateBody(submitDisputeSchema),
    ],
  }, async (request, reply) => {
    const data = request.body as { booking_id: string; dispute_type: string; description: string };
    const dispute = await disputeService.submitDispute(request.user!.user_id, data);

    return reply.status(201).send({
      success: true,
      data: dispute,
      errors: [],
    });
  });

  /**
   * POST /v1/disputes/:id/evidence — Add evidence to a dispute
   */
  app.post('/v1/disputes/:id/evidence', {
    preHandler: [
      authMiddleware,
      rateLimit('WRITE'),
      validateBody(addDisputeEvidenceSchema),
    ],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as { evidence_type: string; file_url: string; description?: string };
    const evidence = await disputeService.addEvidence(id, request.user!.user_id, data);

    return reply.status(201).send({
      success: true,
      data: evidence,
      errors: [],
    });
  });

  /**
   * PATCH /v1/disputes/:id/status — Admin: update dispute status
   */
  app.patch('/v1/disputes/:id/status', {
    preHandler: [authMiddleware, requirePermission('admin:disputes')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: DisputeStatus };
    const updated = await disputeService.updateStatus(id, request.user!.user_id, status);

    return reply.send({
      success: true,
      data: updated,
      errors: [],
    });
  });

  /**
   * POST /v1/disputes/:id/resolve — Admin: resolve dispute
   */
  app.post('/v1/disputes/:id/resolve', {
    preHandler: [
      authMiddleware,
      requirePermission('admin:disputes'),
      validateBody(resolveDisputeSchema),
    ],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const resolution = request.body as {
      resolution_type: string;
      resolution_notes: string;
      financial_resolution?: { refund_amount_paise?: number; artist_payout_paise?: number; platform_absorbs_paise?: number };
      trust_impact?: { artist_adjustment?: number; client_adjustment?: number };
    };
    const resolved = await disputeService.resolveDispute(id, request.user!.user_id, resolution);

    return reply.send({
      success: true,
      data: resolved,
      errors: [],
    });
  });

  /**
   * POST /v1/disputes/:id/appeal — Appeal a resolved dispute
   */
  app.post('/v1/disputes/:id/appeal', {
    preHandler: [
      authMiddleware,
      rateLimit('WRITE'),
      validateBody(appealDisputeSchema),
    ],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason } = request.body as { reason: string };
    const updated = await disputeService.appealDispute(id, request.user!.user_id, reason);

    return reply.send({
      success: true,
      data: updated,
      errors: [],
    });
  });

  /**
   * GET /v1/disputes — List current user's disputes
   */
  app.get('/v1/disputes', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const query = request.query as Record<string, string>;
    const page = Math.max(1, parseInt(query.page ?? '1'));
    const perPage = Math.min(PAGINATION.MAX_PER_PAGE, Math.max(1, parseInt(query.per_page ?? '20')));

    const result = await disputeService.listUserDisputes(request.user!.user_id, page, perPage);

    return reply.send({
      success: true,
      data: result.data,
      meta: {
        page,
        per_page: perPage,
        total: result.total,
        total_pages: Math.ceil(result.total / perPage),
      },
      errors: [],
    });
  });

  /**
   * GET /v1/disputes/:id — Get dispute details with evidence
   */
  app.get('/v1/disputes/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const dispute = await disputeService.getDispute(id, request.user!.user_id);

    return reply.send({
      success: true,
      data: dispute,
      errors: [],
    });
  });

  /**
   * GET /v1/admin/disputes — Admin: list all disputes
   */
  app.get('/v1/admin/disputes', {
    preHandler: [authMiddleware, requirePermission('admin:disputes')],
  }, async (request, reply) => {
    const query = request.query as Record<string, string>;
    const page = Math.max(1, parseInt(query.page ?? '1'));
    const perPage = Math.min(PAGINATION.MAX_PER_PAGE, Math.max(1, parseInt(query.per_page ?? '20')));
    const status = query.status;

    const result = await disputeService.listAllDisputes(page, perPage, status);

    return reply.send({
      success: true,
      data: result.data,
      meta: {
        page,
        per_page: perPage,
        total: result.total,
        total_pages: Math.ceil(result.total / perPage),
      },
      errors: [],
    });
  });

  /**
   * GET /v1/admin/disputes/:id — Admin: get dispute details
   */
  app.get('/v1/admin/disputes/:id', {
    preHandler: [authMiddleware, requirePermission('admin:disputes')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const dispute = await disputeService.getDisputeAsAdmin(id);

    return reply.send({
      success: true,
      data: dispute,
      errors: [],
    });
  });
}
