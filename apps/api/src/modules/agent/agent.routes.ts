import type { FastifyInstance } from 'fastify';
import { agentService } from './agent.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';

export async function agentRoutes(app: FastifyInstance) {
  /**
   * POST /v1/agents/profile — Create agent profile
   */
  app.post('/v1/agents/profile', {
    preHandler: [authMiddleware, requirePermission('agent:create'), rateLimit('WRITE')],
  }, async (request, reply) => {
    const data = request.body as {
      agency_name: string;
      contact_person: string;
      phone: string;
      email: string;
      city: string;
      commission_pct?: number;
      bio?: string;
    };

    const profile = await agentService.createProfile(request.user!.user_id, data);

    return reply.status(201).send({
      success: true,
      data: profile,
      errors: [],
    });
  });

  /**
   * GET /v1/agents/profile — Get own agent profile
   */
  app.get('/v1/agents/profile', {
    preHandler: [authMiddleware, requirePermission('agent:read_own')],
  }, async (request, reply) => {
    const profile = await agentService.getProfile(request.user!.user_id);

    return reply.send({
      success: true,
      data: profile,
      errors: [],
    });
  });

  /**
   * PUT /v1/agents/profile — Update agent profile
   */
  app.put('/v1/agents/profile', {
    preHandler: [authMiddleware, requirePermission('agent:update_own'), rateLimit('WRITE')],
  }, async (request, reply) => {
    const data = request.body as Record<string, unknown>;
    const profile = await agentService.updateProfile(request.user!.user_id, data);

    return reply.send({
      success: true,
      data: profile,
      errors: [],
    });
  });

  /**
   * GET /v1/agents/roster — Get artist roster
   */
  app.get('/v1/agents/roster', {
    preHandler: [authMiddleware, requirePermission('agent:manage_roster')],
  }, async (request, reply) => {
    const roster = await agentService.getRoster(request.user!.user_id);

    return reply.send({
      success: true,
      data: roster,
      errors: [],
    });
  });

  /**
   * POST /v1/agents/roster — Add artist to roster
   */
  app.post('/v1/agents/roster', {
    preHandler: [authMiddleware, requirePermission('agent:manage_roster'), rateLimit('WRITE')],
  }, async (request, reply) => {
    const { artist_id } = request.body as { artist_id: string };
    const link = await agentService.addArtistToRoster(request.user!.user_id, artist_id);

    return reply.status(201).send({
      success: true,
      data: link,
      errors: [],
    });
  });

  /**
   * DELETE /v1/agents/roster/:artistId — Remove artist from roster
   */
  app.delete('/v1/agents/roster/:artistId', {
    preHandler: [authMiddleware, requirePermission('agent:manage_roster')],
  }, async (request, reply) => {
    const { artistId } = request.params as { artistId: string };
    const result = await agentService.removeArtistFromRoster(request.user!.user_id, artistId);

    return reply.send({
      success: true,
      data: result,
      errors: [],
    });
  });

  /**
   * GET /v1/agents/commissions — Commission dashboard summary
   */
  app.get('/v1/agents/commissions', {
    preHandler: [authMiddleware, requirePermission('agent:read_own')],
  }, async (request, reply) => {
    const data = await agentService.getCommissionDashboard(request.user!.user_id);

    return reply.send({ success: true, data, errors: [] });
  });

  /**
   * GET /v1/agents/commissions/history — Commission history (paginated)
   */
  app.get('/v1/agents/commissions/history', {
    preHandler: [authMiddleware, requirePermission('agent:read_own')],
  }, async (request, reply) => {
    const { limit, offset } = request.query as { limit?: string; offset?: string };
    const data = await agentService.getCommissionHistory(
      request.user!.user_id,
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined,
    );

    return reply.send({ success: true, data, errors: [] });
  });

  /**
   * GET /v1/agents/roster/performance — Roster performance breakdown
   */
  app.get('/v1/agents/roster/performance', {
    preHandler: [authMiddleware, requirePermission('agent:manage_roster')],
  }, async (request, reply) => {
    const data = await agentService.getRosterPerformance(request.user!.user_id);

    return reply.send({ success: true, data, errors: [] });
  });
}
