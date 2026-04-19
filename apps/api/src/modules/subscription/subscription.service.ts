import { db } from '../../infrastructure/database.js';
import { razorpayClient } from '../payment/razorpay.client.js';
import { config } from '../../config/index.js';

export type PlanKey = 'pro' | 'enterprise';

export interface PlanSpec {
  key: PlanKey;
  name: string;
  amount_paise: number;
  period: 'monthly' | 'yearly';
  interval: number;
  features: string[];
}

export const PLAN_SPECS: Record<PlanKey, PlanSpec> = {
  pro: {
    key: 'pro',
    name: 'GRID Pro',
    amount_paise: 1_500_000,
    period: 'monthly',
    interval: 1,
    features: [
      'decision_engine', 'branded_proposals', 'deal_pipeline', 'team_collab',
      'deal_vault', 'csv_export', 'gst_invoices', 'priority_concierge',
    ],
  },
  enterprise: {
    key: 'enterprise',
    name: 'GRID Enterprise',
    amount_paise: 5_000_000,
    period: 'monthly',
    interval: 1,
    features: ['everything_in_pro', 'unlimited_team', 'api_access', 'white_label', 'sla'],
  },
};

export interface AgencySubscription {
  id: string;
  workspace_id: string;
  plan: PlanKey;
  status: string;
  razorpay_plan_id: string;
  razorpay_customer_id: string | null;
  razorpay_subscription_id: string | null;
  amount_paise: number;
  currency: string;
  total_count: number | null;
  paid_count: number;
  remaining_count: number | null;
  current_start: string | null;
  current_end: string | null;
  cancel_at_cycle_end: boolean;
  ended_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * In-memory plan cache. On production these are created once via Razorpay
 * Dashboard or admin CLI and the IDs are stored in env. We lazily create
 * in dev/test.
 */
const planIdCache: Partial<Record<PlanKey, string>> = {};

async function ensureRazorpayPlan(plan: PlanKey): Promise<string> {
  if (planIdCache[plan]) return planIdCache[plan]!;

  // Prefer explicit env IDs in production
  const envKey = plan === 'pro' ? 'RAZORPAY_PLAN_ID_PRO' : 'RAZORPAY_PLAN_ID_ENTERPRISE';
  const envId = (config as unknown as Record<string, string | undefined>)[envKey];
  if (envId) {
    planIdCache[plan] = envId;
    return envId;
  }

  const spec = PLAN_SPECS[plan];
  const created = (await razorpayClient.createPlan({
    period: spec.period,
    interval: spec.interval,
    item: { name: spec.name, amount_paise: spec.amount_paise, currency: 'INR' },
    notes: { plan_key: plan },
  })) as { id: string };
  planIdCache[plan] = created.id;
  return created.id;
}

class SubscriptionService {
  async getActive(workspaceId: string): Promise<AgencySubscription | null> {
    const row = await db<AgencySubscription>('agency_subscriptions')
      .where({ workspace_id: workspaceId })
      .whereIn('status', ['created', 'authenticated', 'active', 'pending'])
      .orderBy('created_at', 'desc')
      .first();
    return row ?? null;
  }

  async listForWorkspace(workspaceId: string): Promise<AgencySubscription[]> {
    return db<AgencySubscription>('agency_subscriptions')
      .where({ workspace_id: workspaceId })
      .orderBy('created_at', 'desc');
  }

  async listInvoices(workspaceId: string): Promise<Array<{
    id: string; subscription_id: string; amount_paise: number; status: string;
    billing_start: string | null; billing_end: string | null; paid_at: string | null;
    invoice_pdf_url: string | null; razorpay_invoice_id: string | null;
  }>> {
    return db('subscription_invoices')
      .where({ workspace_id: workspaceId })
      .orderBy('created_at', 'desc')
      .select('id', 'subscription_id', 'amount_paise', 'status', 'billing_start',
        'billing_end', 'paid_at', 'invoice_pdf_url', 'razorpay_invoice_id');
  }

