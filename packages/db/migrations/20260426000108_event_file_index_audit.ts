/**
 * Sprint FINAL D3.4 (2026-04-26) — Event File index audit.
 *
 * event_file_vendors already has ON DELETE CASCADE from event_file_id +
 * per-column indexes (see migration 099). This migration adds the missing
 * composite index on event_files(client_id, event_date) for the client
 * dashboard list query ("my upcoming events") and a partial index on
 * soft-deleted rows for the hot list paths.
 */
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Composite index for "events for this client, ordered by event date"
  await knex.schema.alterTable('event_files', (table) => {
    table.index(['client_id', 'event_date'], 'idx_event_files_client_event_date');
  });

  // Partial index so live-row lookups skip soft-deleted tombstones.
  // Partial index so live-row lookups skip soft-deleted tombstones.
  // event_files has deleted_at; event_file_vendors does NOT (no soft delete there).
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_event_files_live_by_client
      ON event_files (client_id, event_date)
      WHERE deleted_at IS NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS idx_event_files_live_by_client');
  await knex.schema.alterTable('event_files', (table) => {
    table.dropIndex(['client_id', 'event_date'], 'idx_event_files_client_event_date');
  });
}
