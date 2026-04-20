import type { Knex } from 'knex';

/**
 * Concierge requests — "done-for-you" upgrade tier for agencies.
 *
 * Flow:
 *   1. Agency clicks "Request concierge" on dashboard → POST /v1/concierge/requests
 *   2. Request lands in admin queue (pending)
 *   3. Concierge specialist claims it (accepted) → runs deal on behalf of agency
 *   4. Specialist marks completed / cancelled with resolution notes
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS concierge_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      requested_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
      topic TEXT NOT NULL CHECK (topic IN (
        'deal_help', 'artist_sourcing', 'negotiation', 'compliance', 'other'
      )),
      event_date DATE,
      budget_paise BIGINT,
      notes TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'accepted', 'in_progress', 'completed', 'cancelled'
      )),
      assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
      resolution_notes TEXT,
      accepted_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_concierge_req_workspace ON concierge_requests(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_concierge_req_status ON concierge_requests(status);
    CREATE INDEX IF NOT EXISTS idx_concierge_req_assigned ON concierge_requests(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_concierge_req_created ON concierge_requests(created_at DESC);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP TABLE IF EXISTS concierge_requests;`);
}
