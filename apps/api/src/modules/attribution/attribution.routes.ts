import type { FastifyInstance } from 'fastify';
import { attributionService } from './attribution.service.js';
import { workspaceRepository } from '../workspace/workspace.repository.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';

export async function attributionRoutes(app: FastifyInstance) {
  /**
   * GET /v1/workspaces/:id/attribution/summary
   * Total attributed commission earned by this workspace (agent-of-record moat view).
   */
  app.get<{ Params: { id: string } }>('/v1/workspaces/:id/attribution/summary', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (req, reply) => {
    const { id } = req.params;
    const userId = req.user!.user_id;

    const member = await workspaceRepository.getMember(id, userId);
    if (!member) return reply.status(403).send({ success: false, errors: [{ code: 'FORBIDDEN', message: 'Not a workspace member' }] });

    const summary = await attributionService.getWorkspaceEarnings(id);
    return { success: true, data: summary };
  });

  /**
   * GET /v1/workspaces/:id/attribution/commissions
   * Audit list of attributed commissions.
   */
  app.get<{ Params: { id: string } }>('/v1/workspaces/:id/attribution/commissions', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (req, reply) => {
    const { id } = req.params;
    const userId = req.user!.user_id;

    const member = await workspaceRepository.getMember(id, userId);
    if (!member) return reply.status(403).send({ success: false, errors: [{ code: 'FORBIDDEN', message: 'Not a workspace member' }] });

    const rows = await attributionService.listWorkspaceCommissions(id);
    return { success: true, data: rows };
  });
}
