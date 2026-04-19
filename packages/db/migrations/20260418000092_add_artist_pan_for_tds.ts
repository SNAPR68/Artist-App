import type { Knex } from 'knex';

/**
 * TDS auto-calc (moat #5 — compliance lock-in).
 *
 * Adds encrypted PAN storage on artist_profiles so we can generate TDS
 * certificates (Form 16A style) per financial year. TDS itself is already
 * calculated per-booking in split-calculator.ts and stored on
 * payment_settlements.tds_paise — this migration just adds the PAN column
 * and an index to support FY aggregation queries.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE artist_profiles
      ADD COLUMN IF NOT EXISTS pan_encrypted TEXT NULL,
      ADD COLUMN IF NOT EXISTS pan_hash TEXT NULL;
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS artist_profiles_pan_hash_idx
      ON artist_profiles(pan_hash) WHERE pan_hash IS NOT NULL;
  `);

  // Support fast FY aggregation on settlements
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS payment_settlements_settled_at_idx
      ON payment_settlements(settled_at);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS payment_settlements_settled_at_idx;');
  await knex.raw('DROP INDEX IF EXISTS artist_profiles_pan_hash_idx;');
  await knex.raw(`
    ALTER TABLE artist_profiles
      DROP COLUMN IF EXISTS pan_encrypted,
      DROP COLUMN IF EXISTS pan_hash;
  `);
}
