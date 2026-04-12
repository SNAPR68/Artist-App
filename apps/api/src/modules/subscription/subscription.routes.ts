/**
 * Subscription management — Pro tier gating for agencies.
 * Currently uses a simple workspace flag until Razorpay subscriptions
 * are activated (requires live KYC).
 */

import type { FastifyInstance } from 'fastify';
import { db } from '../../infrastructure/database.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';

// ─── Plan definitions ─────────────────────────────────

const PLANS = {
  free: {
    name: 'Free',
    briefs_per_month: 5,
    max_team_members: 1,
    features: ['decision_engine', 'basic_recommendations'],
  },
  pro: {
    name: 'Pro',
    price_paise: 1500000, // ₹15,000
    briefs_per_month: -1, // unlimited
    max_team_members: 10,
    features: [
      'decision_engine', 'clarifying_flow', 'branded_proposals',
      'deal_pipeline', 'team_collab', 'deal_vault', 'csv_export',
      'gst_invoices', 'priority_concierge',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price_paise: null, // custom
    briefs_per_month: -1,
    max_team_members: -1,
    features: ['everything_in_pro', 'unlimited_team', 'api_access', 'white_label', 'sla'],
  },
} as const;

export async function subscriptionRoutes(app: FastifyInstance) {
  /**
   * GET /v1/subscription/status — Get current workspace subscription status.
   */
  app.get('/v1/subscription/status', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (request, reply) => {
    const userId = request.user!.user_id;

    // Find user's primary workspace
    const membership = await db('workspace_members')
      .where({ user_id: userId, accepted_at: db.raw('accepted_at IS NOT NULL') })
      .first();

    if (!membership) {
      return reply.send({
        success: true,
        data: { plan: 'free', ...PLANS.free, workspace_id: null },
        errors: [],
      });
    }

    const workspace = await db('workspaces')
      .where({ id: membership.workspace_id })
      .first();

    // Check metadata for plan override (set manually or via future Razorpay webhook)
    const metadata = typeof workspace?.metadata === 'string'
      ? JSON.parse(workspace.metadata)
      : workspace?.metadata || {};

    const plan = metadata.plan || 'free';
    const planDetails = PLANS[plan as keyof typeof PLANS] || PLANS.free;

    // Count briefs this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [{ count: briefsThisMonth }] = await db('decision_briefs')
      .where('created_by_user_id', userId)
      .where('created_at', '>=', startOfMonth.toISOString())
      .count('* as count');

    return reply.send({
      success: true,
      data: {
        plan,
        ...planDetails,
        workspace_id: workspace?.id,
        briefs_used: Number(briefsThisMonth),
        trial_ends_at: metadata.trial_ends_at || null,
        subscription_id: metadata.razorpay_subscription_id || null,
      },
      errors: [],
    });
  });

  /**
   * GET /v1/subscription/plans — List available plans.
   */
  app.get('/v1/subscription/plans', {
    preHandler: [rateLimit('READ')],
  }, async (_request, reply) => {
    return reply.send({
      success: true,
      data: PLANS,
      errors: [],
    });
  });

  /**
   * POST /v1/subscription/activate-trial — Start 14-day Pro trial.
   * Auth required.
   */
  app.post('/v1/subscription/activate-trial', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const userId = request.user!.user_id;

    const membership = await db('workspace_members')
      .where({ user_id: userId })
      .whereNotNull('accepted_at')
      .first();

    if (!membership) {
      return reply.status(400).send({
        success: false, data: null,
        errors: [{ code: 'NO_WORKSPACE', message: 'Create a workspace first' }],
      });
    }

    const workspace = await db('workspaces').where({ id: membership.workspace_id }).first();
    const metadata = typeof workspace?.metadata === 'string'
      ? JSON.parse(workspace.metadata)
      : workspace?.metadata || {};

    if (metadata.plan === 'pro' || metadata.plan === 'enterprise') {
      return reply.status(400).send({
        success: false, data: null,
        errors: [{ code: 'ALREADY_PRO', message: 'Already on a paid plan' }],
      });
    }

    if (metadata.trial_used) {
      return reply.status(400).send({
        success: false, data: null,
        errors: [{ code: 'TRIAL_USED', message: 'Trial already used for this workspace' }],
      });
    }

    // Activate 14-day trial
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 14);

    await db('workspaces')
      .where({ id: membership.workspace_id })
      .update({
        metadata: JSON.stringify({
          ...metadata,
          plan: 'pro',
          trial_ends_at: trialEnds.toISOString(),
          trial_used: true,
          trial_started_at: new Date().toISOString(),
        }),
        updated_at: db.fn.now(),
      });

    return reply.status(201).send({
      success: true,
      data: {
        plan: 'pro',
        trial_ends_at: trialEnds.toISOString(),
        message: 'Pro trial activated! You have 14 days of full access.',
      },
      errors: [],
    });
  });
}
