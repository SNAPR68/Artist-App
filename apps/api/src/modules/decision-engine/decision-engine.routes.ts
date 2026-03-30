import type { FastifyInstance } from 'fastify';
import { decisionEngineService, DecisionEngineError } from './decision-engine.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import {
  decisionBriefSchema,
  decisionProposalRequestSchema,
  decisionLockRequestSchema,
} from '@artist-booking/shared';

export async function decisionEngineRoutes(app: FastifyInstance) {
  /**
   * POST /v1/decision-engine/parse — Parse raw text into structured brief (no persistence).
   * Public, no auth required.
   */
  app.post('/v1/decision-engine/parse', {
    preHandler: [rateLimit('WRITE')],
  }, async (request, reply) => {
    try {
      const body = request.body as { raw_text?: string };
      if (!body.raw_text || body.raw_text.trim().length < 5) {
        return reply.status(400).send({
          success: false,
          data: null,
          errors: [{ code: 'VALIDATION_ERROR', message: 'raw_text must be at least 5 characters' }],
        });
      }

      const parsed = decisionEngineService.parseBrief(body.raw_text);
      return reply.send({ success: true, data: parsed, errors: [] });
    } catch (err) {
      if (err instanceof DecisionEngineError) {
        return reply.status(err.statusCode).send({
          success: false, data: null,
          errors: [{ code: err.code, message: err.message }],
        });
      }
      throw err;
    }
  });

  /**
   * POST /v1/decision-engine/brief — Create brief + compute recommendations.
   * Auth optional (userId will be null for anonymous users).
   */
  app.post('/v1/decision-engine/brief', {
    preHandler: [rateLimit('WRITE')],
  }, async (request, reply) => {
    try {
      const parsed = decisionBriefSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          data: null,
          errors: parsed.error.errors.map((e) => ({
            code: 'VALIDATION_ERROR',
            message: `${e.path.join('.')}: ${e.message}`,
          })),
        });
      }

      // Try to extract user from auth header (optional)
      let userId: string | null = null;
      try {
        const authHeader = request.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          // Attempt to decode — don't fail if invalid
          await (authMiddleware as any)(request, reply);
          userId = request.user?.user_id ?? null;
        }
      } catch {
        // Auth is optional for this endpoint
      }

      const result = await decisionEngineService.createBriefAndRecommend(userId, parsed.data);
      return reply.status(201).send({ success: true, data: result, errors: [] });
    } catch (err) {
      if (err instanceof DecisionEngineError) {
        return reply.status(err.statusCode).send({
          success: false, data: null,
          errors: [{ code: err.code, message: err.message }],
        });
      }
      throw err;
    }
  });

  /**
   * GET /v1/decision-engine/:briefId — Fetch brief + recommendations.
   */
  app.get('/v1/decision-engine/:briefId', {
    preHandler: [rateLimit('READ')],
  }, async (request, reply) => {
    try {
      const { briefId } = request.params as { briefId: string };
      const result = await decisionEngineService.getBrief(briefId);
      return reply.send({ success: true, data: result, errors: [] });
    } catch (err) {
      if (err instanceof DecisionEngineError) {
        return reply.status(err.statusCode).send({
          success: false, data: null,
          errors: [{ code: err.code, message: err.message }],
        });
      }
      throw err;
    }
  });

  /**
   * POST /v1/decision-engine/:briefId/proposal — Generate proposal for selected artists.
   * Auth required.
   */
  app.post('/v1/decision-engine/:briefId/proposal', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    try {
      const { briefId } = request.params as { briefId: string };
      const parsed = decisionProposalRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false, data: null,
          errors: parsed.error.errors.map((e) => ({
            code: 'VALIDATION_ERROR',
            message: `${e.path.join('.')}: ${e.message}`,
          })),
        });
      }

      const result = await decisionEngineService.generateProposal(
        briefId,
        request.user!.user_id,
        parsed.data,
      );
      return reply.status(201).send({ success: true, data: result, errors: [] });
    } catch (err) {
      if (err instanceof DecisionEngineError) {
        return reply.status(err.statusCode).send({
          success: false, data: null,
          errors: [{ code: err.code, message: err.message }],
        });
      }
      throw err;
    }
  });

  /**
   * POST /v1/decision-engine/:briefId/lock — Lock availability via concierge handoff.
   * Auth required.
   */
  app.post('/v1/decision-engine/:briefId/lock', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    try {
      const { briefId } = request.params as { briefId: string };
      const parsed = decisionLockRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false, data: null,
          errors: parsed.error.errors.map((e) => ({
            code: 'VALIDATION_ERROR',
            message: `${e.path.join('.')}: ${e.message}`,
          })),
        });
      }

      const result = await decisionEngineService.lockAvailability(
        briefId,
        request.user!.user_id,
        parsed.data,
      );
      return reply.status(201).send({ success: true, data: result, errors: [] });
    } catch (err) {
      if (err instanceof DecisionEngineError) {
        return reply.status(err.statusCode).send({
          success: false, data: null,
          errors: [{ code: err.code, message: err.message }],
        });
      }
      throw err;
    }
  });
}
