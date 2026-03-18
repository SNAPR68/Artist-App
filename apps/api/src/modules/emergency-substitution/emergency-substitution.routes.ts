import type { FastifyInstance } from 'fastify';
import { emergencySubstitutionService } from './emergency-substitution.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validateBody } from '../../middleware/validation.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import {
  createSubstitutionRequestSchema,
  respondSubstitutionSchema,
  updateBackupPreferencesSchema,
} from '@artist-booking/shared';

export async function emergencySubstitutionRoutes(app: FastifyInstance) {

  // ─── Substitution Requests ──────────────────────────────────

  /**
   * POST /v1/substitutions — Create a substitution request
   */
  app.post('/v1/substitutions', {
    preHandler: [
      authMiddleware,
      requirePermission('substitution:create'),
      rateLimit('WRITE'),
      validateBody(createSubstitutionRequestSchema),
    ],
  }, async (request, reply) => {
    const { original_booking_id, urgency_level } = request.body as {
      original_booking_id: string;
      urgency_level?: string;
    };

    const result = await emergencySubstitutionService.createRequest(
      request.user!.user_id,
      original_booking_id,
      urgency_level,
    );

    return reply.status(201).send({
      success: true,
      data: result,
      errors: [],
    });
  });

  /**
   * GET /v1/substitutions — List my substitution requests
   */
  app.get('/v1/substitutions', {
    preHandler: [authMiddleware, requirePermission('substitution:read')],
  }, async (request, reply) => {
    const requests = await emergencySubstitutionService.getMyRequests(request.user!.user_id);

    return reply.send({
      success: true,
      data: requests,
      errors: [],
    });
  });

  /**
   * GET /v1/substitutions/:id — Get substitution request details
   */
  app.get('/v1/substitutions/:id', {
    preHandler: [authMiddleware, requirePermission('substitution:read')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await emergencySubstitutionService.getRequest(id, request.user!.user_id);

    return reply.send({
      success: true,
      data: result,
      errors: [],
    });
  });

  /**
   * POST /v1/substitutions/:id/candidates/:candidateId/accept — Accept substitution
   */
  app.post('/v1/substitutions/:id/candidates/:candidateId/accept', {
    preHandler: [authMiddleware, requirePermission('substitution:respond'), rateLimit('WRITE')],
  }, async (request, reply) => {
    const { candidateId } = request.params as { id: string; candidateId: string };
    const result = await emergencySubstitutionService.acceptSubstitution(
      candidateId,
      request.user!.user_id,
    );

    return reply.send({
      success: true,
      data: result,
      errors: [],
    });
  });

  /**
   * POST /v1/substitutions/:id/candidates/:candidateId/decline — Decline substitution
   */
  app.post('/v1/substitutions/:id/candidates/:candidateId/decline', {
    preHandler: [
      authMiddleware,
      requirePermission('substitution:respond'),
      rateLimit('WRITE'),
      validateBody(respondSubstitutionSchema),
    ],
  }, async (request, reply) => {
    const { candidateId } = request.params as { id: string; candidateId: string };
    const { decline_reason } = request.body as { decline_reason?: string };
    const result = await emergencySubstitutionService.declineSubstitution(
      candidateId,
      request.user!.user_id,
      decline_reason,
    );

    return reply.send({
      success: true,
      data: result,
      errors: [],
    });
  });

  // ─── Backup Preferences ─────────────────────────────────────

  /**
   * PUT /v1/artists/me/backup-preferences — Update backup preferences
   */
  app.put('/v1/artists/me/backup-preferences', {
    preHandler: [
      authMiddleware,
      requirePermission('substitution:respond'),
      rateLimit('WRITE'),
      validateBody(updateBackupPreferencesSchema),
    ],
  }, async (request, reply) => {
    const { is_reliable_backup, backup_premium_pct } = request.body as {
      is_reliable_backup: boolean;
      backup_premium_pct: number;
    };

    const result = await emergencySubstitutionService.updateBackupPreferences(
      request.user!.user_id,
      is_reliable_backup,
      backup_premium_pct,
    );

    return reply.send({
      success: true,
      data: result,
      errors: [],
    });
  });

  /**
   * GET /v1/artists/me/backup-preferences — Get backup preferences
   */
  app.get('/v1/artists/me/backup-preferences', {
    preHandler: [authMiddleware, requirePermission('substitution:respond')],
  }, async (request, reply) => {
    const result = await emergencySubstitutionService.getBackupPreferences(request.user!.user_id);

    return reply.send({
      success: true,
      data: result,
      errors: [],
    });
  });
}
