import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE workspaces
      ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS referral_credits_paise BIGINT NOT NULL DEFAULT 0;

    CREATE TABLE IF NOT EXISTS referrals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      referrer_workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      referred_workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      credit_paise BIGINT NOT NULL DEFAULT 0,
      credit_applied_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (referred_workspace_id)
    );

    CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_workspace_id);
    CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_workspace_id);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP TABLE IF EXISTS referrals;
    ALTER TABLE workspaces
      DROP COLUMN IF EXISTS referral_code,
      DROP COLUMN IF EXISTS referral_credits_paise;
  `);
}
