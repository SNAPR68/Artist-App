import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { db } from '../../infrastructure/database.js';

export async function notificationRoutes(app: FastifyInstance) {
  /** GET /v1/notifications — List user notifications */
  app.get('/v1/notifications', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const query = request.query as { unread?: string; page?: string; per_page?: string };
    const page = parseInt(query.page ?? '1', 10);
    const perPage = parseInt(query.per_page ?? '20', 10);
    const offset = (page - 1) * perPage;

    let q = db('notifications')
      .where({ user_id: request.user!.user_id })
      .orderBy('created_at', 'desc');

    if (query.unread === 'true') {
      q = q.where({ read_at: null });
    }

    const notifications = await q.offset(offset).limit(perPage);

    return reply.send({
      success: true,
      data: notifications,
      meta: { page, per_page: perPage },
      errors: [],
    });
  });

  /** PUT /v1/notifications/:id/read — Mark notification as read */
  app.put('/v1/notifications/:id/read', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await db('notifications')
      .where({ id, user_id: request.user!.user_id })
      .update({ read_at: new Date() });

    return reply.send({ success: true, data: { read: true }, errors: [] });
  });

  /** GET /v1/notifications/preferences — Get notification preferences */
  app.get('/v1/notifications/preferences', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const prefs = await db('notification_preferences')
      .where({ user_id: request.user!.user_id })
      .first();

    return reply.send({
      success: true,
      data: prefs ?? {
        whatsapp: true,
        sms: true,
        push: true,
        email: false,
      },
      errors: [],
    });
  });

  /** PUT /v1/notifications/preferences — Update notification preferences */
  app.put('/v1/notifications/preferences', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const body = request.body as { whatsapp?: boolean; sms?: boolean; push?: boolean; email?: boolean };

    await db('notification_preferences')
      .insert({
        user_id: request.user!.user_id,
        ...body,
      })
      .onConflict('user_id')
      .merge(body);

    return reply.send({ success: true, data: body, errors: [] });
  });
}
