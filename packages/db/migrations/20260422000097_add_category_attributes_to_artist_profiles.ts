import type { Knex } from 'knex';

/**
 * Event Company OS pivot (2026-04-22) — Sprint A, migration 2 of 2.
 *
 * Adds `category_attributes` JSONB to artist_profiles. Each vendor category
 * needs different spec fields (AV needs watts/lumens, photo needs camera
 * count, decor needs themes, license needs coverage list, etc.). Storing
 * them as JSONB keeps the schema flat and lets us ship without per-category
 * tables.
 *
 * Category-specific shapes (enforced at Zod layer, not DB):
 *   artist:    { genres, languages, setup_minutes, has_own_sound }
 *   av:        { max_watts, stage_size_ft, light_units, led_wall_sqft, truss_available }
 *   photo:     { photographers, videographers, drone, same_day_edit, backup_shooter }
 *   decor:     { themes, flower_types, setup_hours, indoor_outdoor, custom_fab }
 *   license:   { license_types, cities_covered, turnaround_days, govt_fees_included }
 *   promoters: { staff_types, min_headcount, rate_per_head, uniform_included }
 *   transport: { vehicle_types, cities, with_driver, fuel_included, standby_hourly_rate }
 *
 * GIN index supports filtered queries like
 *   WHERE category_attributes @> '{"license_types": ["PPL"]}'
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE artist_profiles
      ADD COLUMN IF NOT EXISTS category_attributes JSONB NOT NULL DEFAULT '{}'::jsonb;
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS artist_profiles_category_attributes_gin_idx
      ON artist_profiles USING GIN (category_attributes);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS artist_profiles_category_attributes_gin_idx;');
  await knex.raw('ALTER TABLE artist_profiles DROP COLUMN IF EXISTS category_attributes;');
}
