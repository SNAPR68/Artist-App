import type { Knex } from 'knex';

/**
 * iCal subscription — artists get a personal signed feed URL they can plug
 * into Google Calendar, Apple Calendar, or Outlook. Calendar lock-in = moat.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE artist_profiles
      ADD COLUMN IF NOT EXISTS ical_token TEXT NULL;
  `);
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS artist_profiles_ical_token_idx
      ON artist_profiles(ical_token) WHERE ical_token IS NOT NULL;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS artist_profiles_ical_token_idx;');
  await knex.raw('ALTER TABLE artist_profiles DROP COLUMN IF EXISTS ical_token;');
}
