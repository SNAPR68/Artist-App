import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { workspaceRepository } from '../workspace/workspace.repository.js';
import { proposalTemplatesService } from './proposal-templates.service.js';

async function assertMember(workspaceId: string, userId: string) {
  const member = await workspaceRepository.getMember(workspaceId, userId);
  return Boolean(member && member.is_active);
}

function validateBody(body: Record<string, unknown>): string | null {
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0 || body.name.length > 120) {
      return 'name must be 1–120 characters';
    }
  }
  for (const k of ['description', 'custom_header', 'custom_footer', 'terms_and_conditions']) {
    if (body[k] != null && typeof body[k] !== 'string') return `${k} must be a string`;
    if (typeof body[k] === 'string' && (body[k] as string).length > 10000) return `${k} too long (max 10000)`;
  }
  for (const k of ['include_pricing', 'include_media', 'is_default']) {
    if (body[k] !== undefined && typeof body[k] !== 'boolean') return `${k} must be boolean`;
  }
  return null;
}

export async function proposalTemplatesRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>(
    '/v1/workspaces/:id/proposal-templates',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const { id: workspaceId } = request.params;
      const userId = request.user!.user_id;
      if (!(await assertMember(workspaceId, userId))) {
        return reply.status(403).send({ success: false, errors: [{ code: 'NOT_MEMBER', message: 'Not a workspace member' }] });
      }
      const rows = await proposalTemplatesService.list(workspaceId);
      return reply.send({ success: true, data: rows, errors: [] });
    },
  );

  app.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/v1/workspaces/:id/proposal-templates',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const { id: workspaceId } = request.params;
      const userId = request.user!.user_id;
      if (!(await assertMember(workspaceId, userId))) {
        return reply.status(403).send({ success: false, errors: [{ code: 'NOT_MEMBER', message: 'Not a workspace member' }] });
      }
      const body = request.body ?? {};
      if (!body.name || typeof body.name !== 'string') {
        return reply.status(400).send({ success: false, errors: [{ code: 'INVALID_BODY', message: 'name is required' }] });
      }
      const err = validateBody(body);
      if (err) return reply.status(400).send({ success: false, errors: [{ code: 'INVALID_BODY', message: err }] });

      const row = await proposalTemplatesService.create({
        workspace_id: workspaceId,
        name: (body.name as string).trim(),
        description: body.description as string | null | undefined,
        custom_header: body.custom_header as string | null | undefined,
        custom_footer: body.custom_footer as string | null | undefined,
        terms_and_conditions: body.terms_and_conditions as string | null | undefined,
        include_pricing: body.include_pricing as boolean | undefined,
        include_media: body.include_media as boolean | undefined,
        is_default: body.is_default as boolean | undefined,
        created_by: userId,
      });
      return reply.status(201).send({ success: true, data: row, errors: [] });
    },
  );

  app.put<{ Params: { id: string; templateId: string }; Body: Record<string, unknown> }>(
    '/v1/workspaces/:id/proposal-templates/:templateId',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const { id: workspaceId, templateId } = request.params;
      const userId = request.user!.user_id;
      if (!(await assertMember(workspaceId, userId))) {
        return reply.status(403).send({ success: false, errors: [{ code: 'NOT_MEMBER', message: 'Not a workspace member' }] });
      }
      const body = request.body ?? {};
      const err = validateBody(body);
      if (err) return reply.status(400).send({ success: false, errors: [{ code: 'INVALID_BODY', message: err }] });

      const row = await proposalTemplatesService.update(templateId, workspaceId, body as never);
      if (!row) return reply.status(404).send({ success: false, errors: [{ code: 'NOT_FOUND', message: 'Template not found' }] });
      return reply.send({ success: true, data: row, errors: [] });
    },
  );

  app.delete<{ Params: { id: string; templateId: string } }>(
    '/v1/workspaces/:id/proposal-templates/:templateId',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const { id: workspaceId, templateId } = request.params;
      const userId = request.user!.user_id;
      if (!(await assertMember(workspaceId, userId))) {
        return reply.status(403).send({ success: false, errors: [{ code: 'NOT_MEMBER', message: 'Not a workspace member' }] });
      }
      const ok = await proposalTemplatesService.remove(templateId, workspaceId);
      if (!ok) return reply.status(404).send({ success: false, errors: [{ code: 'NOT_FOUND', message: 'Template not found' }] });
      return reply.send({ success: true, data: { deleted: true }, errors: [] });
    },
  );
}
