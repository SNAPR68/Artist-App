import type { Knex } from 'knex';

/**
 * Agency subscriptions — Razorpay Subscriptions integration.
 *
 * Flow:
 *   1. Agency picks plan → POST /v1/subscription/checkout
 *   2. Backend creates Razorpay Customer + Subscription (status=created)
 *   3. Frontend opens Razorpay Checkout with subscription_id → user authorizes mandate
 *   4. Webhook `subscription.activated` flips workspace to plan=pro + records subscription
 *   5. Recurring `subscription.charged` events log each billing cycle
 *   6. `subscription.cancelled` / `.completed` / `.halted` downgrade workspace
 *
 * Idempotency: webhooks are de-duped via (razorpay_subscription_id, event) unique index
 * on subscription_events.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS agency_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      plan TEXT NOT NULL CHECK (plan IN ('pro', 'enterprise')),
      status TEXT NOT NULL CHECK (status IN (
        'created', 'authenticated', 'active', 'pending',
        'halted', 'cancelled', 'completed', 'expired', 'paused'
      )),
      razorpay_plan_id TEXT NOT NULL,
      razorpay_customer_id TEXT,
      razorpay_subscription_id TEXT UNIQUE,
      amount_paise INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      total_count INTEGER,
      paid_count INTEGER NOT NULL DEFAULT 0,
      remaining_count INTEGER,
      current_start TIMESTAMPTZ,
      current_end TIMESTAMPTZ,
      charge_at TIMESTAMPTZ,
      start_at TIMESTAMPTZ,
      end_at TIMESTAMPTZ,
      ended_at TIMESTAMPTZ,
      cancel_at_cycle_end BOOLEAN NOT NULL DEFAULT FALSE,
      notes JSONB,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_agency_subs_workspace ON agency_subscriptions(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_agency_subs_status ON agency_subscriptions(status);
    CREATE INDEX IF NOT EXISTS idx_agency_subs_rzp ON agency_subscriptions(razorpay_subscription_id);

    CREATE TABLE IF NOT EXISTS subscription_invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      subscription_id UUID NOT NULL REFERENCES agency_subscriptions(id) ON DELETE CASCADE,
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      razorpay_invoice_id TEXT UNIQUE,
      razorpay_payment_id TEXT,
      amount_paise INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      status TEXT NOT NULL,
      billing_start TIMESTAMPTZ,
      billing_end TIMESTAMPTZ,
      paid_at TIMESTAMPTZ,
      invoice_pdf_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_sub_invoices_sub ON subscription_invoices(subscription_id);
    CREATE INDEX IF NOT EXISTS idx_sub_invoices_workspace ON subscription_invoices(workspace_id);

    CREATE TABLE IF NOT EXISTS subscription_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      subscription_id UUID REFERENCES agency_subscriptions(id) ON DELETE CASCADE,
      razorpay_subscription_id TEXT,
      event TEXT NOT NULL,
      razorpay_event_id TEXT,
      payload JSONB NOT NULL,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS uq_sub_events_event_id
      ON subscription_events(razorpay_event_id) WHERE razorpay_event_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_sub_events_sub ON subscription_events(subscription_id);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP TABLE IF EXISTS subscription_events;
    DROP TABLE IF EXISTS subscription_invoices;
    DROP TABLE IF EXISTS agency_subscriptions;
  `);
}
