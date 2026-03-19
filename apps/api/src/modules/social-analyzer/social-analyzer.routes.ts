import type { FastifyInstance } from 'fastify';
import { socialAnalyzerService } from './social-analyzer.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { analyzeSocialProfileSchema } from '@artist-booking/shared';

export async function socialAnalyzerRoutes(app: FastifyInstance) {
  /**
   * POST /v1/social-analyzer/analyze — Analyze a social media profile (stub)
   */
  app.post('/v1/social-analyzer/analyze', {
    preHandler: [authMiddleware, requirePermission('artist:create')],
  }, async (request, reply) => {
    const body = analyzeSocialProfileSchema.parse(request.body);
    const result = await socialAnalyzerService.analyze(
      request.user!.user_id,
      body.platform,
      body.profile_url,
    );

    return reply.status(201).send({
      success: true,
      data: result,
      errors: [],
    });
  });

  /**
   * GET /v1/social-analyzer/history — Get analysis history for current user
   */
  app.get('/v1/social-analyzer/history', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const history = await socialAnalyzerService.getHistory(request.user!.user_id);

    return reply.send({
      success: true,
      data: history,
      errors: [],
    });
  });
}
