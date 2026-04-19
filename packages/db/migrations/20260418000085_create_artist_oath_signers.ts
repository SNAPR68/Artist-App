import type { Knex } from 'knex';

/**
 * Commission-Free Artist Oath — public signature log.
 *
 * Every signature is a permanent, public commitment that GRID will not charge
 * this artist any per-booking commission. The pledge is enforceable:
 * if GRID ever introduces take-rate on artists, signed artists are grandfathered.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS artist_oath_signers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      artist_id UUID NOT NULL UNIQUE,
      user_id UUID NOT NULL,
      signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ip_address TEXT NULL,
      user_agent TEXT NULL
    );
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS artist_oath_signers_signed_at_idx
      ON artist_oath_signers(signed_at DESC);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TABLE IF EXISTS artist_oath_signers;');
}
