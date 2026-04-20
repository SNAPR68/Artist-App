import type { Knex } from 'knex';

/**
 * Activation nudges — dedupe table for outbound WhatsApp/email nudges
 * sent to stuck agencies. One row per (workspace_id, nudge_type).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS activation_nudges_sent (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      nudge_type TEXT NOT NULL CHECK (nudge_type IN (
        'no_first_brief_d3',
        'no_first_deal_d7',
        'concierge_stuck_48h',
        'trial_ending_t3'
      )),
      channel TEXT NOT NULL,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (workspace_id, nudge_type)
    );

    CREATE INDEX IF NOT EXISTS idx_nudges_workspace ON activation_nudges_sent(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_nudges_sent_at ON activation_nudges_sent(sent_at DESC);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP TABLE IF EXISTS activation_nudges_sent;`);
}
