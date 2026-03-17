import type { FastifyInstance } from 'fastify';
import { paymentService } from './payment.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import { razorpayClient } from './razorpay.client.js';
import { payoutService } from './payout.service.js';

export async function paymentRoutes(app: FastifyInstance) {
  /**
   * POST /v1/payments/orders — Create Razorpay order
   */
  app.post('/v1/payments/orders', {
    preHandler: [authMiddleware, requirePermission('payment:create'), rateLimit('WRITE')],
  }, async (request, reply) => {
    const { booking_id } = request.body as { booking_id: string };
    const order = await paymentService.createOrder(booking_id, request.user!.user_id);

    return reply.status(201).send({
      success: true,
      data: order,
      errors: [],
    });
  });

  /**
   * POST /v1/payments/verify — Verify Razorpay payment
   */
  app.post('/v1/payments/verify', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const body = request.body as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    };

    const payment = await paymentService.verifyPayment(body);

    return reply.send({
      success: true,
      data: payment,
      errors: [],
    });
  });

  /**
   * POST /v1/payments/webhook — Razorpay webhook handler
   */
  app.post('/v1/payments/webhook', async (request, reply) => {
    const signature = request.headers['x-razorpay-signature'] as string;
    const body = JSON.stringify(request.body);

    if (!razorpayClient.verifyWebhookSignature(body, signature)) {
      return reply.status(400).send({ error: 'Invalid signature' });
    }

    const { event, payload } = request.body as { event: string; payload: Record<string, unknown> };
    await paymentService.handleWebhook(event, payload);

    return reply.send({ status: 'ok' });
  });

  /**
   * GET /v1/payments/history — Payment history for current user
   */
  app.get('/v1/payments/history', {
    preHandler: [authMiddleware, requirePermission('payment:read_own')],
  }, async (request, reply) => {
    const query = request.query as { role?: string };
    const role = query.role === 'artist' ? 'artist' : 'client';
    const payments = await paymentService.getPaymentHistory(request.user!.user_id, role as 'artist' | 'client');

    return reply.send({
      success: true,
      data: payments,
      errors: [],
    });
  });

  /** GET /v1/payments/invoice/:paymentId — Get GST invoice for a payment */
  app.get('/v1/payments/invoice/:paymentId', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { paymentId } = request.params as { paymentId: string };
    const invoice = await paymentService.generateInvoice(paymentId);

    return reply.send({
      success: true,
      data: invoice,
      errors: [],
    });
  });

  /**
   * GET /v1/payments/booking/:bookingId — Payment details for a booking
   */
  app.get('/v1/payments/booking/:bookingId', {
    preHandler: [authMiddleware, requirePermission('payment:read_own')],
  }, async (request, reply) => {
    const { bookingId } = request.params as { bookingId: string };
    const payment = await paymentService.getPaymentDetails(bookingId);

    return reply.send({
      success: true,
      data: payment,
      errors: [],
    });
  });

  /**
   * POST /v1/payments/settle/:paymentId — Admin: manually settle a payment
   */
  app.post('/v1/payments/settle/:paymentId', {
    preHandler: [authMiddleware, requirePermission('admin:manage')],
  }, async (request, reply) => {
    const { paymentId } = request.params as { paymentId: string };
    const result = await paymentService.settlePayment(paymentId);

    return reply.send({
      success: true,
      data: result,
      errors: [],
    });
  });

  /**
   * POST /v1/payments/settle-eligible — Admin: trigger auto-settlement
   */
  app.post('/v1/payments/settle-eligible', {
    preHandler: [authMiddleware, requirePermission('admin:manage')],
  }, async (request, reply) => {
    const count = await paymentService.autoSettleEligible();

    return reply.send({
      success: true,
      data: { settled_count: count },
      errors: [],
    });
  });

  /**
   * GET /v1/payments/invoice/:paymentId/pdf — Download GST invoice as PDF
   */
  app.get('/v1/payments/invoice/:paymentId/pdf', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { paymentId } = request.params as { paymentId: string };
    const invoice = await paymentService.generateInvoice(paymentId);

    const { renderInvoicePDF } = await import('../document/pdf.renderer.js');
    const pdfBuffer = await renderInvoicePDF(invoice);

    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="invoice-${invoice.invoice_number.replace(/\//g, '-')}.pdf"`)
      .send(pdfBuffer);
  });

  /**
   * GET /v1/payments/contract/:bookingId/pdf — Download booking contract as PDF
   */
  app.get('/v1/payments/contract/:bookingId/pdf', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { bookingId } = request.params as { bookingId: string };
    const { bookingRepository } = await import('../booking/booking.repository.js');
    const { generateContract } = await import('../document/contract.generator.js');
    const { renderContractPDF } = await import('../document/pdf.renderer.js');
    const { calculatePaymentSplit } = await import('./split-calculator.js');

    const booking = await bookingRepository.findByIdWithDetails(bookingId);
    if (!booking) {
      return reply.status(404).send({ success: false, errors: [{ code: 'NOT_FOUND', message: 'Booking not found' }] });
    }

    const split = calculatePaymentSplit({ baseAmountPaise: booking.final_amount_paise });

    const contract = generateContract({
      booking_id: bookingId,
      artist_name: booking.artist_name ?? 'Artist',
      client_name: booking.client_name ?? 'Client',
      event_type: booking.event_type ?? 'Event',
      event_date: booking.event_date,
      event_city: booking.event_city ?? 'City',
      event_venue: booking.event_venue,
      event_duration_hours: booking.event_duration_hours ?? 2,
      final_amount_paise: booking.final_amount_paise,
      platform_fee_paise: split.platform_fee_paise,
      artist_payout_paise: split.artist_net_paise,
      tds_paise: split.tds_paise,
      gst_paise: split.gst_on_platform_fee_paise,
    });

    const pdfBuffer = await renderContractPDF(contract);

    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="contract-${bookingId.slice(0, 8)}.pdf"`)
      .send(pdfBuffer);
  });

  /**
   * GET /v1/payments/earnings — Artist earnings summary
   */
  app.get('/v1/payments/earnings', {
    preHandler: [authMiddleware, requirePermission('payment:read_own')],
  }, async (request, reply) => {
    const query = request.query as { start_date?: string; end_date?: string };
    const now = new Date();
    const startDate = query.start_date ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endDate = query.end_date ?? now.toISOString();

    const summary = await paymentService.getEarningsSummary(request.user!.user_id, startDate, endDate);

    return reply.send({
      success: true,
      data: summary,
      errors: [],
    });
  });

  // ─── Payout Routes ──────────────────────────────────────────

  /**
   * GET /v1/admin/payouts — Admin: list pending payouts
   */
  app.get('/v1/admin/payouts', {
    preHandler: [authMiddleware, requirePermission('admin:payments')],
  }, async (request, reply) => {
    const payouts = await payoutService.listPendingPayouts();

    return reply.send({
      success: true,
      data: payouts,
      errors: [],
    });
  });

  /**
   * POST /v1/admin/payouts/:id/mark-paid — Admin: mark payout as paid
   */
  app.post('/v1/admin/payouts/:id/mark-paid', {
    preHandler: [authMiddleware, requirePermission('admin:payments')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reference } = request.body as { reference: string };
    const payout = await payoutService.markAsPaid(id, request.user!.user_id, reference);

    return reply.send({
      success: true,
      data: payout,
      errors: [],
    });
  });

  /**
   * GET /v1/artists/payouts — Artist: payout history
   */
  app.get('/v1/artists/payouts', {
    preHandler: [authMiddleware, requirePermission('payment:read_own')],
  }, async (request, reply) => {
    const query = request.query as Record<string, string>;
    const page = Math.max(1, parseInt(query.page ?? '1'));
    const perPage = Math.min(100, Math.max(1, parseInt(query.per_page ?? '20')));

    const result = await payoutService.getArtistPayouts(request.user!.user_id, page, perPage);

    return reply.send({
      success: true,
      data: result.data,
      meta: {
        page,
        per_page: perPage,
        total: result.total,
        total_pages: Math.ceil(result.total / perPage),
      },
      errors: [],
    });
  });
}
