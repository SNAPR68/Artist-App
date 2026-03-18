import type { FastifyInstance } from 'fastify';
import { voiceQueryService } from './voice-query.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validateBody, validateQuery } from '../../middleware/validation.middleware.js';
import { voiceQuerySchema, voiceSessionQuerySchema } from '@artist-booking/shared';

export async function voiceQueryRoutes(app: FastifyInstance) {

  // ─── Query ──────────────────────────────────────────────────

  /**
   * POST /v1/voice/query — Process a voice query
   */
  app.post('/v1/voice/query', {
    preHandler: [authMiddleware, requirePermission('voice:query'), validateBody(voiceQuerySchema)],
  }, async (request, reply) => {
    const { text, session_id } = request.body as { text: string; session_id?: string };
    const result = await voiceQueryService.processQuery(request.user!.user_id, text, session_id);

    return reply.send({
      success: true,
      data: result,
      errors: [],
    });
  });

  // ─── Sessions ───────────────────────────────────────────────

  /**
   * GET /v1/voice/sessions — List voice sessions for current user
   */
  app.get('/v1/voice/sessions', {
    preHandler: [authMiddleware, requirePermission('voice:manage_sessions'), validateQuery(voiceSessionQuerySchema)],
  }, async (request, reply) => {
    const { limit } = request.query as { limit?: number };
    const sessions = await voiceQueryService.getSessions(request.user!.user_id, limit);

    return reply.send({
      success: true,
      data: sessions,
      errors: [],
    });
  });

  /**
   * GET /v1/voice/sessions/:id — Get session detail with messages
   */
  app.get('/v1/voice/sessions/:id', {
    preHandler: [authMiddleware, requirePermission('voice:manage_sessions')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = await voiceQueryService.getSession(id, request.user!.user_id);

    return reply.send({
      success: true,
      data: session,
      errors: [],
    });
  });

  /**
   * DELETE /v1/voice/sessions/:id — End a voice session
   */
  app.delete('/v1/voice/sessions/:id', {
    preHandler: [authMiddleware, requirePermission('voice:manage_sessions')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await voiceQueryService.endSession(id, request.user!.user_id);

    return reply.send({
      success: true,
      data: { ended: true },
      errors: [],
    });
  });

  // ─── Suggestions ────────────────────────────────────────────

  /**
   * GET /v1/voice/suggestions — Get context-aware quick actions
   */
  app.get('/v1/voice/suggestions', {
    preHandler: [authMiddleware, requirePermission('voice:query')],
  }, async (request, reply) => {
    const suggestions = await voiceQueryService.getSuggestions(request.user!.user_id);

    return reply.send({
      success: true,
      data: { suggestions },
      errors: [],
    });
  });
}
