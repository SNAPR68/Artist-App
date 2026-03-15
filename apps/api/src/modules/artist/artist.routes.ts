import type { FastifyInstance } from 'fastify';
import { artistService } from './artist.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validateBody } from '../../middleware/validation.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import {
  createArtistProfileSchema,
  updateArtistProfileSchema,
  PAGINATION,
} from '@artist-booking/shared';
export async function artistRoutes(app: FastifyInstance) {
  /**
   * POST /v1/artists/profile — Create artist profile
   */
  app.post('/v1/artists/profile', {
    preHandler: [
      authMiddleware,
      requirePermission('artist:create'),
      rateLimit('WRITE'),
      validateBody(createArtistProfileSchema),
    ],
  }, async (request, reply) => {
    const profile = await artistService.createProfile(request.user!.user_id, request.body as never);

    return reply.status(201).send({
      success: true,
      data: profile,
      errors: [],
    });
  });

  /**
   * GET /v1/artists/profile — Get own profile (authenticated artist)
   */
  app.get('/v1/artists/profile', {
    preHandler: [authMiddleware, requirePermission('artist:read_own')],
  }, async (request, reply) => {
    const profile = await artistService.getOwnProfile(request.user!.user_id);

    return reply.send({
      success: true,
      data: profile,
      errors: [],
    });
  });

  /**
   * PUT /v1/artists/profile — Update own profile
   */
  app.put('/v1/artists/profile', {
    preHandler: [
      authMiddleware,
      requirePermission('artist:update_own'),
      rateLimit('WRITE'),
      validateBody(updateArtistProfileSchema),
    ],
  }, async (request, reply) => {
    const profile = await artistService.updateProfile(request.user!.user_id, request.body as never);

    return reply.send({
      success: true,
      data: profile,
      errors: [],
    });
  });

  /**
   * GET /v1/artists/:id — Public artist profile
   */
  app.get('/v1/artists/:id', {
    preHandler: [rateLimit('READ')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const profile = await artistService.getPublicProfile(id);

    return reply.send({
      success: true,
      data: profile,
      errors: [],
    });
  });

  /**
   * GET /v1/artists — List artists (paginated)
   */
  app.get('/v1/artists', {
    preHandler: [rateLimit('READ')],
  }, async (request, reply) => {
    const query = request.query as Record<string, string>;
    const page = Math.max(1, parseInt(query.page ?? '1'));
    const per_page = Math.min(PAGINATION.MAX_PER_PAGE, Math.max(1, parseInt(query.per_page ?? '20')));

    const result = await artistService.listArtists({
      page,
      per_page,
      city: query.city,
      genre: query.genre,
    });

    return reply.send({
      success: true,
      data: result.data,
      meta: {
        page,
        per_page,
        total: result.total,
        total_pages: Math.ceil(result.total / per_page),
      },
      errors: [],
    });
  });
}
