import type { FastifyInstance } from 'fastify';
import { artistIntelligenceService } from './artist-intelligence.service.js';
import { artistIntelligenceRepository } from './artist-intelligence.repository.js';
import { gigAdvisorV2Service } from './gig-advisor-v2.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { db } from '../../infrastructure/database.js';

interface EarningsQuery {
  period_type?: string;
  start_date?: string;
  end_date?: string;
}

function parseEarningsQuery(query: unknown): EarningsQuery {
  const raw = query as Record<string, unknown>;
  return {
    period_type: typeof raw.period_type === 'string' ? raw.period_type : undefined,
    start_date: typeof raw.start_date === 'string' ? raw.start_date : undefined,
    end_date: typeof raw.end_date === 'string' ? raw.end_date : undefined,
  };
}

export async function artistIntelligenceRoutes(app: FastifyInstance) {
  /**
   * GET /v1/artists/me/intelligence/career — Artist's career trajectory
   */
  app.get('/v1/artists/me/intelligence/career', {
    preHandler: [authMiddleware, requirePermission('artist_intelligence:read')],
  }, async (request, reply) => {
    const data = await artistIntelligenceService.getCareerTrajectory(request.user!.user_id);
    if (!data) {
      return reply.status(404).send({
        success: false,
        data: null,
        errors: [{ code: 'NOT_FOUND', message: 'Artist profile not found' }],
      });
    }

    return reply.send({ success: true, data, errors: [] });
  });

  /**
   * GET /v1/artists/me/intelligence/earnings — Artist's earnings analytics
   */
  app.get('/v1/artists/me/intelligence/earnings', {
    preHandler: [authMiddleware, requirePermission('artist_intelligence:read')],
  }, async (request, reply) => {
    const filters = parseEarningsQuery(request.query);
    const data = await artistIntelligenceService.getEarningsAnalytics(request.user!.user_id, filters);
    if (!data) {
      return reply.status(404).send({
        success: false,
        data: null,
        errors: [{ code: 'NOT_FOUND', message: 'Artist profile not found' }],
      });
    }

    return reply.send({ success: true, data, errors: [] });
  });

  /**
   * GET /v1/artists/me/intelligence/reputation — Artist's reputation insights
   */
  app.get('/v1/artists/me/intelligence/reputation', {
    preHandler: [authMiddleware, requirePermission('artist_intelligence:read')],
  }, async (request, reply) => {
    const data = await artistIntelligenceService.getReputationInsights(request.user!.user_id);
    if (!data) {
      return reply.status(404).send({
        success: false,
        data: null,
        errors: [{ code: 'NOT_FOUND', message: 'Artist profile not found' }],
      });
    }

    return reply.send({ success: true, data, errors: [] });
  });

  /**
   * GET /v1/artists/me/intelligence/gig-advisor — Gig opportunity recommendations
   */
  app.get('/v1/artists/me/intelligence/gig-advisor', {
    preHandler: [authMiddleware, requirePermission('artist_intelligence:read')],
  }, async (request, reply) => {
    const artist = await db('artist_profiles').where({ user_id: request.user!.user_id }).first();
    if (!artist) {
      return reply.status(404).send({
        success: false,
        data: null,
        errors: [{ code: 'NOT_FOUND', message: 'Artist profile not found' }],
      });
    }

    const careerMetrics = await artistIntelligenceRepository.getCareerMetrics(artist.id);

    let gigAdvisor = [];
    if (careerMetrics?.gig_advisor) {
      gigAdvisor = typeof careerMetrics.gig_advisor === 'string'
        ? JSON.parse(careerMetrics.gig_advisor)
        : careerMetrics.gig_advisor;
    }

    return reply.send({ success: true, data: { gig_advisor: gigAdvisor }, errors: [] });
  });

  /**
   * GET /v1/artists/me/intelligence/summary — Combined intelligence dashboard
   */
  app.get('/v1/artists/me/intelligence/summary', {
    preHandler: [authMiddleware, requirePermission('artist_intelligence:read')],
  }, async (request, reply) => {
    const data = await artistIntelligenceService.getSummary(request.user!.user_id);
    if (!data) {
      return reply.status(404).send({
        success: false,
        data: null,
        errors: [{ code: 'NOT_FOUND', message: 'Artist profile not found' }],
      });
    }

    return reply.send({ success: true, data, errors: [] });
  });

  /**
   * GET /v1/agents/roster/:artistId/intelligence — Agent: view roster artist's intelligence
   */
  app.get('/v1/agents/roster/:artistId/intelligence', {
    preHandler: [authMiddleware, requirePermission('artist_intelligence:read_agent')],
  }, async (request, reply) => {
    const { artistId } = request.params as { artistId: string };

    const artist = await db('artist_profiles').where({ id: artistId }).first();
    if (!artist) {
      return reply.status(404).send({
        success: false,
        data: null,
        errors: [{ code: 'NOT_FOUND', message: 'Artist profile not found' }],
      });
    }

    const data = await artistIntelligenceService.getCareerTrajectory(artist.user_id);

    return reply.send({ success: true, data, errors: [] });
  });

  // ─── Gig Advisor V2 ──────────────────────────────────────────

  /**
   * GET /v1/artist-intelligence/gig-advisor-v2 — Compare all active inquiries
   */
  app.get('/v1/artist-intelligence/gig-advisor-v2', {
    preHandler: [authMiddleware, requirePermission('artist_intelligence:gig_advisor')],
  }, async (request, reply) => {
    const artistProfile = await db('artist_profiles').where({ user_id: request.user!.user_id }).first();
    if (!artistProfile) {
      return reply.status(404).send({
        success: false,
        data: null,
        errors: [{ code: 'NOT_FOUND', message: 'Artist profile not found' }],
      });
    }

    const result = await gigAdvisorV2Service.compareInquiries(artistProfile.id);
    return reply.send({ success: true, data: result, errors: [] });
  });

  /**
   * GET /v1/artist-intelligence/gig-advisor-v2/:bookingId — Single inquiry analysis
   */
  app.get('/v1/artist-intelligence/gig-advisor-v2/:bookingId', {
    preHandler: [authMiddleware, requirePermission('artist_intelligence:gig_advisor')],
  }, async (request, reply) => {
    const { bookingId } = request.params as { bookingId: string };
    const artistProfile = await db('artist_profiles').where({ user_id: request.user!.user_id }).first();
    if (!artistProfile) {
      return reply.status(404).send({
        success: false,
        data: null,
        errors: [{ code: 'NOT_FOUND', message: 'Artist profile not found' }],
      });
    }

    const result = await gigAdvisorV2Service.analyzeInquiry(artistProfile.id, bookingId);
    return reply.send({ success: true, data: result, errors: [] });
  });

  /**
   * POST /v1/artist-intelligence/gig-advisor-v2/compare — Compare specific inquiry IDs
   */
  app.post('/v1/artist-intelligence/gig-advisor-v2/compare', {
    preHandler: [authMiddleware, requirePermission('artist_intelligence:gig_advisor')],
  }, async (request, reply) => {
    const { booking_ids } = request.body as { booking_ids: string[] };
    const artistProfile = await db('artist_profiles').where({ user_id: request.user!.user_id }).first();
    if (!artistProfile) {
      return reply.status(404).send({
        success: false,
        data: null,
        errors: [{ code: 'NOT_FOUND', message: 'Artist profile not found' }],
      });
    }

    const result = await gigAdvisorV2Service.compareInquiries(artistProfile.id, booking_ids);
    return reply.send({ success: true, data: result, errors: [] });
  });
}
