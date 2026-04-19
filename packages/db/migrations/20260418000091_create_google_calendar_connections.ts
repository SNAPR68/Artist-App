import type { Knex } from 'knex';

/**
 * Google Calendar 2-way sync — moat #1 (calendar network effect).
 *
 * Stores per-artist OAuth tokens + watch-channel state.
 * Refresh tokens are encrypted at rest (AES-256-GCM via encryptPII).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS artist_google_calendar_connections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      artist_id UUID NOT NULL UNIQUE,
      google_email TEXT NOT NULL,
      google_calendar_id TEXT NOT NULL DEFAULT 'primary',
      access_token_encrypted TEXT NOT NULL,
      refresh_token_encrypted TEXT NOT NULL,
      access_token_expires_at TIMESTAMPTZ NOT NULL,
      watch_channel_id TEXT NULL,
      watch_resource_id TEXT NULL,
      watch_expiration TIMESTAMPTZ NULL,
      sync_token TEXT NULL,
      last_synced_at TIMESTAMPTZ NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS artist_google_calendar_watch_channel_idx
      ON artist_google_calendar_connections(watch_channel_id) WHERE watch_channel_id IS NOT NULL;
  `);

  // Map a GRID booking → Google event so we can update/delete on state change
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS google_calendar_pushed_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      artist_id UUID NOT NULL,
      booking_id UUID NOT NULL,
      google_event_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (artist_id, booking_id)
    );
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS google_calendar_pushed_events_booking_idx
      ON google_calendar_pushed_events(booking_id);
  `);

  // Busy blocks pulled from Google — fold into availability
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS google_calendar_busy_blocks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      artist_id UUID NOT NULL,
      google_event_id TEXT NOT NULL,
      summary TEXT NULL,
      starts_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ NOT NULL,
      is_all_day BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (artist_id, google_event_id)
    );
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS google_calendar_busy_blocks_artist_starts_idx
      ON google_calendar_busy_blocks(artist_id, starts_at);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TABLE IF EXISTS google_calendar_busy_blocks;');
  await knex.raw('DROP TABLE IF EXISTS google_calendar_pushed_events;');
  await knex.raw('DROP TABLE IF EXISTS artist_google_calendar_connections;');
}
