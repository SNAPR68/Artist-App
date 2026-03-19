import type { FastifyInstance } from 'fastify';
import { gamificationService, GamificationError } from './gamification.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';

interface ClaimBadgeBody {
  badge_type: string;
}

function isClaimBadgeBody(body: unknown): body is ClaimBadgeBody {
  const b = body as Record<string, unknown>;
  return typeof b?.badge_type === 'string' && b.badge_type.length > 0;
}

export async function gamificationRoutes(app: FastifyInstance) {
  /**
   * GET /v1/gamification/profile — Current user's gamification profile
   */
  app.get('/v1/gamification/profile', {
    preHandler: [authMiddleware, requirePermission('gamification:read')],
  }, async (request, reply) => {
    try {
      const profile = await gamificationService.getProfile(request.user!.user_id);
      return reply.send({ success: true, data: profile, errors: [] });
    } catch (err) {
      if (err instanceof GamificationError) {
        return reply.status(err.statusCode).send({
          success: false,
          data: null,
          errors: [{ code: err.code, message: err.message }],
        });
      }
      throw err;
    }
  });

  /**
   * GET /v1/gamification/leaderboard — Anonymous level distribution
   */
  app.get('/v1/gamification/leaderboard', {
    preHandler: [authMiddleware, requirePermission('gamification:read')],
  }, async (_request, reply) => {
    try {
      const leaderboard = await gamificationService.getLeaderboard();
      return reply.send({ success: true, data: leaderboard, errors: [] });
    } catch (err) {
      if (err instanceof GamificationError) {
        return reply.status(err.statusCode).send({
          success: false,
          data: null,
          errors: [{ code: err.code, message: err.message }],
        });
      }
      throw err;
    }
  });

  /**
   * POST /v1/gamification/claim-badge — Claim an earned badge
   */
  app.post('/v1/gamification/claim-badge', {
    preHandler: [authMiddleware, requirePermission('gamification:claim_badge')],
  }, async (request, reply) => {
    try {
      if (!isClaimBadgeBody(request.body)) {
        return reply.status(400).send({
          success: false,
          data: null,
          errors: [{ code: 'VALIDATION_ERROR', message: 'badge_type is required and must be a non-empty string' }],
        });
      }

      const result = await gamificationService.claimBadge(
        request.user!.user_id,
        request.body.badge_type,
      );
      return reply.send({ success: true, data: result, errors: [] });
    } catch (err) {
      if (err instanceof GamificationError) {
        return reply.status(err.statusCode).send({
          success: false,
          data: null,
          errors: [{ code: err.code, message: err.message }],
        });
      }
      throw err;
    }
  });

  /**
   * GET /v1/gamification/transactions — Recent point transactions
   */
  app.get('/v1/gamification/transactions', {
    preHandler: [authMiddleware, requirePermission('gamification:read')],
  }, async (request, reply) => {
    try {
      const transactions = await gamificationService.getProfile(request.user!.user_id);
      const history = await (await import('./gamification.repository.js')).gamificationRepository.getTransactions(request.user!.user_id);
      return reply.send({
        success: true,
        data: { profile: transactions, transactions: history },
        errors: [],
      });
    } catch (err) {
      if (err instanceof GamificationError) {
        return reply.status(err.statusCode).send({
          success: false,
          data: null,
          errors: [{ code: err.code, message: err.message }],
        });
      }
      throw err;
    }
  });
}
