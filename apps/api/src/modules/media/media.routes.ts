import type { FastifyInstance } from 'fastify';
import { mediaService } from './media.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validateBody } from '../../middleware/validation.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import { requestUploadUrlSchema } from '@artist-booking/shared';

export async function mediaRoutes(app: FastifyInstance) {
  /**
   * POST /v1/media/upload-url — Get pre-signed upload URL
   */
  app.post('/v1/media/upload-url', {
    preHandler: [
      authMiddleware,
      requirePermission('media:upload'),
      rateLimit('WRITE'),
      validateBody(requestUploadUrlSchema),
    ],
  }, async (request, reply) => {
    const result = await mediaService.requestUploadUrl(
      request.user!.user_id,
      request.body as { content_type: string; file_size_bytes: number },
    );

    return reply.send({
      success: true,
      data: result,
      errors: [],
    });
  });

  /**
   * POST /v1/media/confirm — Confirm upload and create media record
   */
  app.post('/v1/media/confirm', {
    preHandler: [
      authMiddleware,
      requirePermission('media:upload'),
      rateLimit('WRITE'),
    ],
  }, async (request, reply) => {
    const body = request.body as {
      s3_key: string;
      media_type: 'image' | 'video';
      content_type: string;
      file_size_bytes: number;
    };

    const item = await mediaService.confirmUpload(request.user!.user_id, body);

    return reply.status(201).send({
      success: true,
      data: item,
      errors: [],
    });
  });

  /**
   * DELETE /v1/media/:id — Delete media item
   */
  app.delete('/v1/media/:id', {
    preHandler: [
      authMiddleware,
      requirePermission('media:delete_own'),
      rateLimit('WRITE'),
    ],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await mediaService.deleteMedia(request.user!.user_id, id);

    return reply.send({
      success: true,
      data: { deleted: true },
      errors: [],
    });
  });

  /**
   * PUT /v1/media/reorder — Reorder media items
   */
  app.put('/v1/media/reorder', {
    preHandler: [
      authMiddleware,
      requirePermission('media:upload'),
      rateLimit('WRITE'),
    ],
  }, async (request, reply) => {
    const { item_ids } = request.body as { item_ids: string[] };
    const items = await mediaService.reorderMedia(request.user!.user_id, item_ids);

    return reply.send({
      success: true,
      data: items,
      errors: [],
    });
  });
}
