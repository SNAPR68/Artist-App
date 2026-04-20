import type { FastifyInstance } from 'fastify';
import { conciergeService } from './concierge.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import { db } from '../../infrastructure/database.js';
import { conciergeSearchSchema, conciergeCreateBookingSchema } from '@artist-booking/shared';

const CONCIERGE_TOPICS = ['deal_help', 'artist_sourcing', 'negotiation', 'compliance', 'other'] as const;
type ConciergeTopic = typeof CONCIERGE_TOPICS[number];

export async function conciergeRoutes(app: FastifyInstance) {
  /**
   * POST /v1/concierge/search — Search artists on behalf of a client
   */
  app.post('/v1/concierge/search', {
    preHandler: [authMiddleware, requirePermission('concierge:manage'), rateLimit('SEARCH')],
  }, async (request, reply) => {
    const params = conciergeSearchSchema.parse(request.body);
    const artists = await conciergeService.searchOnBehalf(params);

    return reply.send({
      success: true,
      data: artists,
      errors: [],
    });
  });

  /**
   * POST /v1/concierge/bookings — Create booking on behalf of client
   */
  app.post('/v1/concierge/bookings', {
    preHandler: [authMiddleware, requirePermission('concierge:manage'), rateLimit('WRITE')],
  }, async (request, reply) => {
    const body = conciergeCreateBookingSchema.parse(request.body);

    const booking = await conciergeService.createBookingOnBehalf(
      request.user!.user_id,
      body.client_user_id,
      body as never,
    );

    return reply.status(201).send({
      success: true,
      data: booking,
      errors: [],
    });
  });

  /**
   * GET /v1/concierge/clients/:id/pipeline — Client booking pipeline
   */
  app.get('/v1/concierge/clients/:id/pipeline', {
    preHandler: [authMiddleware, requirePermission('concierge:manage')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const pipeline = await conciergeService.getClientPipeline(id);

    return reply.send({
      success: true,
      data: pipeline,
      errors: [],
    });
  });

  /**
   * GET /v1/concierge/stats — Dashboard stats
   */
  app.get('/v1/concierge/stats', {
    preHandler: [authMiddleware, requirePermission('concierge:manage')],
  }, async (_request, reply) => {
    const stats = await conciergeService.getStats();

    return reply.send({
      success: true,
      data: stats,
      errors: [],
    });
  });

  // ─── Agency-facing concierge request intake ──────────────────────

  /**
   * POST /v1/concierge/requests — Agency asks for concierge help.
   * Workspace owner/admin submits; specialists pick up from admin queue.
   */
  app.post('/v1/concierge/requests', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const body = request.body as {
      workspace_id: string;
      topic: ConciergeTopic;
      notes: string;
      event_date?: string;
      budget_paise?: number;
    };

    if (!body.workspace_id || !body.topic || !body.notes) {
      return reply.status(400).send({
        success: false,
        errors: [{ code: 'MISSING_FIELDS', message: 'workspace_id, topic and notes are required' }],
      });
    }
    if (!CONCIERGE_TOPICS.includes(body.topic)) {
      return reply.status(400).send({
        success: false,
        errors: [{ code: 'INVALID_TOPIC', message: `topic must be one of ${CONCIERGE_TOPICS.join(', ')}` }],
      });
    }

    const member = await db('workspace_members')
      .where({ workspace_id: body.workspace_id, user_id: request.user!.user_id, is_active: true })
      .first();
    if (!member) {
      return reply.status(403).send({
        success: false,
        errors: [{ code: 'NOT_MEMBER', message: 'You are not a member of this workspace' }],
      });
    }

    const [row] = await db('concierge_requests')
      .insert({
        workspace_id: body.workspace_id,
        requested_by: request.user!.user_id,
        topic: body.topic,
        notes: body.notes.slice(0, 2000),
        event_date: body.event_date ?? null,
        budget_paise: body.budget_paise ?? null,
        status: 'pending',
      })
      .returning('*');

    return reply.status(201).send({ success: true, data: row, errors: [] });
  });

  /**
   * GET /v1/concierge/requests?workspace_id=... — List requests for a workspace.
   */
  app.get('/v1/concierge/requests', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { workspace_id } = request.query as { workspace_id?: string };
    if (!workspace_id) {
      return reply.status(400).send({
        success: false,
        errors: [{ code: 'MISSING_WORKSPACE', message: 'workspace_id query param required' }],
      });
    }

    const member = await db('workspace_members')
      .where({ workspace_id, user_id: request.user!.user_id, is_active: true })
      .first();
    if (!member) {
      return reply.status(403).send({
        success: false,
        errors: [{ code: 'NOT_MEMBER', message: 'You are not a member of this workspace' }],
      });
    }

    const rows = await db('concierge_requests')
      .where({ workspace_id })
      .orderBy('created_at', 'desc')
      .limit(50);

    return reply.send({ success: true, data: rows, errors: [] });
  });

  /**
   * GET /v1/admin/concierge/requests — Admin queue (all pending/active requests).
   */
  app.get('/v1/admin/concierge/requests', {
    preHandler: [authMiddleware, requirePermission('concierge:manage')],
  }, async (_request, reply) => {
    const rows = await db('concierge_requests as cr')
      .leftJoin('workspaces as w', 'w.id', 'cr.workspace_id')
      .leftJoin('users as u', 'u.id', 'cr.requested_by')
      .whereIn('cr.status', ['pending', 'accepted', 'in_progress'])
      .select(
        'cr.*',
        'w.name as workspace_name',
        'u.phone as requester_phone',
      )
      .orderBy('cr.created_at', 'desc');
    return reply.send({ success: true, data: rows, errors: [] });
  });

  /**
   * PATCH /v1/admin/concierge/requests/:id — Update status/assignment.
   */
  app.patch<{ Params: { id: string } }>('/v1/admin/concierge/requests/:id', {
    preHandler: [authMiddleware, requirePermission('concierge:manage')],
  }, async (request, reply) => {
    const body = request.body as {
      status?: 'accepted' | 'in_progress' | 'completed' | 'cancelled';
      resolution_notes?: string;
    };
    const patch: Record<string, unknown> = { updated_at: new Date() };
    if (body.status) {
      patch.status = body.status;
      if (body.status === 'accepted') {
        patch.accepted_at = new Date();
        patch.assigned_to = request.user!.user_id;
      }
      if (body.status === 'completed' || body.status === 'cancelled') {
        patch.completed_at = new Date();
      }
    }
    if (body.resolution_notes) patch.resolution_notes = body.resolution_notes.slice(0, 2000);

    const [row] = await db('concierge_requests')
      .where({ id: request.params.id })
      .update(patch)
      .returning('*');
    if (!row) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Request not found' }],
      });
    }
    return reply.send({ success: true, data: row, errors: [] });
  });
}
