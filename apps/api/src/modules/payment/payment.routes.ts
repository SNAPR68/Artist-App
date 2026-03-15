import type { FastifyInstance } from 'fastify';
import { paymentService } from './payment.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import { razorpayClient } from './razorpay.client.js';

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
}
