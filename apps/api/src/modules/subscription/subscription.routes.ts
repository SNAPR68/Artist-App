/**
 * Subscription management — Razorpay subscriptions for agency Pro plans.
 *
 * Endpoints:
 *   GET  /v1/subscription/status        — current plan + usage
 *   GET  /v1/subscription/plans         — plan catalog
 *   POST /v1/subscription/activate-trial — 14-day Pro trial
 *   POST /v1/subscription/checkout      — create Razorpay subscription + get checkout URL
 *   POST /v1/subscription/cancel        — cancel (at cycle end by default)
 *   GET  /v1/subscription/invoices      — billing history
 *   POST /v1/subscription/webhook       — Razorpay subscription webhooks
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../infrastructure/database.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import { razorpayClient } from '../payment/razorpay.client.js';
import { subscriptionService, PLAN_SPECS, type PlanKey } from './subscription.service.js';

const checkoutBodySchema = z.object({
  plan: z.enum(['pro', 'enterprise']),
  customer_name: z.string().min(1).max(200).optional(),
  customer_email: z.string().email().optional(),
  customer_phone: z.string().regex(/^\+?[0-9]{7,15}$/).optional(),
});

const cancelBodySchema = z.object({
  subscription_id: z.string().uuid(),
  at_cycle_end: z.boolean().optional().default(true),
});

const PLANS = {
  free: {
    name: 'Free',
    briefs_per_month: 5,
    max_team_members: 1,
    features: ['decision_engine', 'basic_recommendations'],
  },
  pro: {
    name: PLAN_SPECS.pro.name,
    price_paise: PLAN_SPECS.pro.amount_paise,
    briefs_per_month: -1,
    max_team_members: 10,
    features: PLAN_SPECS.pro.features,
  },
  enterprise: {
    name: PLAN_SPECS.enterprise.name,
    price_paise: PLAN_SPECS.enterprise.amount_paise,
    briefs_per_month: -1,
    max_team_members: -1,
    features: PLAN_SPECS.enterprise.features,
  },
} as const;

async function getUserWorkspace(userId: string) {
  const membership = await db('workspace_members')
    .where({ user_id: userId })
    .whereNotNull('accepted_at')
    .where('is_active', true)
    .first();
  if (!membership) return null;
  const workspace = await db('workspaces').where({ id: membership.workspace_id }).first();
  return workspace ?? null;
}

export async function subscriptionRoutes(app: FastifyInstance) {
  // ─── Status ─────────────────────────────────────────────
  app.get('/v1/subscription/status', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (request, reply) => {
    const userId = request.user!.user_id;
    const workspace = await getUserWorkspace(userId);

    if (!workspace) {
      return reply.send({ success: true, data: { plan: 'free', ...PLANS.free, workspace_id: null }, errors: [] });
    }

    const metadata = typeof workspace.metadata === 'string'
      ? JSON.parse(workspace.metadata) : workspace.metadata || {};
    const plan = (metadata.plan as keyof typeof PLANS) || 'free';
    const planDetails = PLANS[plan] || PLANS.free;

    const startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const [{ count: briefsThisMonth }] = await db('decision_briefs')
      .where('created_by_user_id', userId)
      .where('created_at', '>=', startOfMonth.toISOString())
      .count('* as count');

    const activeSub = await subscriptionService.getActive(workspace.id);

    return reply.send({
      success: true,
      data: {
        plan,
        ...planDetails,
        workspace_id: workspace.id,
        briefs_used: Number(briefsThisMonth),
        trial_ends_at: metadata.trial_ends_at || null,
        subscription: activeSub,
      },
      errors: [],
    });
  });

  // ─── Plans catalog ──────────────────────────────────────
  app.get('/v1/subscription/plans', {
    preHandler: [rateLimit('READ')],
  }, async (_request, reply) => {
    return reply.send({ success: true, data: PLANS, errors: [] });
  });

  // ─── Trial ──────────────────────────────────────────────
  app.post('/v1/subscription/activate-trial', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const userId = request.user!.user_id;
    const workspace = await getUserWorkspace(userId);
    if (!workspace) {
      return reply.status(400).send({ success: false, errors: [{ code: 'NO_WORKSPACE', message: 'Create a workspace first' }] });
    }
    const metadata = typeof workspace.metadata === 'string'
      ? JSON.parse(workspace.metadata) : workspace.metadata || {};
    if (metadata.plan === 'pro' || metadata.plan === 'enterprise') {
      return reply.status(400).send({ success: false, errors: [{ code: 'ALREADY_PRO', message: 'Already on a paid plan' }] });
    }
    if (metadata.trial_used) {
      return reply.status(400).send({ success: false, errors: [{ code: 'TRIAL_USED', message: 'Trial already used for this workspace' }] });
    }
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 14);
    await db('workspaces').where({ id: workspace.id }).update({
      metadata: JSON.stringify({
        ...metadata, plan: 'pro',
        trial_ends_at: trialEnds.toISOString(),
        trial_used: true, trial_started_at: new Date().toISOString(),
      }),
      updated_at: db.fn.now(),
    });
    return reply.status(201).send({
      success: true,
      data: { plan: 'pro', trial_ends_at: trialEnds.toISOString(), message: 'Pro trial activated! 14 days of full access.' },
      errors: [],
    });
  });

  // ─── Checkout (create Razorpay subscription) ────────────
  app.post<{ Body: { plan: PlanKey; customer_name?: string; customer_email?: string; customer_phone?: string } }>(
    '/v1/subscription/checkout',
    { preHandler: [authMiddleware, rateLimit('WRITE')] },
    async (request, reply) => {
      const userId = request.user!.user_id;
      const workspace = await getUserWorkspace(userId);
      if (!workspace) {
        return reply.status(400).send({ success: false, errors: [{ code: 'NO_WORKSPACE', message: 'Create a workspace first' }] });
      }
      const parsed = checkoutBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ success: false, errors: parsed.error.errors.map(e => ({ code: 'VALIDATION_ERROR', message: e.message, path: e.path })) });
      }
      const { plan, customer_name, customer_email, customer_phone } = parsed.data;
      const user = await db('users').where({ id: userId }).first();
      try {
        const result = await subscriptionService.createCheckout({
          workspace_id: workspace.id,
          user_id: userId,
          plan,
          customer_name: customer_name ?? user?.name ?? workspace.name ?? 'GRID Customer',
          customer_email: customer_email ?? user?.email ?? undefined,
          customer_phone: customer_phone ?? user?.phone ?? undefined,
        });
        return reply.status(201).send({ success: true, data: result, errors: [] });
      } catch (err) {
        return reply.status(400).send({
          success: false,
          errors: [{ code: 'CHECKOUT_FAILED', message: (err as Error).message }],
        });
      }
    },
  );

  // ─── Cancel ─────────────────────────────────────────────
  app.post<{ Body: { subscription_id: string; immediate?: boolean } }>(
    '/v1/subscription/cancel',
    { preHandler: [authMiddleware, rateLimit('WRITE')] },
    async (request, reply) => {
      const userId = request.user!.user_id;
      const workspace = await getUserWorkspace(userId);
      if (!workspace) {
        return reply.status(400).send({ success: false, errors: [{ code: 'NO_WORKSPACE', message: 'No workspace' }] });
      }
      const parsed = cancelBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ success: false, errors: parsed.error.errors.map(e => ({ code: 'VALIDATION_ERROR', message: e.message, path: e.path })) });
      }
      const { subscription_id, at_cycle_end } = parsed.data;
      const row = await subscriptionService.cancel(workspace.id, subscription_id, at_cycle_end);
      if (!row) return reply.status(404).send({ success: false, errors: [{ code: 'NOT_FOUND', message: 'Subscription not found' }] });
      return reply.send({ success: true, data: row, errors: [] });
    },
  );

  // ─── Billing history ────────────────────────────────────
  app.get('/v1/subscription/invoices', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (request, reply) => {
    const userId = request.user!.user_id;
    const workspace = await getUserWorkspace(userId);
    if (!workspace) return reply.send({ success: true, data: [], errors: [] });
    const rows = await subscriptionService.listInvoices(workspace.id);
    return reply.send({ success: true, data: rows, errors: [] });
  });

  // ─── Webhook ────────────────────────────────────────────
  // rawBody is attached by the content-type parser registered in app.ts (fastify-raw-body plugin)
  app.post('/v1/subscription/webhook', async (request, reply) => {
    const signature = request.headers['x-razorpay-signature'] as string | undefined;
    const rawBody = (request as unknown as { rawBody?: string }).rawBody ?? JSON.stringify(request.body ?? {});
    if (!signature || !razorpayClient.verifyWebhookSignature(rawBody, signature)) {
      return reply.status(400).send({ success: false, errors: [{ code: 'INVALID_SIGNATURE', message: 'Invalid webhook signature' }] });
    }
    const event = request.body as {
      id: string; event: string;
      payload: { subscription?: { entity: Record<string, unknown> }; payment?: { entity: Record<string, unknown> } };
    };
    if (!event?.event?.startsWith('subscription.')) {
      // Only handle subscription.* events here; payment.* go to /v1/payments/webhook
      return reply.send({ success: true, data: { ignored: true }, errors: [] });
    }
    try {
      const processed = await subscriptionService.handleWebhook(event);
      return reply.send({ success: true, data: { processed }, errors: [] });
    } catch (err) {
      request.log.error({ err }, 'Subscription webhook failed');
      return reply.status(500).send({ success: false, errors: [{ code: 'WEBHOOK_FAILED', message: 'Processing failed' }] });
    }
  });
}
