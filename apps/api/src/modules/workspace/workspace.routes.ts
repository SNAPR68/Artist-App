import type { FastifyInstance } from 'fastify';
import { workspaceService } from './workspace.service.js';
import { generatePresentationPdf } from './presentation-pdf.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validateBody, validateQuery } from '../../middleware/validation.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  inviteWorkspaceMemberSchema,
  updateWorkspaceMemberSchema,
  createWorkspaceEventSchema,
  updateWorkspaceEventSchema,
  linkBookingsToEventSchema,
  createPresentationSchema,
  bulkActionSchema,
  workspacePipelineQuerySchema,
  updateWorkspaceCommissionSchema,
  updateBookingCommissionSchema,
} from '@artist-booking/shared';

export async function workspaceRoutes(app: FastifyInstance) {

  // ─── Workspace CRUD ─────────────────────────────────────────

  /**
   * POST /v1/workspaces — Create a workspace
   */
  app.post('/v1/workspaces', {
    preHandler: [authMiddleware, requirePermission('workspace:create'), rateLimit('WRITE'), validateBody(createWorkspaceSchema)],
  }, async (request, reply) => {
    const workspace = await workspaceService.createWorkspace(request.user!.user_id, request.body as never);

    return reply.status(201).send({
      success: true,
      data: workspace,
      errors: [],
    });
  });

  /**
   * GET /v1/workspaces — List workspaces for current user
   */
  app.get('/v1/workspaces', {
    preHandler: [authMiddleware, requirePermission('workspace:read')],
  }, async (request, reply) => {
    const workspaces = await workspaceService.getWorkspaces(request.user!.user_id);

    return reply.send({
      success: true,
      data: workspaces,
      errors: [],
    });
  });

  /**
   * GET /v1/workspaces/:id — Get workspace details
   */
  app.get('/v1/workspaces/:id', {
    preHandler: [authMiddleware, requirePermission('workspace:read')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const workspace = await workspaceService.getWorkspace(request.user!.user_id, id);

    return reply.send({
      success: true,
      data: workspace,
      errors: [],
    });
  });

  /**
   * PUT /v1/workspaces/:id — Update workspace
   */
  app.put('/v1/workspaces/:id', {
    preHandler: [authMiddleware, requirePermission('workspace:manage'), rateLimit('WRITE'), validateBody(updateWorkspaceSchema)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const workspace = await workspaceService.updateWorkspace(request.user!.user_id, id, request.body as never);

    return reply.send({
      success: true,
      data: workspace,
      errors: [],
    });
  });

  // ─── Members ────────────────────────────────────────────────

  /**
   * POST /v1/workspaces/:id/members — Invite team member
   */
  app.post('/v1/workspaces/:id/members', {
    preHandler: [authMiddleware, requirePermission('workspace:invite'), rateLimit('WRITE'), validateBody(inviteWorkspaceMemberSchema)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { phone, role } = request.body as { phone: string; role: string };
    const member = await workspaceService.inviteTeamMember(id, request.user!.user_id, phone, role);

    return reply.status(201).send({
      success: true,
      data: member,
      errors: [],
    });
  });

  /**
   * GET /v1/workspaces/:id/members — List members
   */
  app.get('/v1/workspaces/:id/members', {
    preHandler: [authMiddleware, requirePermission('workspace:read')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const members = await workspaceService.getMembers(id, request.user!.user_id);

    return reply.send({
      success: true,
      data: members,
      errors: [],
    });
  });

  /**
   * PUT /v1/workspaces/:id/members/:userId — Update member role
   */
  app.put('/v1/workspaces/:id/members/:userId', {
    preHandler: [authMiddleware, requirePermission('workspace:manage'), rateLimit('WRITE'), validateBody(updateWorkspaceMemberSchema)],
  }, async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string };
    const { role } = request.body as { role: string };
    const member = await workspaceService.updateMemberRole(id, request.user!.user_id, userId, role);

    return reply.send({
      success: true,
      data: member,
      errors: [],
    });
  });

  /**
   * DELETE /v1/workspaces/:id/members/:userId — Remove member
   */
  app.delete('/v1/workspaces/:id/members/:userId', {
    preHandler: [authMiddleware, requirePermission('workspace:manage'), rateLimit('WRITE')],
  }, async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string };
    await workspaceService.removeMember(id, request.user!.user_id, userId);

    return reply.send({
      success: true,
      data: { removed: true },
      errors: [],
    });
  });

  /**
   * POST /v1/workspaces/:id/members/accept — Accept invitation
   */
  app.post('/v1/workspaces/:id/members/accept', {
    preHandler: [authMiddleware, requirePermission('workspace:read')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const member = await workspaceService.acceptInvitation(id, request.user!.user_id);

    return reply.send({
      success: true,
      data: member,
      errors: [],
    });
  });

  // ─── Pipeline ───────────────────────────────────────────────

  /**
   * GET /v1/workspaces/:id/pipeline — Booking pipeline view
   */
  app.get('/v1/workspaces/:id/pipeline', {
    preHandler: [authMiddleware, requirePermission('workspace:read'), validateQuery(workspacePipelineQuerySchema)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const filters = request.query as {
      state?: string;
      event_type?: string;
      start_date?: string;
      end_date?: string;
      page?: number;
      per_page?: number;
    };

    const pipeline = await workspaceService.getBookingPipeline(id, request.user!.user_id, filters);

    return reply.send({
      success: true,
      data: pipeline,
      errors: [],
    });
  });

  /**
   * POST /v1/workspaces/:id/bulk-actions — Bulk update bookings
   */
  app.post('/v1/workspaces/:id/bulk-actions', {
    preHandler: [authMiddleware, requirePermission('workspace:bulk_actions'), rateLimit('WRITE'), validateBody(bulkActionSchema)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { booking_ids, action } = request.body as { booking_ids: string[]; action: string };

    const result = await workspaceService.bulkUpdateBookingState(id, request.user!.user_id, booking_ids, action);

    return reply.send({
      success: true,
      data: result,
      errors: [],
    });
  });

  // ─── Events ─────────────────────────────────────────────────

  /**
   * POST /v1/workspaces/:id/events — Create event
   */
  app.post('/v1/workspaces/:id/events', {
    preHandler: [authMiddleware, requirePermission('workspace:events'), rateLimit('WRITE'), validateBody(createWorkspaceEventSchema)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const event = await workspaceService.createEvent(id, request.user!.user_id, request.body as never);

    return reply.status(201).send({
      success: true,
      data: event,
      errors: [],
    });
  });

  /**
   * GET /v1/workspaces/:id/events — List events
   */
  app.get('/v1/workspaces/:id/events', {
    preHandler: [authMiddleware, requirePermission('workspace:read')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const filters = request.query as { status?: string; start_date?: string; end_date?: string; page?: number; per_page?: number };

    const result = await workspaceService.getEvents(id, request.user!.user_id, filters);

    return reply.send({
      success: true,
      data: result,
      errors: [],
    });
  });

  /**
   * GET /v1/workspaces/:id/events/:eventId — Get event with bookings
   */
  app.get('/v1/workspaces/:id/events/:eventId', {
    preHandler: [authMiddleware, requirePermission('workspace:read')],
  }, async (request, reply) => {
    const { id, eventId } = request.params as { id: string; eventId: string };
    const event = await workspaceService.getEventWithBookings(id, request.user!.user_id, eventId);

    return reply.send({
      success: true,
      data: event,
      errors: [],
    });
  });

  /**
   * PUT /v1/workspaces/:id/events/:eventId — Update event
   */
  app.put('/v1/workspaces/:id/events/:eventId', {
    preHandler: [authMiddleware, requirePermission('workspace:events'), rateLimit('WRITE'), validateBody(updateWorkspaceEventSchema)],
  }, async (request, reply) => {
    const { id, eventId } = request.params as { id: string; eventId: string };
    const event = await workspaceService.updateEvent(id, request.user!.user_id, eventId, request.body as never);

    return reply.send({
      success: true,
      data: event,
      errors: [],
    });
  });

  /**
   * POST /v1/workspaces/:id/events/:eventId/bookings — Link bookings to event
   */
  app.post('/v1/workspaces/:id/events/:eventId/bookings', {
    preHandler: [authMiddleware, requirePermission('workspace:events'), rateLimit('WRITE'), validateBody(linkBookingsToEventSchema)],
  }, async (request, reply) => {
    const { id, eventId } = request.params as { id: string; eventId: string };
    const { bookings } = request.body as { bookings: Array<{ booking_id: string; role_label?: string }> };

    const links = await workspaceService.linkBookingsToEvent(id, request.user!.user_id, eventId, bookings);

    return reply.status(201).send({
      success: true,
      data: links,
      errors: [],
    });
  });

  /**
   * DELETE /v1/workspaces/:id/events/:eventId/bookings/:bookingId — Unlink booking from event
   */
  app.delete('/v1/workspaces/:id/events/:eventId/bookings/:bookingId', {
    preHandler: [authMiddleware, requirePermission('workspace:events'), rateLimit('WRITE')],
  }, async (request, reply) => {
    const { id, eventId, bookingId } = request.params as { id: string; eventId: string; bookingId: string };
    await workspaceService.unlinkBooking(id, request.user!.user_id, eventId, bookingId);

    return reply.send({
      success: true,
      data: { unlinked: true },
      errors: [],
    });
  });

  // ─── Presentations ─────────────────────────────────────────

  /**
   * POST /v1/workspaces/:id/presentations — Generate a presentation
   */
  app.post('/v1/workspaces/:id/presentations', {
    preHandler: [authMiddleware, requirePermission('workspace:presentations'), rateLimit('WRITE'), validateBody(createPresentationSchema)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const presentation = await workspaceService.generatePresentation(id, request.user!.user_id, request.body as never);

    return reply.status(201).send({
      success: true,
      data: presentation,
      errors: [],
    });
  });

  /**
   * GET /v1/workspaces/:id/presentations — List presentations
   */
  app.get('/v1/workspaces/:id/presentations', {
    preHandler: [authMiddleware, requirePermission('workspace:read')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const presentations = await workspaceService.getPresentations(id, request.user!.user_id);

    return reply.send({
      success: true,
      data: presentations,
      errors: [],
    });
  });

  /**
   * GET /v1/presentations/:slug — Public presentation (NO AUTH)
   */
  app.get('/v1/presentations/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const presentation = await workspaceService.getPublicPresentation(slug);

    return reply.send({
      success: true,
      data: presentation,
      errors: [],
    });
  });

  /**
   * GET /v1/presentations/:slug/pdf — Download presentation as PDF (NO AUTH)
   */
  app.get('/v1/presentations/:slug/pdf', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const data = await workspaceService.getPublicPresentation(slug);

    const pdfBuffer = await generatePresentationPdf(data as any);

    const safeTitle = data.presentation.title
      .replace(/[^a-zA-Z0-9_\- ]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 60);

    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${safeTitle}.pdf"`)
      .header('Content-Length', pdfBuffer.length)
      .send(pdfBuffer);
  });

  // ─── Analytics ─────────────────────────────────────────────

  /**
   * GET /v1/workspaces/:id/analytics — Workspace analytics
   */
  app.get('/v1/workspaces/:id/analytics', {
    preHandler: [authMiddleware, requirePermission('workspace:analytics')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as { start_date?: string; end_date?: string };

    const dateRange = query.start_date && query.end_date
      ? { start_date: query.start_date, end_date: query.end_date }
      : undefined;

    const analytics = await workspaceService.getAnalytics(id, request.user!.user_id, dateRange);

    return reply.send({
      success: true,
      data: analytics,
      errors: [],
    });
  });

  // ─── Commission ───────────────────────────────────────────

  /**
   * GET /v1/workspaces/:id/commission — Get commission summary
   */
  app.get('/v1/workspaces/:id/commission', {
    preHandler: [authMiddleware, requirePermission('workspace:analytics')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const summary = await workspaceService.getCommissionSummary(id, request.user!.user_id);

    return reply.send({
      success: true,
      data: summary,
      errors: [],
    });
  });

  /**
   * PUT /v1/workspaces/:id/commission — Update default commission %
   */
  app.put('/v1/workspaces/:id/commission', {
    preHandler: [authMiddleware, requirePermission('workspace:manage'), rateLimit('WRITE'), validateBody(updateWorkspaceCommissionSchema)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { default_commission_pct } = request.body as { default_commission_pct: number };
    const workspace = await workspaceService.updateWorkspaceCommission(id, request.user!.user_id, default_commission_pct);

    return reply.send({
      success: true,
      data: workspace,
      errors: [],
    });
  });

  /**
   * PUT /v1/workspaces/:id/events/:eventId/bookings/:bookingId/commission — Override per-booking commission
   */
  app.put('/v1/workspaces/:id/events/:eventId/bookings/:bookingId/commission', {
    preHandler: [authMiddleware, requirePermission('workspace:manage'), rateLimit('WRITE'), validateBody(updateBookingCommissionSchema)],
  }, async (request, reply) => {
    const { id, eventId, bookingId } = request.params as { id: string; eventId: string; bookingId: string };
    const { commission_pct } = request.body as { commission_pct: number };
    const updated = await workspaceService.updateBookingCommission(id, request.user!.user_id, eventId, bookingId, commission_pct);

    return reply.send({
      success: true,
      data: updated,
      errors: [],
    });
  });
}