  async createCheckout(input: {
    workspace_id: string;
    user_id: string;
    plan: PlanKey;
    customer_name: string;
    customer_email?: string;
    customer_phone?: string;
  }): Promise<{
    subscription_id: string;
    razorpay_subscription_id: string;
    razorpay_key_id: string;
    short_url: string;
    amount_paise: number;
    plan: PlanKey;
  }> {
    // Block duplicate active subs
    const existing = await this.getActive(input.workspace_id);
    if (existing) {
      throw new Error('Workspace already has an active subscription');
    }

    const spec = PLAN_SPECS[input.plan];
    const razorpayPlanId = await ensureRazorpayPlan(input.plan);

    const customer = (await razorpayClient.createCustomer({
      name: input.customer_name,
      email: input.customer_email,
      contact: input.customer_phone,
      notes: { workspace_id: input.workspace_id },
    })) as { id: string };

    const sub = (await razorpayClient.createSubscription({
      plan_id: razorpayPlanId,
      customer_id: customer.id,
      total_count: 12,
      notes: {
        workspace_id: input.workspace_id,
        plan: input.plan,
      },
    })) as { id: string; short_url?: string; status: string };

    const [row] = await db<AgencySubscription>('agency_subscriptions')
      .insert({
        workspace_id: input.workspace_id,
        plan: input.plan,
        status: sub.status ?? 'created',
        razorpay_plan_id: razorpayPlanId,
        razorpay_customer_id: customer.id,
        razorpay_subscription_id: sub.id,
        amount_paise: spec.amount_paise,
        currency: 'INR',
        total_count: 12,
        paid_count: 0,
        remaining_count: 12,
        created_by: input.user_id,
      })
      .returning('*');

    return {
      subscription_id: row.id,
      razorpay_subscription_id: sub.id,
      razorpay_key_id: config.RAZORPAY_KEY_ID ?? 'rzp_test_placeholder',
      short_url: sub.short_url ?? '',
      amount_paise: spec.amount_paise,
      plan: input.plan,
    };
  }

  async cancel(workspaceId: string, subscriptionId: string, cancelAtCycleEnd = true): Promise<AgencySubscription | null> {
    const sub = await db<AgencySubscription>('agency_subscriptions')
      .where({ id: subscriptionId, workspace_id: workspaceId })
      .first();
    if (!sub) return null;
    if (sub.razorpay_subscription_id) {
      await razorpayClient.cancelSubscription(sub.razorpay_subscription_id, cancelAtCycleEnd);
    }
    const [row] = await db<AgencySubscription>('agency_subscriptions')
      .where({ id: subscriptionId })
      .update({
        cancel_at_cycle_end: cancelAtCycleEnd,
        status: cancelAtCycleEnd ? sub.status : 'cancelled',
        ...(cancelAtCycleEnd ? {} : { ended_at: db.fn.now() }),
        updated_at: db.fn.now(),
      })
      .returning('*');

    if (!cancelAtCycleEnd) {
      await this.downgradeWorkspace(workspaceId);
    }
    return row;
  }

