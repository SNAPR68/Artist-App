/**
 * Proposal-with-P&L (2026-05-05) — Public proposal routes (Phase 3).
 *
 * Mounted at /v1/public/proposals/:token. NO AUTH — token is the gate.
 * These endpoints power the client-facing accept page at grid.app/p/:token.
 *
 * Rate limited at 30 req/min per token (per IP) to prevent token-guessing
 * abuse and double-submit storms.
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { proposalRepository } from './proposal.repository.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import { renderProposalPdf } from './proposal.pdf.js';

const tokenParam = z.object({ token: z.string().min(20).max(64) });
const acceptBody = z.object({
  client_name: z.string().min(1).max(200).optional(),
  signature: z.string().max(2000).optional(),
});
const declineBody = z.object({
  reason: z.string().max(2000).optional(),
});

function clientMeta(request: FastifyRequest) {
  return {
    ip: request.ip,
    user_agent: request.headers['user-agent'] || null,
    at: new Date().toISOString(),
  };
}

function zodFail(reply: any, status: number, issues: { path: (string | number)[]; message: string }[]) {
  return reply.status(status).send({
    success: false,
    errors: issues.map((i) => ({
      code: 'VALIDATION_ERROR',
      message: `${i.path.join('.') || '(root)'}: ${i.message}`,
    })),
  });
}

function publicProposalView(p: any) {
  // Strip cost_paise / margin / internal fields before sending to client.
  return {
    id: p.id,
    client_name: p.client_name,
    event_title: p.event_title,
    event_date: p.event_date,
    venue_text: p.venue_text,
    status: p.status,
    valid_until: p.valid_until,
    sent_at: p.sent_at,
    accepted_at: p.accepted_at,
    declined_at: p.declined_at,
    total_sell_paise: p.total_sell_paise,
    line_items: (p.line_items || []).map((li: any) => ({
      id: li.id,
      category: li.category,
      description: li.description,
      qty: li.qty,
      sell_paise: li.sell_paise,
    })),
  };
}

export async function publicProposalRoutes(app: FastifyInstance) {
  // ─── Get public view ────────────────────────────────────────
  app.get('/v1/public/proposals/:token', {
    preHandler: [rateLimit('READ')],
  }, async (request, reply) => {
    const p = tokenParam.safeParse(request.params);
    if (!p.success) return zodFail(reply, 400, p.error.issues);

    const proposal = await proposalRepository.findByPublicToken(p.data.token);
    if (!proposal) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Proposal not found' }],
      });
    }
    if (!['sent', 'viewed', 'accepted', 'declined', 'expired'].includes(proposal.status)) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Proposal not available' }],
      });
    }

    const workspace = await proposalRepository.findWorkspace(proposal.workspace_id);
    return reply.send({
      success: true,
      data: {
        proposal: publicProposalView(proposal),
        workspace: {
          name: workspace?.name || 'GRID',
          logo_url: workspace?.logo_url || null,
          brand_color: workspace?.brand_color || null,
        },
      },
      errors: [],
    });
  });

  // ─── Log first view ─────────────────────────────────────────
  app.post('/v1/public/proposals/:token/view', {
    preHandler: [rateLimit('WRITE')],
  }, async (request, reply) => {
    const p = tokenParam.safeParse(request.params);
    if (!p.success) return zodFail(reply, 400, p.error.issues);

    const proposal = await proposalRepository.logFirstView(p.data.token, clientMeta(request));
    if (!proposal) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Proposal not found' }],
      });
    }
    return reply.send({ success: true, data: { ok: true }, errors: [] });
  });

  // ─── Accept ─────────────────────────────────────────────────
  app.post('/v1/public/proposals/:token/accept', {
    preHandler: [rateLimit('WRITE')],
  }, async (request, reply) => {
    const p = tokenParam.safeParse(request.params);
    if (!p.success) return zodFail(reply, 400, p.error.issues);
    const body = acceptBody.safeParse(request.body || {});
    if (!body.success) return zodFail(reply, 400, body.error.issues);

    const meta = { ...clientMeta(request), ...body.data };
    const proposal = await proposalRepository.acceptByToken(p.data.token, meta);
    if (!proposal) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Proposal not found' }],
      });
    }
    return reply.send({
      success: true,
      data: { id: proposal.id, status: proposal.status, accepted_at: proposal.accepted_at },
      errors: [],
    });
  });

  // ─── Decline ────────────────────────────────────────────────
  app.post('/v1/public/proposals/:token/decline', {
    preHandler: [rateLimit('WRITE')],
  }, async (request, reply) => {
    const p = tokenParam.safeParse(request.params);
    if (!p.success) return zodFail(reply, 400, p.error.issues);
    const body = declineBody.safeParse(request.body || {});
    if (!body.success) return zodFail(reply, 400, body.error.issues);

    const meta = { ...clientMeta(request), ...body.data };
    const proposal = await proposalRepository.declineByToken(p.data.token, meta);
    if (!proposal) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Proposal not found' }],
      });
    }
    return reply.send({
      success: true,
      data: { id: proposal.id, status: proposal.status, declined_at: proposal.declined_at },
      errors: [],
    });
  });

  // ─── Public PDF (client mode only) ──────────────────────────
  app.get('/v1/public/proposals/:token/pdf', {
    preHandler: [rateLimit('READ')],
  }, async (request, reply) => {
    const p = tokenParam.safeParse(request.params);
    if (!p.success) return zodFail(reply, 400, p.error.issues);

    const proposal = await proposalRepository.findByPublicToken(p.data.token);
    if (!proposal) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Proposal not found' }],
      });
    }
    const workspace = await proposalRepository.findWorkspace(proposal.workspace_id);
    const buf = await renderProposalPdf({
      proposal,
      line_items: proposal.line_items,
      workspace: {
        name: workspace?.name || 'GRID',
        logo_url: workspace?.logo_url || null,
        brand_color: workspace?.brand_color || null,
      },
      mode: 'client',
    });
    return reply
      .header('Content-Type', 'application/pdf')
      .header(
        'Content-Disposition',
        `inline; filename="proposal-${proposal.id.slice(0, 8)}.pdf"`,
      )
      .send(buf);
  });
}
