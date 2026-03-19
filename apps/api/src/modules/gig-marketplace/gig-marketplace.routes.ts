import type { FastifyInstance } from 'fastify';
import { gigMarketplaceService, GigMarketplaceError } from './gig-marketplace.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validateBody, validateQuery } from '../../middleware/validation.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import {
  createGigPostSchema,
  updateGigPostSchema,
  gigPostQuerySchema,
  createGigApplicationSchema,
  respondGigApplicationSchema,
} from '@artist-booking/shared';

export async function gigMarketplaceRoutes(app: FastifyInstance) {

  // ─── Error Handler ─────────────────────────────────────────

  function handleError(error: unknown, reply: any) {
    if (error instanceof GigMarketplaceError) {
      return reply.status(error.statusCode).send({
        success: false,
        data: null,
        errors: [{ code: error.code, message: error.message }],
      });
    }
    throw error;
  }

  // ─── Gig Posts ─────────────────────────────────────────────

  /**
   * POST /v1/gigs — Create a gig post
   */
  app.post('/v1/gigs', {
    preHandler: [authMiddleware, requirePermission('gig:create'), rateLimit('WRITE'), validateBody(createGigPostSchema)],
  }, async (request, reply) => {
    try {
      const post = await gigMarketplaceService.createPost(request.user!.user_id, request.body as never);
      return reply.status(201).send({
        success: true,
        data: post,
        errors: [],
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  /**
   * GET /v1/gigs — List gig posts with filters
   */
  app.get('/v1/gigs', {
    preHandler: [authMiddleware, requirePermission('gig:browse'), validateQuery(gigPostQuerySchema)],
  }, async (request, reply) => {
    try {
      const result = await gigMarketplaceService.getPosts(request.query as never);
      return reply.send({
        success: true,
        data: result,
        errors: [],
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  /**
   * GET /v1/gigs/matching — Artist-specific matching gigs
   */
  app.get('/v1/gigs/matching', {
    preHandler: [authMiddleware, requirePermission('gig:browse'), validateQuery(gigPostQuerySchema)],
  }, async (request, reply) => {
    try {
      const result = await gigMarketplaceService.getMatchingGigs(request.user!.user_id, request.query as never);
      return reply.send({
        success: true,
        data: result,
        errors: [],
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  /**
   * GET /v1/gigs/my-posts — My posted gigs
   */
  app.get('/v1/gigs/my-posts', {
    preHandler: [authMiddleware, requirePermission('gig:create')],
  }, async (request, reply) => {
    try {
      const posts = await gigMarketplaceService.getMyPosts(request.user!.user_id);
      return reply.send({
        success: true,
        data: posts,
        errors: [],
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  /**
   * GET /v1/gigs/my-applications — My applications (artist)
   */
  app.get('/v1/gigs/my-applications', {
    preHandler: [authMiddleware, requirePermission('gig:apply')],
  }, async (request, reply) => {
    try {
      const applications = await gigMarketplaceService.getMyApplications(request.user!.user_id);
      return reply.send({
        success: true,
        data: applications,
        errors: [],
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  /**
   * GET /v1/gigs/:id — Get single gig post
   */
  app.get('/v1/gigs/:id', {
    preHandler: [authMiddleware, requirePermission('gig:browse')],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const post = await gigMarketplaceService.getPost(id);
      return reply.send({
        success: true,
        data: post,
        errors: [],
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  /**
   * PUT /v1/gigs/:id — Update gig post
   */
  app.put('/v1/gigs/:id', {
    preHandler: [authMiddleware, requirePermission('gig:create'), rateLimit('WRITE'), validateBody(updateGigPostSchema)],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const post = await gigMarketplaceService.updatePost(id, request.user!.user_id, request.body as never);
      return reply.send({
        success: true,
        data: post,
        errors: [],
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  /**
   * POST /v1/gigs/:id/close — Close gig post
   */
  app.post('/v1/gigs/:id/close', {
    preHandler: [authMiddleware, requirePermission('gig:create'), rateLimit('WRITE')],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const post = await gigMarketplaceService.closePost(id, request.user!.user_id);
      return reply.send({
        success: true,
        data: post,
        errors: [],
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  /**
   * POST /v1/gigs/:id/apply — Apply to a gig (artist)
   */
  app.post('/v1/gigs/:id/apply', {
    preHandler: [authMiddleware, requirePermission('gig:apply'), rateLimit('WRITE'), validateBody(createGigApplicationSchema)],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await gigMarketplaceService.applyToGig(id, request.user!.user_id, request.body as never);
      return reply.status(201).send({
        success: true,
        data: result,
        errors: [],
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  /**
   * GET /v1/gigs/:id/applications — View applications for a gig post
   */
  app.get('/v1/gigs/:id/applications', {
    preHandler: [authMiddleware, requirePermission('gig:create')],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const applications = await gigMarketplaceService.getApplicationsForPost(id, request.user!.user_id);
      return reply.send({
        success: true,
        data: applications,
        errors: [],
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  /**
   * PUT /v1/gigs/applications/:id/respond — Respond to an application
   */
  app.put('/v1/gigs/applications/:id/respond', {
    preHandler: [authMiddleware, requirePermission('gig:create'), rateLimit('WRITE'), validateBody(respondGigApplicationSchema)],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { status } = request.body as { status: string };
      const application = await gigMarketplaceService.respondToApplication(id, request.user!.user_id, status);
      return reply.send({
        success: true,
        data: application,
        errors: [],
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  /**
   * DELETE /v1/gigs/applications/:id/withdraw — Withdraw an application (artist)
   */
  app.delete('/v1/gigs/applications/:id/withdraw', {
    preHandler: [authMiddleware, requirePermission('gig:apply'), rateLimit('WRITE')],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const application = await gigMarketplaceService.withdrawApplication(id, request.user!.user_id);
      return reply.send({
        success: true,
        data: application,
        errors: [],
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });
}
