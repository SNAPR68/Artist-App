/**
 * Proposal-with-P&L (2026-05-05) — Proposal CRUD routes (Phase 1).
 *
 * Mounted at /v1/workspaces/:workspaceId/proposals.
 * Send / version / convert / PDF / public-token endpoints come in Phase 2-3.
 *
 * GET    /v1/workspaces/:workspaceId/proposals
 * POST   /v1/workspaces/:workspaceId/proposals
 * GET    /v1/workspaces/:workspaceId/proposals/:id
 * PATCH  /v1/workspaces/:workspaceId/proposals/:id
 * DELETE /v1/workspaces/:workspaceId/proposals/:id
 * POST   /v1/workspaces/:workspaceId/proposals/:id/line-items
 * PATCH  /v1/workspaces/:workspaceId/proposals/:id/line-items/:itemId
 * DELETE /v1/workspaces/:workspaceId/proposals/:id/line-items/:itemId
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { proposalRepository } from './proposal.repository.js';
import { renderProposalPdf } from './proposal.pdf.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import {
  createProposalSchema,
  updateProposalSchema,
  createProposalLineItemSchema,
  updateProposalLineItemSchema,
  proposalListQuerySchema,
} from '@artist-booking/shared';

function zodFail(reply: any, status: number, issues: { path: (string | number)[]; message: string }[]) {
  return reply.status(status).send({
    success: false,
    errors: issues.map((i) => ({
      code: 'VALIDATION_ERROR',
      message: `${i.path.join('.') || '(root)'}: ${i.message}`,
    })),
  });
}

const paramsWid = z.object({ workspaceId: z.string().uuid() });
const paramsWidId = z.object({ workspaceId: z.string().uuid(), id: z.string().uuid() });
const paramsWidIdItem = z.object({
  workspaceId: z.string().uuid(),
  id: z.string().uuid(),
  itemId: z.string().uuid(),
});

async function requireMember(reply: any, workspaceId: string, userId: string): Promise<boolean> {
  const ok = await proposalRepository.checkWorkspaceMembership(workspaceId, userId);
  if (!ok) {
    reply.status(403).send({
      success: false,
      errors: [{ code: 'FORBIDDEN', message: 'Not a member of this workspace' }],
    });
    return false;
  }
  return true;
}

export async function proposalRoutes(app: FastifyInstance) {
  // ─── List ───────────────────────────────────────────────────
  app.get('/v1/workspaces/:workspaceId/proposals', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (request, reply) => {
    const p = paramsWid.safeParse(request.params);
    if (!p.success) return zodFail(reply, 400, p.error.issues);
    const q = proposalListQuerySchema.safeParse(request.query);
    if (!q.success) return zodFail(reply, 400, q.error.issues);

    const userId = request.user!.user_id;
    if (!(await requireMember(reply, p.data.workspaceId, userId))) return;

    const result = await proposalRepository.list({
      workspace_id: p.data.workspaceId,
      status: q.data.status,
      q: q.data.q,
      page: q.data.page,
      per_page: q.data.per_page,
    });
    return reply.send({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: q.data.page,
        per_page: q.data.per_page,
      },
      errors: [],
    });
  });

  // ─── Create draft ───────────────────────────────────────────
  app.post('/v1/workspaces/:workspaceId/proposals', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const p = paramsWid.safeParse(request.params);
    if (!p.success) return zodFail(reply, 400, p.error.issues);
    const body = createProposalSchema.safeParse(request.body);
    if (!body.success) return zodFail(reply, 400, body.error.issues);

    const userId = request.user!.user_id;
    if (!(await requireMember(reply, p.data.workspaceId, userId))) return;

    const row = await proposalRepository.create(p.data.workspaceId, userId, body.data);
    return reply.status(201).send({ success: true, data: row, errors: [] });
  });

  // ─── Get one ────────────────────────────────────────────────
  app.get('/v1/workspaces/:workspaceId/proposals/:id', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (request, reply) => {
    const p = paramsWidId.safeParse(request.params);
    if (!p.success) return zodFail(reply, 400, p.error.issues);

    const userId = request.user!.user_id;
    if (!(await requireMember(reply, p.data.workspaceId, userId))) return;

    const row = await proposalRepository.findById(p.data.id, p.data.workspaceId);
    if (!row) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Proposal not found' }],
      });
    }
    return reply.send({ success: true, data: row, errors: [] });
  });

  // ─── Update header ──────────────────────────────────────────
  app.patch('/v1/workspaces/:workspaceId/proposals/:id', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const p = paramsWidId.safeParse(request.params);
    if (!p.success) return zodFail(reply, 400, p.error.issues);
    const body = updateProposalSchema.safeParse(request.body);
    if (!body.success) return zodFail(reply, 400, body.error.issues);

    const userId = request.user!.user_id;
    if (!(await requireMember(reply, p.data.workspaceId, userId))) return;

    const existing = await proposalRepository.findById(p.data.id, p.data.workspaceId);
    if (!existing) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Proposal not found' }],
      });
    }
    if (existing.status !== 'draft' && existing.status !== 'sent') {
      return reply.status(409).send({
        success: false,
        errors: [{ code: 'INVALID_STATE', message: `Cannot edit proposal in status: ${existing.status}` }],
      });
    }

    const row = await proposalRepository.update(p.data.id, p.data.workspaceId, body.data);
    return reply.send({ success: true, data: row, errors: [] });
  });

  // ─── Delete (draft only) ────────────────────────────────────
  app.delete('/v1/workspaces/:workspaceId/proposals/:id', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const p = paramsWidId.safeParse(request.params);
    if (!p.success) return zodFail(reply, 400, p.error.issues);

    const userId = request.user!.user_id;
    if (!(await requireMember(reply, p.data.workspaceId, userId))) return;

    const existing = await proposalRepository.findById(p.data.id, p.data.workspaceId);
    if (!existing) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Proposal not found' }],
      });
    }
    if (existing.status !== 'draft') {
      return reply.status(409).send({
        success: false,
        errors: [{ code: 'INVALID_STATE', message: 'Only draft proposals can be deleted' }],
      });
    }

    await proposalRepository.delete(p.data.id, p.data.workspaceId);
    return reply.status(204).send();
  });

  // ─── Add line item ──────────────────────────────────────────
  app.post('/v1/workspaces/:workspaceId/proposals/:id/line-items', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const p = paramsWidId.safeParse(request.params);
    if (!p.success) return zodFail(reply, 400, p.error.issues);
    const body = createProposalLineItemSchema.safeParse(request.body);
    if (!body.success) return zodFail(reply, 400, body.error.issues);

    const userId = request.user!.user_id;
    if (!(await requireMember(reply, p.data.workspaceId, userId))) return;

    const existing = await proposalRepository.findById(p.data.id, p.data.workspaceId);
    if (!existing) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Proposal not found' }],
      });
    }
    if (existing.status !== 'draft') {
      return reply.status(409).send({
        success: false,
        errors: [{ code: 'INVALID_STATE', message: 'Line items can only be edited on draft proposals' }],
      });
    }

    const row = await proposalRepository.addLineItem(p.data.id, body.data);
    const totals = await proposalRepository.recomputeTotals(p.data.id);
    return reply.status(201).send({ success: true, data: { ...row, totals }, errors: [] });
  });

  // ─── Update line item ───────────────────────────────────────
  app.patch('/v1/workspaces/:workspaceId/proposals/:id/line-items/:itemId', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const p = paramsWidIdItem.safeParse(request.params);
    if (!p.success) return zodFail(reply, 400, p.error.issues);
    const body = updateProposalLineItemSchema.safeParse(request.body);
    if (!body.success) return zodFail(reply, 400, body.error.issues);

    const userId = request.user!.user_id;
    if (!(await requireMember(reply, p.data.workspaceId, userId))) return;

    const existing = await proposalRepository.findById(p.data.id, p.data.workspaceId);
    if (!existing) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Proposal not found' }],
      });
    }
    if (existing.status !== 'draft') {
      return reply.status(409).send({
        success: false,
        errors: [{ code: 'INVALID_STATE', message: 'Line items can only be edited on draft proposals' }],
      });
    }

    const row = await proposalRepository.updateLineItem(p.data.id, p.data.itemId, body.data);
    if (!row) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Line item not found' }],
      });
    }
    const totals = await proposalRepository.recomputeTotals(p.data.id);
    return reply.send({ success: true, data: { ...row, totals }, errors: [] });
  });

  // ─── Delete line item ───────────────────────────────────────
  app.delete('/v1/workspaces/:workspaceId/proposals/:id/line-items/:itemId', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const p = paramsWidIdItem.safeParse(request.params);
    if (!p.success) return zodFail(reply, 400, p.error.issues);

    const userId = request.user!.user_id;
    if (!(await requireMember(reply, p.data.workspaceId, userId))) return;

    const existing = await proposalRepository.findById(p.data.id, p.data.workspaceId);
    if (!existing) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Proposal not found' }],
      });
    }
    if (existing.status !== 'draft') {
      return reply.status(409).send({
        success: false,
        errors: [{ code: 'INVALID_STATE', message: 'Line items can only be edited on draft proposals' }],
      });
    }

    const deleted = await proposalRepository.deleteLineItem(p.data.id, p.data.itemId);
    if (!deleted) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Line item not found' }],
      });
    }
    await proposalRepository.recomputeTotals(p.data.id);
    return reply.status(204).send();
  });

  // ─── Send (Phase 2) ─────────────────────────────────────────
  app.post('/v1/workspaces/:workspaceId/proposals/:id/send', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const p = paramsWidId.safeParse(request.params);
    if (!p.success) return zodFail(reply, 400, p.error.issues);

    const userId = request.user!.user_id;
    if (!(await requireMember(reply, p.data.workspaceId, userId))) return;

    const existing = await proposalRepository.findById(p.data.id, p.data.workspaceId);
    if (!existing) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Proposal not found' }],
      });
    }
    if (!['draft', 'sent', 'viewed'].includes(existing.status)) {
      return reply.status(409).send({
        success: false,
        errors: [{
          code: 'INVALID_STATE',
          message: `Cannot send proposal in status: ${existing.status}`,
        }],
      });
    }
    if (!existing.line_items || existing.line_items.length === 0) {
      return reply.status(409).send({
        success: false,
        errors: [{ code: 'INVALID_STATE', message: 'Cannot send a proposal with no line items' }],
      });
    }

    const row = await proposalRepository.send(p.data.id, p.data.workspaceId);
    if (!row) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Proposal not found' }],
      });
    }
    await proposalRepository.logEvent(p.data.id, 'sent', {}, userId);

    const baseUrl = process.env.PUBLIC_WEB_URL || 'https://grid.app';
    return reply.send({
      success: true,
      data: {
        ...row,
        public_url: `${baseUrl}/p/${row.public_token}`,
      },
      errors: [],
    });
  });

  // ─── Version (Phase 2) ──────────────────────────────────────
  app.post('/v1/workspaces/:workspaceId/proposals/:id/version', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const p = paramsWidId.safeParse(request.params);
    if (!p.success) return zodFail(reply, 400, p.error.issues);

    const userId = request.user!.user_id;
    if (!(await requireMember(reply, p.data.workspaceId, userId))) return;

    const next = await proposalRepository.createVersion(
      p.data.id,
      p.data.workspaceId,
      userId,
    );
    if (!next) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Proposal not found' }],
      });
    }
    await proposalRepository.logEvent(
      next.id,
      'version_created',
      { parent_proposal_id: p.data.id },
      userId,
    );
    return reply.status(201).send({ success: true, data: next, errors: [] });
  });

  // ─── Convert to event file (Phase 2) ────────────────────────
  app.post('/v1/workspaces/:workspaceId/proposals/:id/convert-to-event-file', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const p = paramsWidId.safeParse(request.params);
    if (!p.success) return zodFail(reply, 400, p.error.issues);

    const userId = request.user!.user_id;
    if (!(await requireMember(reply, p.data.workspaceId, userId))) return;

    const existing = await proposalRepository.findById(p.data.id, p.data.workspaceId);
    if (!existing) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Proposal not found' }],
      });
    }
    if (!existing.line_items || existing.line_items.length === 0) {
      return reply.status(409).send({
        success: false,
        errors: [{ code: 'INVALID_STATE', message: 'Proposal has no line items to convert' }],
      });
    }

    const result = await proposalRepository.convertToEventFile(
      p.data.id,
      p.data.workspaceId,
      userId,
    );
    if (!result) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Proposal not found' }],
      });
    }
    if (!result.already_converted) {
      await proposalRepository.logEvent(
        p.data.id,
        'converted',
        { event_file_id: result.event_file_id },
        userId,
      );
    }
    return reply.status(201).send({
      success: true,
      data: { event_file_id: result.event_file_id, already_converted: result.already_converted },
      errors: [],
    });
  });

  // ─── PDF (Phase 2) ──────────────────────────────────────────
  app.get('/v1/workspaces/:workspaceId/proposals/:id/pdf', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (request, reply) => {
    const p = paramsWidId.safeParse(request.params);
    if (!p.success) return zodFail(reply, 400, p.error.issues);
    const q = z.object({ mode: z.enum(['internal', 'client']).default('internal') }).safeParse(
      request.query,
    );
    if (!q.success) return zodFail(reply, 400, q.error.issues);

    const userId = request.user!.user_id;
    if (!(await requireMember(reply, p.data.workspaceId, userId))) return;

    const proposal = await proposalRepository.findById(p.data.id, p.data.workspaceId);
    if (!proposal) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Proposal not found' }],
      });
    }
    const workspace = await proposalRepository.findWorkspace(p.data.workspaceId);

    const buf = await renderProposalPdf({
      proposal,
      line_items: proposal.line_items,
      workspace: {
        name: workspace?.name || 'GRID',
        logo_url: workspace?.logo_url || null,
        brand_color: workspace?.brand_color || null,
      },
      mode: q.data.mode,
    });

    return reply
      .header('Content-Type', 'application/pdf')
      .header(
        'Content-Disposition',
        `inline; filename="proposal-${proposal.id.slice(0, 8)}-v${proposal.version}-${q.data.mode}.pdf"`,
      )
      .send(buf);
  });

  // ─── Summary (Phase 2) ──────────────────────────────────────
  app.get('/v1/workspaces/:workspaceId/proposals/:id/summary', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (request, reply) => {
    const p = paramsWidId.safeParse(request.params);
    if (!p.success) return zodFail(reply, 400, p.error.issues);

    const userId = request.user!.user_id;
    if (!(await requireMember(reply, p.data.workspaceId, userId))) return;

    const summary = await proposalRepository.summary(p.data.id, p.data.workspaceId);
    if (!summary) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Proposal not found' }],
      });
    }
    return reply.send({ success: true, data: summary, errors: [] });
  });
}
