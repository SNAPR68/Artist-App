import type { FastifyInstance } from 'fastify';
import { clientService } from './client.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validateBody } from '../../middleware/validation.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import { createClientProfileSchema, updateClientProfileSchema } from '@artist-booking/shared';

export async function clientRoutes(app: FastifyInstance) {
  /**
   * POST /v1/clients/profile — Create client profile
   */
  app.post('/v1/clients/profile', {
    preHandler: [
      authMiddleware,
      requirePermission('client:create'),
      rateLimit('WRITE'),
      validateBody(createClientProfileSchema),
    ],
  }, async (request, reply) => {
    const profile = await clientService.createProfile(request.user!.user_id, request.body as never);

    return reply.status(201).send({
      success: true,
      data: profile,
      errors: [],
    });
  });

  /**
   * GET /v1/clients/profile — Get own profile
   */
  app.get('/v1/clients/profile', {
    preHandler: [authMiddleware, requirePermission('client:read_own')],
  }, async (request, reply) => {
    const profile = await clientService.getOwnProfile(request.user!.user_id);

    return reply.send({
      success: true,
      data: profile,
      errors: [],
    });
  });

  /**
   * PUT /v1/clients/profile — Update own profile
   */
  app.put('/v1/clients/profile', {
    preHandler: [
      authMiddleware,
      requirePermission('client:update_own'),
      rateLimit('WRITE'),
      validateBody(updateClientProfileSchema),
    ],
  }, async (request, reply) => {
    const profile = await clientService.updateProfile(request.user!.user_id, request.body as never);

    return reply.send({
      success: true,
      data: profile,
      errors: [],
    });
  });
}
