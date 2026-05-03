import type { Knex } from 'knex';

/**
 * Phase 3 — Vendor Rating System (2026-05-04).
 *
 * Adds rating + ops-quality columns to artist_profiles (which holds all vendor
 * categories per the polymorphic shortcut documented in mig 096).
 *
 * Columns:
 *   - rating              numeric(3,2)  cached avg of vendor_ratings.overall
 *   - rating_count        integer       count of vendor_ratings rows
 *   - ontime_rate         numeric(5,2)  % of events where vendor was on time (0-100)
 *   - events_done         integer       distinct event_files completed
 *   - is_preferred        boolean       workspace-agnostic flag (admin-set)
 *   - is_blacklisted      boolean       workspace-agnostic flag
 *   - blacklist_reason    text          why blacklisted
 *   - last_used_at        timestamptz   most recent event_file completion
 *
 * NOTE: per-workspace preference / blacklist lives on vendor_workspace_flags
 * (next migration). The flags here are GRID-wide (admin only).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE artist_profiles
      ADD COLUMN IF NOT EXISTS rating           NUMERIC(3,2)  NULL,
      ADD COLUMN IF NOT EXISTS rating_count     INTEGER       NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS ontime_rate      NUMERIC(5,2)  NULL,
      ADD COLUMN IF NOT EXISTS events_done      INTEGER       NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_preferred     BOOLEAN       NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_blacklisted   BOOLEAN       NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS blacklist_reason TEXT          NULL,
      ADD COLUMN IF NOT EXISTS last_used_at     TIMESTAMPTZ   NULL;
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS artist_profiles_rating_idx
      ON artist_profiles(rating DESC NULLS LAST)
      WHERE deleted_at IS NULL;
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS artist_profiles_preferred_idx
      ON artist_profiles(is_preferred)
      WHERE is_preferred = true AND deleted_at IS NULL;
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS artist_profiles_blacklist_idx
      ON artist_profiles(is_blacklisted)
      WHERE is_blacklisted = true;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP INDEX IF EXISTS artist_profiles_blacklist_idx;`);
  await knex.raw(`DROP INDEX IF EXISTS artist_profiles_preferred_idx;`);
  await knex.raw(`DROP INDEX IF EXISTS artist_profiles_rating_idx;`);
  await knex.raw(`
    ALTER TABLE artist_profiles
      DROP COLUMN IF EXISTS last_used_at,
      DROP COLUMN IF EXISTS blacklist_reason,
      DROP COLUMN IF EXISTS is_blacklisted,
      DROP COLUMN IF EXISTS is_preferred,
      DROP COLUMN IF EXISTS events_done,
      DROP COLUMN IF EXISTS ontime_rate,
      DROP COLUMN IF EXISTS rating_count,
      DROP COLUMN IF EXISTS rating;
  `);
}
