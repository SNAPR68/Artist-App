import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import { workspaceRepository } from '../workspace/workspace.repository.js';
import { dealVaultService, dealsToCsv, type DealSearchFilters } from './deal-vault.service.js';
import { db } from '../../infrastructure/database.js';

/**
 * Deal Vault routes — workspace-scoped.
 * CSV export is Pro-tier gated (workspaces.metadata->>'plan' = 'pro' or 'enterprise').
 */
export async function dealVaultRoutes(app: FastifyInstance) {
  /**
   * GET /v1/workspaces/:id/deals — paginated deal search
   */
  app.get<{ Params: { id: string }; Querystring: Record<string, string> }>(
    '/v1/workspaces/:id/deals',
    { preHandler: [authMiddleware, rateLimit('READ')] },
    async (request, reply) => {
      const { id: workspaceId } = request.params;
      const userId = request.user!.user_id;

      const member = await workspaceRepository.getMember(workspaceId, userId);
      if (!member || !member.is_active) {
        return reply.status(403).send({ success: false, errors: [{ code: 'NOT_WORKSPACE_MEMBER', message: 'Not a member of this workspace' }] });
      }

      const q = request.query;
      const filters: DealSearchFilters = {
        q: q.q,
        state: q.state,
        start_date: q.start_date,
        end_date: q.end_date,
        artist_id: q.artist_id,
        page: q.page ? parseInt(q.page, 10) : 1,
        per_page: q.per_page ? parseInt(q.per_page, 10) : 25,
      };

      const result = await dealVaultService.search(workspaceId, filters);

      return reply.send({
        success: true,
        data: result.rows,
        meta: {
          page: filters.page ?? 1,
          per_page: filters.per_page ?? 25,
          total: result.total,
          total_pages: Math.ceil(result.total / (filters.per_page ?? 25)),
        },
        errors: [],
      });
    },
  );

  /**
   * GET /v1/workspaces/:id/deals/summary — aggregate stats (total volume, unique artists, etc)
   */
  app.get<{ Params: { id: string } }>(
    '/v1/workspaces/:id/deals/summary',
    { preHandler: [authMiddleware, rateLimit('READ')] },
    async (request, reply) => {
      const { id: workspaceId } = request.params;
      const userId = request.user!.user_id;

      const member = await workspaceRepository.getMember(workspaceId, userId);
      if (!member || !member.is_active) {
        return reply.status(403).send({ success: false, errors: [{ code: 'NOT_WORKSPACE_MEMBER', message: 'Not a member' }] });
      }

      const summary = await dealVaultService.summary(workspaceId);
      return reply.send({ success: true, data: summary, errors: [] });
    },
  );

  /**
   * GET /v1/workspaces/:id/deals/export.csv — Pro-gated CSV download.
   * The export is the moat — agencies won't migrate off GRID if the vault is locked up here.
   */
  app.get<{ Params: { id: string }; Querystring: Record<string, string> }>(
    '/v1/workspaces/:id/deals/export.csv',
    { preHandler: [authMiddleware, rateLimit('READ')] },
    async (request, reply) => {
      const { id: workspaceId } = request.params;
      const userId = request.user!.user_id;

      const member = await workspaceRepository.getMember(workspaceId, userId);
      if (!member || !member.is_active) {
        return reply.status(403).send({ success: false, errors: [{ code: 'NOT_WORKSPACE_MEMBER', message: 'Not a member' }] });
      }

      // Pro-gate: check workspaces.metadata->>'plan'
      const workspace = await db('workspaces').where({ id: workspaceId }).first();
      const meta = typeof workspace?.metadata === 'string' ? JSON.parse(workspace.metadata) : (workspace?.metadata ?? {});
      const plan = (meta as Record<string, unknown>).plan as string | undefined;
      if (plan !== 'pro' && plan !== 'enterprise') {
        return reply.status(402).send({
          success: false,
          errors: [{ code: 'UPGRADE_REQUIRED', message: 'CSV export is available on the Pro plan. Upgrade to export your deal history.' }],
        });
      }

      const q = request.query;
      const filters: DealSearchFilters = {
        q: q.q,
        state: q.state,
        start_date: q.start_date,
        end_date: q.end_date,
        artist_id: q.artist_id,
      };

      const rows = await dealVaultService.exportAll(workspaceId, filters);
      const csv = dealsToCsv(rows);

      const stamp = new Date().toISOString().split('T')[0];
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="grid-deals-${stamp}.csv"`);
      return reply.send(csv);
    },
  );
}
