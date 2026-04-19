import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import { workspaceRepository } from '../workspace/workspace.repository.js';
import { gstInvoiceService } from './gst-invoice.service.js';
import { generateGstInvoicePdf } from './gst-invoice-pdf.service.js';

async function assertMember(workspaceId: string, userId: string) {
  const member = await workspaceRepository.getMember(workspaceId, userId);
  return Boolean(member && member.is_active);
}

export async function gstInvoiceRoutes(app: FastifyInstance) {
  // ─── Settings ────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>(
    '/v1/workspaces/:id/gst-settings',
    { preHandler: [authMiddleware, rateLimit('READ')] },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user!.user_id;
      if (!(await assertMember(id, userId))) {
        return reply.status(403).send({ success: false, errors: [{ code: 'NOT_MEMBER', message: 'Not a workspace member' }] });
      }
      const settings = await gstInvoiceService.getSettings(id);
      return reply.send({ success: true, data: settings, errors: [] });
    },
  );

  app.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/v1/workspaces/:id/gst-settings',
    { preHandler: [authMiddleware, rateLimit('WRITE')] },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user!.user_id;
      if (!(await assertMember(id, userId))) {
        return reply.status(403).send({ success: false, errors: [{ code: 'NOT_MEMBER', message: 'Not a workspace member' }] });
      }
      const row = await gstInvoiceService.upsertSettings(id, request.body as never);
      return reply.send({ success: true, data: row, errors: [] });
    },
  );

  // ─── Invoices ───────────────────────────────────────────────
  app.get<{ Params: { id: string }; Querystring: { financial_year?: string; status?: string; page?: string; per_page?: string } }>(
    '/v1/workspaces/:id/gst-invoices',
    { preHandler: [authMiddleware, rateLimit('READ')] },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user!.user_id;
      if (!(await assertMember(id, userId))) {
        return reply.status(403).send({ success: false, errors: [{ code: 'NOT_MEMBER', message: 'Not a workspace member' }] });
      }
      const { financial_year, status, page, per_page } = request.query;
      const result = await gstInvoiceService.listInvoices(id, {
        financial_year,
        status,
        page: page ? Number(page) : undefined,
        per_page: per_page ? Number(per_page) : undefined,
      });
      return reply.send({ success: true, data: result, errors: [] });
    },
  );

  app.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/v1/workspaces/:id/gst-invoices',
    { preHandler: [authMiddleware, rateLimit('WRITE')] },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user!.user_id;
      if (!(await assertMember(id, userId))) {
        return reply.status(403).send({ success: false, errors: [{ code: 'NOT_MEMBER', message: 'Not a workspace member' }] });
      }
      const body = request.body as Record<string, unknown>;
      if (!body.recipient_name || typeof body.recipient_name !== 'string') {
        return reply.status(400).send({ success: false, errors: [{ code: 'INVALID_BODY', message: 'recipient_name required' }] });
      }
      const items = body.line_items;
      if (!Array.isArray(items) || items.length === 0) {
        return reply.status(400).send({ success: false, errors: [{ code: 'INVALID_BODY', message: 'line_items required' }] });
      }
      try {
        const result = await gstInvoiceService.createInvoice({
          workspace_id: id,
          created_by: userId,
          recipient_name: body.recipient_name as string,
          recipient_gstin: body.recipient_gstin as string | null,
          recipient_address: body.recipient_address as string | null,
          recipient_state_code: body.recipient_state_code as string | null,
          recipient_email: body.recipient_email as string | null,
          recipient_phone: body.recipient_phone as string | null,
          workspace_event_id: body.workspace_event_id as string | null,
          booking_id: body.booking_id as string | null,
          issue_date: body.issue_date as string | undefined,
          due_date: body.due_date as string | null,
          notes: body.notes as string | null,
          line_items: items as never,
        });
        return reply.status(201).send({ success: true, data: result, errors: [] });
      } catch (err) {
        return reply.status(400).send({ success: false, errors: [{ code: 'INVOICE_FAILED', message: (err as Error).message }] });
      }
    },
  );

  app.get<{ Params: { id: string; invoiceId: string } }>(
    '/v1/workspaces/:id/gst-invoices/:invoiceId',
    { preHandler: [authMiddleware, rateLimit('READ')] },
    async (request, reply) => {
      const { id, invoiceId } = request.params;
      const userId = request.user!.user_id;
      if (!(await assertMember(id, userId))) {
        return reply.status(403).send({ success: false, errors: [{ code: 'NOT_MEMBER', message: 'Not a workspace member' }] });
      }
      const result = await gstInvoiceService.getInvoice(invoiceId, id);
      if (!result) return reply.status(404).send({ success: false, errors: [{ code: 'NOT_FOUND', message: 'Invoice not found' }] });
      return reply.send({ success: true, data: result, errors: [] });
    },
  );

  app.post<{ Params: { id: string; invoiceId: string } }>(
    '/v1/workspaces/:id/gst-invoices/:invoiceId/paid',
    { preHandler: [authMiddleware, rateLimit('WRITE')] },
    async (request, reply) => {
      const { id, invoiceId } = request.params;
      const userId = request.user!.user_id;
      if (!(await assertMember(id, userId))) {
        return reply.status(403).send({ success: false, errors: [{ code: 'NOT_MEMBER', message: 'Not a workspace member' }] });
      }
      const row = await gstInvoiceService.markPaid(invoiceId, id);
      if (!row) return reply.status(404).send({ success: false, errors: [{ code: 'NOT_FOUND', message: 'Invoice not found' }] });
      return reply.send({ success: true, data: row, errors: [] });
    },
  );

  app.post<{ Params: { id: string; invoiceId: string } }>(
    '/v1/workspaces/:id/gst-invoices/:invoiceId/cancel',
    { preHandler: [authMiddleware, rateLimit('WRITE')] },
    async (request, reply) => {
      const { id, invoiceId } = request.params;
      const userId = request.user!.user_id;
      if (!(await assertMember(id, userId))) {
        return reply.status(403).send({ success: false, errors: [{ code: 'NOT_MEMBER', message: 'Not a workspace member' }] });
      }
      const row = await gstInvoiceService.cancel(invoiceId, id);
      if (!row) return reply.status(404).send({ success: false, errors: [{ code: 'NOT_FOUND', message: 'Invoice not found' }] });
      return reply.send({ success: true, data: row, errors: [] });
    },
  );

  app.get<{ Params: { id: string; invoiceId: string } }>(
    '/v1/workspaces/:id/gst-invoices/:invoiceId/pdf',
    { preHandler: [authMiddleware, rateLimit('READ')] },
    async (request, reply) => {
      const { id, invoiceId } = request.params;
      const userId = request.user!.user_id;
      if (!(await assertMember(id, userId))) {
        return reply.status(403).send({ success: false, errors: [{ code: 'NOT_MEMBER', message: 'Not a workspace member' }] });
      }
      const result = await gstInvoiceService.getInvoice(invoiceId, id);
      if (!result) return reply.status(404).send({ success: false, errors: [{ code: 'NOT_FOUND', message: 'Invoice not found' }] });
      const buf = await generateGstInvoicePdf(result.invoice, result.line_items);
      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${result.invoice.invoice_number.replace(/[/\\]/g, '-')}.pdf"`)
        .send(buf);
    },
  );

  // ─── Tally/Zoho CSV export ──────────────────────────────────
  app.get<{ Params: { id: string }; Querystring: { financial_year: string } }>(
    '/v1/workspaces/:id/gst-invoices/export.csv',
    { preHandler: [authMiddleware, rateLimit('READ')] },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user!.user_id;
      if (!(await assertMember(id, userId))) {
        return reply.status(403).send({ success: false, errors: [{ code: 'NOT_MEMBER', message: 'Not a workspace member' }] });
      }
      const fy = request.query.financial_year;
      // Validate FY format (e.g. 2026-27) and arithmetic (suffix = year+1 mod 100)
      const fyMatch = fy?.match(/^(\d{4})-(\d{2})$/);
      const fyValid = fyMatch && Number(fyMatch[2]) === (Number(fyMatch[1]) + 1) % 100;
      if (!fyValid) {
        return reply.status(400).send({ success: false, errors: [{ code: 'INVALID_FY', message: 'financial_year required, e.g. 2026-27' }] });
      }
      const csv = await gstInvoiceService.tallyCsv(id, fy);
      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="gst-invoices-${fy}.csv"`)
        .send(csv);
    },
  );
}
