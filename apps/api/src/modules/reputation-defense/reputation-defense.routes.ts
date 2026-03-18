import type { FastifyInstance } from 'fastify';
import { reputationDefenseService, ReputationDefenseError } from './reputation-defense.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validateBody } from '../../middleware/validation.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import {
  submitReviewDisputeSchema,
  respondReviewSchema,
  resolveReviewDisputeSchema,
  venueIssueReportSchema,
  verifyVenueIssueSchema,
} from '@artist-booking/shared';

export async function reputationDefenseRoutes(app: FastifyInstance) {

  // ─── Error handler ────────────────────────────────────────────

  app.addHook('onError', async (_request, reply, error) => {
    if (error instanceof ReputationDefenseError) {
      return reply.status(error.statusCode).send({
        success: false,
        data: null,
        errors: [{ code: error.code, message: error.message }],
      });
    }
  });

  // ─── User Routes ──────────────────────────────────────────────

  /**
   * POST /v1/reputation/reviews/:reviewId/dispute — Submit a dispute against a review
   */
  app.post('/v1/reputation/reviews/:reviewId/dispute', {
    preHandler: [authMiddleware, requirePermission('reputation:dispute'), rateLimit('WRITE'), validateBody(submitReviewDisputeSchema)],
  }, async (request, reply) => {
    const { reviewId } = request.params as { reviewId: string };
    const dispute = await reputationDefenseService.submitDispute(
      request.user!.user_id,
      reviewId,
      request.body as { reason: string; evidence?: string },
    );

    return reply.status(201).send({
      success: true,
      data: dispute,
      errors: [],
    });
  });

  /**
   * GET /v1/reputation/disputes — Get all disputes for the current user
   */
  app.get('/v1/reputation/disputes', {
    preHandler: [authMiddleware, requirePermission('reputation:dispute')],
  }, async (request, reply) => {
    const disputes = await reputationDefenseService.getMyDisputes(request.user!.user_id);

    return reply.send({
      success: true,
      data: disputes,
      errors: [],
    });
  });

  /**
   * GET /v1/reputation/disputes/:id — Get a single dispute by ID
   */
  app.get('/v1/reputation/disputes/:id', {
    preHandler: [authMiddleware, requirePermission('reputation:dispute')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const dispute = await reputationDefenseService.getDispute(id);

    return reply.send({
      success: true,
      data: dispute,
      errors: [],
    });
  });

  /**
   * POST /v1/reputation/reviews/:reviewId/respond — Submit a public response to a review
   */
  app.post('/v1/reputation/reviews/:reviewId/respond', {
    preHandler: [authMiddleware, requirePermission('reputation:respond'), rateLimit('WRITE'), validateBody(respondReviewSchema)],
  }, async (request, reply) => {
    const { reviewId } = request.params as { reviewId: string };
    const { response_text } = request.body as { response_text: string };
    const response = await reputationDefenseService.submitResponse(
      request.user!.user_id,
      reviewId,
      response_text,
    );

    return reply.status(201).send({
      success: true,
      data: response,
      errors: [],
    });
  });

  /**
   * POST /v1/reputation/venues/issues — Report a venue issue
   */
  app.post('/v1/reputation/venues/issues', {
    preHandler: [authMiddleware, requirePermission('reputation:report_venue'), rateLimit('WRITE'), validateBody(venueIssueReportSchema)],
  }, async (request, reply) => {
    const flag = await reputationDefenseService.reportVenueIssue(
      request.user!.user_id,
      request.body as { venue_id: string; issue_type: string; description?: string; booking_id?: string },
    );

    return reply.status(201).send({
      success: true,
      data: flag,
      errors: [],
    });
  });

  /**
   * GET /v1/reputation/venues/:venueId/issues — Get venue issue flags
   */
  app.get('/v1/reputation/venues/:venueId/issues', {
    preHandler: [authMiddleware, requirePermission('reputation:report_venue')],
  }, async (request, reply) => {
    const { venueId } = request.params as { venueId: string };
    const issues = await reputationDefenseService.getVenueIssues(venueId);

    return reply.send({
      success: true,
      data: issues,
      errors: [],
    });
  });

  /**
   * GET /v1/reputation/artist/weighted-rating — Get venue-adjusted weighted rating
   */
  app.get('/v1/reputation/artist/weighted-rating', {
    preHandler: [authMiddleware, requirePermission('reputation:dispute')],
  }, async (request, reply) => {
    const rating = await reputationDefenseService.getWeightedRating(request.user!.user_id);

    return reply.send({
      success: true,
      data: rating,
      errors: [],
    });
  });

  // ─── Admin Routes ─────────────────────────────────────────────

  /**
   * PUT /v1/admin/reputation/disputes/:id/resolve — Admin resolves a dispute
   */
  app.put('/v1/admin/reputation/disputes/:id/resolve', {
    preHandler: [authMiddleware, requirePermission('admin:reputation'), rateLimit('WRITE'), validateBody(resolveReviewDisputeSchema)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { resolution, admin_notes } = request.body as { resolution: string; admin_notes?: string };
    const dispute = await reputationDefenseService.resolveDispute(
      id,
      request.user!.user_id,
      resolution,
      admin_notes,
    );

    return reply.send({
      success: true,
      data: dispute,
      errors: [],
    });
  });

  /**
   * PUT /v1/admin/reputation/venue-issues/:id/verify — Admin verifies a venue issue
   */
  app.put('/v1/admin/reputation/venue-issues/:id/verify', {
    preHandler: [authMiddleware, requirePermission('admin:reputation'), rateLimit('WRITE'), validateBody(verifyVenueIssueSchema)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { is_verified, auto_advisory } = request.body as { is_verified: boolean; auto_advisory?: string };
    const issue = await reputationDefenseService.verifyVenueIssue(
      id,
      request.user!.user_id,
      is_verified,
      auto_advisory,
    );

    return reply.send({
      success: true,
      data: issue,
      errors: [],
    });
  });
}
