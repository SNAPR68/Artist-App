import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import { workspaceRepository } from '../workspace/workspace.repository.js';
import { collaborationService, type ResourceType } from './collaboration.service.js';

const VALID_RESOURCE_TYPES = new Set<ResourceType>(['event', 'booking', 'presentation']);

async function assertMember(workspaceId: string, userId: string) {
  const member = await workspaceRepository.getMember(workspaceId, userId);
  return Boolean(member && member.is_active);
}

export async function collaborationRoutes(app: FastifyInstance) {
  /**
   * GET /v1/workspaces/:id/comments?resource_type=event&resource_id=uuid
   */
  app.get<{ Params: { id: string }; Querystring: { resource_type: string; resource_id: string } }>(
    '/v1/workspaces/:id/comments',
    { preHandler: [authMiddleware, rateLimit('READ')] },
    async (request, reply) => {
      const { id: workspaceId } = request.params;
      const { resource_type, resource_id } = request.query;
      const userId = request.user!.user_id;

      if (!VALID_RESOURCE_TYPES.has(resource_type as ResourceType)) {
        return reply.status(400).send({ success: false, errors: [{ code: 'INVALID_RESOURCE_TYPE', message: 'resource_type must be event|booking|presentation' }] });
      }
      if (!(await assertMember(workspaceId, userId))) {
        return reply.status(403).send({ success: false, errors: [{ code: 'NOT_MEMBER', message: 'Not a workspace member' }] });
      }

      const comments = await collaborationService.listComments(workspaceId, resource_type as ResourceType, resource_id);
      return reply.send({ success: true, data: comments, errors: [] });
    },
  );

  /**
   * POST /v1/workspaces/:id/comments — create a comment (optionally with @mentions)
   * Body: { resource_type, resource_id, body, mentioned_user_ids? }
   */
  app.post<{
    Params: { id: string };
    Body: { resource_type: string; resource_id: string; body: string; mentioned_user_ids?: string[] };
  }>(
    '/v1/workspaces/:id/comments',
    { preHandler: [authMiddleware, rateLimit('WRITE')] },
    async (request, reply) => {
      const { id: workspaceId } = request.params;
      const { resource_type, resource_id, body, mentioned_user_ids } = request.body;
      const userId = request.user!.user_id;

      if (!VALID_RESOURCE_TYPES.has(resource_type as ResourceType)) {
        return reply.status(400).send({ success: false, errors: [{ code: 'INVALID_RESOURCE_TYPE', message: 'Invalid resource_type' }] });
      }
      if (!body || body.trim().length === 0 || body.length > 4000) {
        return reply.status(400).send({ success: false, errors: [{ code: 'INVALID_BODY', message: 'Comment must be 1–4000 characters' }] });
      }
      if (!(await assertMember(workspaceId, userId))) {
        return reply.status(403).send({ success: false, errors: [{ code: 'NOT_MEMBER', message: 'Not a workspace member' }] });
      }

      const comment = await collaborationService.createComment({
        workspace_id: workspaceId,
        resource_type: resource_type as ResourceType,
        resource_id,
        author_user_id: userId,
        body: body.trim(),
        mentioned_user_ids,
      });

      return reply.status(201).send({ success: true, data: comment, errors: [] });
    },
  );

  /**
   * DELETE /v1/workspaces/:id/comments/:commentId — soft delete (author only)
   */
  app.delete<{ Params: { id: string; commentId: string } }>(
    '/v1/workspaces/:id/comments/:commentId',
    { preHandler: [authMiddleware, rateLimit('WRITE')] },
    async (request, reply) => {
      const { id: workspaceId, commentId } = request.params;
      const userId = request.user!.user_id;
      if (!(await assertMember(workspaceId, userId))) {
        return reply.status(403).send({ success: false, errors: [{ code: 'NOT_MEMBER', message: 'Not a workspace member' }] });
      }
      const [deleted] = await collaborationService.deleteComment(commentId, userId);
      if (!deleted) {
        return reply.status(404).send({ success: false, errors: [{ code: 'NOT_FOUND', message: 'Comment not found or not yours' }] });
      }
      return reply.send({ success: true, data: deleted, errors: [] });
    },
  );

  /**
   * GET /v1/collaboration/mentions?unread=true — user's @mention inbox
   */
  app.get<{ Querystring: { unread?: string } }>(
    '/v1/collaboration/mentions',
    { preHandler: [authMiddleware, rateLimit('READ')] },
    async (request, reply) => {
      const userId = request.user!.user_id;
      const unreadOnly = request.query.unread === 'true';
      const mentions = await collaborationService.listMentionsInbox(userId, unreadOnly);
      return reply.send({ success: true, data: mentions, errors: [] });
    },
  );

  /**
   * POST /v1/collaboration/mentions/read — mark mentions read
   * Body: { mention_ids?: string[], all?: boolean }
   */
  app.post<{ Body: { mention_ids?: string[]; all?: boolean } }>(
    '/v1/collaboration/mentions/read',
    { preHandler: [authMiddleware, rateLimit('WRITE')] },
    async (request, reply) => {
      const userId = request.user!.user_id;
      const { mention_ids, all } = request.body ?? {};
      if (all) {
        const count = await collaborationService.markAllMentionsRead(userId);
        return reply.send({ success: true, data: { marked: count }, errors: [] });
      }
      if (Array.isArray(mention_ids) && mention_ids.length > 0) {
        const count = await collaborationService.markMentionsRead(userId, mention_ids);
        return reply.send({ success: true, data: { marked: count }, errors: [] });
      }
      return reply.status(400).send({ success: false, errors: [{ code: 'INVALID_REQUEST', message: 'Provide mention_ids or all=true' }] });
    },
  );

  /**
   * PUT /v1/workspaces/:id/assignments — assign a resource to a teammate
   * Body: { resource_type: 'event'|'booking', resource_id, assignee_user_id }
   */
  app.put<{
    Params: { id: string };
    Body: { resource_type: 'event' | 'booking'; resource_id: string; assignee_user_id: string };
  }>(
    '/v1/workspaces/:id/assignments',
    { preHandler: [authMiddleware, rateLimit('WRITE')] },
    async (request, reply) => {
      const { id: workspaceId } = request.params;
      const { resource_type, resource_id, assignee_user_id } = request.body;
      const userId = request.user!.user_id;

      if (resource_type !== 'event' && resource_type !== 'booking') {
        return reply.status(400).send({ success: false, errors: [{ code: 'INVALID_RESOURCE_TYPE', message: 'resource_type must be event|booking' }] });
      }
      if (!(await assertMember(workspaceId, userId))) {
        return reply.status(403).send({ success: false, errors: [{ code: 'NOT_MEMBER', message: 'Not a workspace member' }] });
      }
      if (!(await assertMember(workspaceId, assignee_user_id))) {
        return reply.status(400).send({ success: false, errors: [{ code: 'ASSIGNEE_NOT_MEMBER', message: 'Assignee is not a workspace member' }] });
      }

      const result = await collaborationService.setAssignment({
        workspace_id: workspaceId,
        resource_type,
        resource_id,
        assignee_user_id,
        assigned_by_user_id: userId,
      });
      return reply.send({ success: true, data: result, errors: [] });
    },
  );

  /**
   * DELETE /v1/workspaces/:id/assignments/:resourceType/:resourceId — unassign
   */
  app.delete<{ Params: { id: string; resourceType: string; resourceId: string } }>(
    '/v1/workspaces/:id/assignments/:resourceType/:resourceId',
    { preHandler: [authMiddleware, rateLimit('WRITE')] },
    async (request, reply) => {
      const { id: workspaceId, resourceType, resourceId } = request.params;
      const userId = request.user!.user_id;
      if (resourceType !== 'event' && resourceType !== 'booking') {
        return reply.status(400).send({ success: false, errors: [{ code: 'INVALID_RESOURCE_TYPE', message: 'Invalid resource type' }] });
      }
      if (!(await assertMember(workspaceId, userId))) {
        return reply.status(403).send({ success: false, errors: [{ code: 'NOT_MEMBER', message: 'Not a workspace member' }] });
      }
      await collaborationService.clearAssignment(resourceType, resourceId);
      return reply.send({ success: true, data: { cleared: true }, errors: [] });
    },
  );

  /**
   * GET /v1/collaboration/assignments/mine — resources assigned to the current user
   */
  app.get('/v1/collaboration/assignments/mine',
    { preHandler: [authMiddleware, rateLimit('READ')] },
    async (request, reply) => {
      const userId = request.user!.user_id;
      const rows = await collaborationService.listMyAssignments(userId);
      return reply.send({ success: true, data: rows, errors: [] });
    },
  );
}
