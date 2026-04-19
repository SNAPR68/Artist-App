import type { FastifyInstance } from 'fastify';
import { reputationDefenseService, ReputationDefenseError } from './reputation-defense.service.js';
import { reputationExportService, ReputationExportError } from './reputation-export.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validateBody } from '../../middleware/validation.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import { db } from '../../infrastructure/database.js';
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
    if (error instanceof ReputationDefenseError || error instanceof ReputationExportError) {
      return reply.status(error.statusCode).send({
        success: false,
        data: null,
        errors: [{ code: error.code, message: error.message }],
      });
    }
  });

  // ─── Signed Reputation Export (moat #4 — portable trust) ──────

  /**
   * GET /v1/reputation/export — Artist pulls their own signed reputation card.
   * Returns a JWT that agencies can verify with GRID's public key.
   */
  app.get('/v1/reputation/export', {
    preHandler: [authMiddleware, requirePermission('reputation:dispute')],
  }, async (request, reply) => {
    const { artistRepository } = await import('../artist/artist.repository.js');
    const profile = await artistRepository.findByUserId(request.user!.user_id);
    if (!profile) {
      return reply.status(404).send({ success: false, data: null, errors: [{ code: 'NOT_ARTIST', message: 'Artist profile not found' }] });
    }
    const result = await reputationExportService.exportForArtist(profile.id);
    return reply.send({ success: true, data: result, errors: [] });
  });

  /**
   * GET /v1/reputation/export/public-key — PEM-encoded RS256 public key for verification.
   * Returns 404 in dev (HS256 symmetric mode).
   * MUST be registered before /:artistId so the literal path wins route matching.
   */
  app.get('/v1/reputation/export/public-key', async (_request, reply) => {
    const key = reputationExportService.getPublicKey();
    if (!key) {
      return reply.status(404).send({ success: false, data: null, errors: [{ code: 'NO_PUBLIC_KEY', message: 'Server running in HS256 mode — no public key to expose' }] });
    }
    return reply.send({ success: true, data: key, errors: [] });
  });

  /**
   * GET /v1/reputation/export/:artistId — Public signed reputation card.
   * Anyone (agencies, other platforms) can pull and verify.
   */
  app.get<{ Params: { artistId: string } }>('/v1/reputation/export/:artistId', {
    preHandler: [rateLimit('READ')],
  }, async (request, reply) => {
    const { artistId } = request.params;
    const result = await reputationExportService.exportForArtist(artistId);
    return reply.send({ success: true, data: result, errors: [] });
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

  // ─── Admin List Routes ───────────────────────────────────────

  /**
   * GET /v1/admin/reputation/disputes — List all disputes with pagination
   */
  app.get('/v1/admin/reputation/disputes', {
    preHandler: [authMiddleware, requirePermission('admin:reputation')],
  }, async (request, reply) => {
    const { status, page = '1', per_page = '20' } = request.query as {
      status?: string;
      page?: string;
      per_page?: string;
    };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(per_page, 10) || 20));
    const offset = (pageNum - 1) * perPage;

    let query = db('review_disputes')
      .leftJoin('reviews', 'review_disputes.review_id', 'reviews.id')
      .leftJoin('users', 'review_disputes.disputed_by', 'users.id')
      .select(
        'review_disputes.*',
        'users.id as disputed_by_user_id',
      );

    let countQuery = db('review_disputes').count('* as total');

    if (status) {
      query = query.where('review_disputes.status', status);
      countQuery = countQuery.where('status', status);
    }

    const [disputes, [{ total }]] = await Promise.all([
      query.orderBy('review_disputes.created_at', 'desc').limit(perPage).offset(offset),
      countQuery,
    ]);

    return reply.send({
      success: true,
      data: { disputes, total: Number(total) },
      errors: [],
    });
  });

  /**
   * GET /v1/admin/reputation/venue-issues — List all venue issue flags
   */
  app.get('/v1/admin/reputation/venue-issues', {
    preHandler: [authMiddleware, requirePermission('admin:reputation')],
  }, async (request, reply) => {
    const { venue_id, is_verified } = request.query as {
      venue_id?: string;
      is_verified?: string;
    };

    let query = db('venue_issue_flags')
      .leftJoin('venue_profiles', 'venue_issue_flags.venue_id', 'venue_profiles.id')
      .select(
        'venue_issue_flags.*',
        'venue_profiles.name as venue_name',
      );

    if (venue_id) {
      query = query.where('venue_issue_flags.venue_id', venue_id);
    }

    if (is_verified !== undefined) {
      query = query.where('venue_issue_flags.is_verified', is_verified === 'true');
    }

    const issues = await query.orderBy('venue_issue_flags.created_at', 'desc');

    return reply.send({
      success: true,
      data: issues,
      errors: [],
    });
  });
}
