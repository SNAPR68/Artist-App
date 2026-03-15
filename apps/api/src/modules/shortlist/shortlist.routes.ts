import type { FastifyInstance } from 'fastify';
import { shortlistService } from './shortlist.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';

export async function shortlistRoutes(app: FastifyInstance) {
  /**
   * POST /v1/shortlists — Create shortlist
   */
  app.post('/v1/shortlists', {
    preHandler: [authMiddleware, requirePermission('shortlist:manage'), rateLimit('WRITE')],
  }, async (request, reply) => {
    const { name } = request.body as { name: string };
    const shortlist = await shortlistService.createShortlist(request.user!.user_id, name);

    return reply.status(201).send({
      success: true,
      data: shortlist,
      errors: [],
    });
  });

  /**
   * GET /v1/shortlists — List own shortlists
   */
  app.get('/v1/shortlists', {
    preHandler: [authMiddleware, requirePermission('shortlist:manage')],
  }, async (request, reply) => {
    const shortlists = await shortlistService.getUserShortlists(request.user!.user_id);

    return reply.send({
      success: true,
      data: shortlists,
      errors: [],
    });
  });

  /**
   * GET /v1/shortlists/:id — Get shortlist with artists
   */
  app.get('/v1/shortlists/:id', {
    preHandler: [authMiddleware, requirePermission('shortlist:manage')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const shortlist = await shortlistService.getShortlistWithArtists(request.user!.user_id, id);

    return reply.send({
      success: true,
      data: shortlist,
      errors: [],
    });
  });

  /**
   * POST /v1/shortlists/:id/artists — Add artist to shortlist
   */
  app.post('/v1/shortlists/:id/artists', {
    preHandler: [authMiddleware, requirePermission('shortlist:manage'), rateLimit('WRITE')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { artist_id, notes } = request.body as { artist_id: string; notes?: string };
    const entry = await shortlistService.addArtist(request.user!.user_id, id, artist_id, notes);

    return reply.status(201).send({
      success: true,
      data: entry,
      errors: [],
    });
  });

  /**
   * DELETE /v1/shortlists/:id/artists/:artistId — Remove artist
   */
  app.delete('/v1/shortlists/:id/artists/:artistId', {
    preHandler: [authMiddleware, requirePermission('shortlist:manage'), rateLimit('WRITE')],
  }, async (request, reply) => {
    const { id, artistId } = request.params as { id: string; artistId: string };
    await shortlistService.removeArtist(request.user!.user_id, id, artistId);

    return reply.send({
      success: true,
      data: { removed: true },
      errors: [],
    });
  });

  /**
   * DELETE /v1/shortlists/:id — Delete shortlist
   */
  app.delete('/v1/shortlists/:id', {
    preHandler: [authMiddleware, requirePermission('shortlist:manage'), rateLimit('WRITE')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await shortlistService.deleteShortlist(request.user!.user_id, id);

    return reply.send({
      success: true,
      data: { deleted: true },
      errors: [],
    });
  });
}
