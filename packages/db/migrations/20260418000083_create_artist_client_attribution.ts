import type { Knex } from 'knex';

/**
 * Agent-of-record attribution — GRID's anti-disintermediation moat.
 *
 * Every artist ↔ client relationship is tagged with the originating agency
 * (workspace). Any future booking between the same artist and client auto-
 * flows a commission to that agency — even if booked direct 3 years later.
 *
 * This is the DB-layer guarantee that backs GRID's "we don't disintermediate
 * you" promise to agencies. Removing GRID = losing the commission trail.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS artist_client_attribution (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      artist_id UUID NOT NULL,
      client_user_id UUID NOT NULL,
      workspace_id UUID NOT NULL,
      first_booking_id UUID,
      commission_pct NUMERIC(5,2) NOT NULL DEFAULT 10.00,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (artist_id, client_user_id)
    );
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS artist_client_attribution_workspace_idx
      ON artist_client_attribution(workspace_id);
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS artist_client_attribution_artist_idx
      ON artist_client_attribution(artist_id);
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS artist_client_attribution_client_idx
      ON artist_client_attribution(client_user_id);
  `);

  // Track attributed commission per booking so agencies can audit revenue
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS attributed_commissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      attribution_id UUID NOT NULL REFERENCES artist_client_attribution(id) ON DELETE CASCADE,
      booking_id UUID NOT NULL,
      workspace_id UUID NOT NULL,
      booking_total_paise BIGINT NOT NULL,
      commission_paise BIGINT NOT NULL,
      commission_pct NUMERIC(5,2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'accrued',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS attributed_commissions_workspace_idx
      ON attributed_commissions(workspace_id);
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS attributed_commissions_booking_idx
      ON attributed_commissions(booking_id);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TABLE IF EXISTS attributed_commissions;');
  await knex.raw('DROP TABLE IF EXISTS artist_client_attribution;');
}
