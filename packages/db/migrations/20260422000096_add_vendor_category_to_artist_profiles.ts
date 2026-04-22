import type { Knex } from 'knex';

/**
 * Event Company OS pivot (2026-04-22) — Sprint A, migration 1 of 2.
 *
 * Adds a `vendor_category` Postgres enum and a `category` column on
 * artist_profiles so the same table can hold AV, photo, decor, license
 * agents, promoters, and transport vendors alongside artists.
 *
 * Shortcut rationale: artist_profiles already has the fields every vendor
 * category needs (name, city, contact, fee range, availability, media).
 * Refactoring to a polymorphic `vendors` table would cost ~3 weeks and
 * block the MVP. Revisit month 3+ when paying customers force it.
 *
 * All existing rows default to 'artist' so no behaviour changes on deploy.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_category') THEN
        CREATE TYPE vendor_category AS ENUM (
          'artist', 'av', 'photo', 'decor', 'license', 'promoters', 'transport'
        );
      END IF;
    END$$;
  `);

  await knex.raw(`
    ALTER TABLE artist_profiles
      ADD COLUMN IF NOT EXISTS category vendor_category NOT NULL DEFAULT 'artist';
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS artist_profiles_category_idx
      ON artist_profiles(category);
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS artist_profiles_category_base_city_idx
      ON artist_profiles(category, base_city);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS artist_profiles_category_city_idx;');
  await knex.raw('DROP INDEX IF EXISTS artist_profiles_category_idx;');
  await knex.raw('ALTER TABLE artist_profiles DROP COLUMN IF EXISTS category;');
  await knex.raw('DROP TYPE IF EXISTS vendor_category;');
}