  /**
   * Apply a Razorpay webhook event. Returns true if processed, false if skipped
   * (e.g. unknown subscription).
   */
  async handleWebhook(event: {
    id: string;
    event: string;
    payload: { subscription?: { entity: Record<string, unknown> }; payment?: { entity: Record<string, unknown> } };
  }): Promise<boolean> {
    const sub = event.payload.subscription?.entity as
      | { id?: string; status?: string; paid_count?: number; remaining_count?: number;
          current_start?: number; current_end?: number; charge_at?: number; ended_at?: number; }
      | undefined;

    const unixToIso = (s?: number) => (s ? new Date(s * 1000).toISOString() : null);

    // De-dupe + update in a single transaction to prevent concurrent webhook races
    const processed = await db.transaction(async (trx) => {
      // Atomic de-dupe: insert event log first; unique index on razorpay_event_id will reject dupes
      const inserted = await trx('subscription_events')
        .insert({
          event: event.event,
          razorpay_event_id: event.id,
          razorpay_subscription_id: sub?.id ?? null,
          payload: JSON.stringify(event),
        })
        .onConflict('razorpay_event_id')
        .ignore();
      // 0 rows inserted = duplicate event, skip
      if (!inserted || (Array.isArray(inserted) && inserted.length === 0)) return false;

      if (!sub?.id) return false;

      const localSub = await trx<AgencySubscription>('agency_subscriptions')
        .where({ razorpay_subscription_id: sub.id })
        .first();
      if (!localSub) return false;

      // Monotonic status guard: define a rank so we never regress (e.g. activated → authenticated)
      const STATUS_RANK: Record<string, number> = {
        created: 0, authenticated: 1, active: 2, pending: 2,
        halted: 3, cancelled: 4, completed: 4, expired: 4,
      };
      const incomingRank = STATUS_RANK[sub.status ?? ''] ?? -1;
      const currentRank = STATUS_RANK[localSub.status] ?? -1;
      const newStatus = incomingRank >= currentRank ? (sub.status ?? localSub.status) : localSub.status;

      const patch: Record<string, unknown> = {
        status: newStatus,
        paid_count: Math.max(sub.paid_count ?? 0, localSub.paid_count),
        remaining_count: sub.remaining_count ?? localSub.remaining_count,
        current_start: unixToIso(sub.current_start) ?? localSub.current_start,
        current_end: unixToIso(sub.current_end) ?? localSub.current_end,
        charge_at: unixToIso(sub.charge_at) ?? null,
        ended_at: unixToIso(sub.ended_at) ?? localSub.ended_at,
        updated_at: trx.fn.now(),
      };

      await trx('agency_subscriptions').where({ id: localSub.id }).update(patch);
      await trx('subscription_events')
        .where({ razorpay_event_id: event.id })
        .update({ subscription_id: localSub.id });

      return localSub;
    });

    if (!processed) return false;
    const localSub = processed as AgencySubscription;

    // Side-effects per event
    if (event.event === 'subscription.activated' && sub?.id) {
      await this.upgradeWorkspace(localSub.workspace_id, localSub.plan, sub.id);
    }
    if (event.event === 'subscription.charged') {
      const payment = event.payload.payment?.entity as
        | { id?: string; invoice_id?: string; amount?: number; status?: string }
        | undefined;
      if (payment) {
        await db('subscription_invoices').insert({
          subscription_id: localSub.id,
          workspace_id: localSub.workspace_id,
          razorpay_invoice_id: payment.invoice_id ?? null,
          razorpay_payment_id: payment.id ?? null,
          amount_paise: payment.amount ?? localSub.amount_paise,
          currency: 'INR',
          status: payment.status ?? 'paid',
          billing_start: unixToIso(sub?.current_start),
          billing_end: unixToIso(sub?.current_end),
          paid_at: db.fn.now(),
        }).onConflict('razorpay_invoice_id').ignore();
      }
    }
    if (['subscription.cancelled', 'subscription.completed', 'subscription.halted', 'subscription.expired']
      .includes(event.event)) {
      await this.downgradeWorkspace(localSub.workspace_id);
    }

    return true;
  }

  private async upgradeWorkspace(workspaceId: string, plan: PlanKey, subscriptionId: string): Promise<void> {
    const ws = await db('workspaces').where({ id: workspaceId }).first();
    if (!ws) return;
    const metadata = typeof ws.metadata === 'string' ? JSON.parse(ws.metadata) : ws.metadata || {};
    await db('workspaces').where({ id: workspaceId }).update({
      metadata: JSON.stringify({
        ...metadata,
        plan,
        razorpay_subscription_id: subscriptionId,
        trial_ends_at: null,
      }),
      updated_at: db.fn.now(),
    });
  }

  private async downgradeWorkspace(workspaceId: string): Promise<void> {
    const ws = await db('workspaces').where({ id: workspaceId }).first();
    if (!ws) return;
    const metadata = typeof ws.metadata === 'string' ? JSON.parse(ws.metadata) : ws.metadata || {};
    await db('workspaces').where({ id: workspaceId }).update({
      metadata: JSON.stringify({
        ...metadata,
        plan: 'free',
        razorpay_subscription_id: null,
        downgraded_at: new Date().toISOString(),
      }),
      updated_at: db.fn.now(),
    });
  }
}

export const subscriptionService = new SubscriptionService();
