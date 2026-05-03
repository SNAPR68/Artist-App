/**
 * Phase 4 (2026-05-04) — Structured rider sections.
 *
 * Adds JSONB columns to artist_riders for the canonical tech-rider sections
 * an event company needs to coordinate AV/decor vendors:
 *   sound       — { mics: { vocal: 4, instrument: 2 }, monitors: 4, foh: 'L-Acoustics K2' }
 *   backline    — { drum_kit: 'DW Collectors', amps: ['Fender Twin'], keys: 'Nord Stage 3' }
 *   stage_plot  — { width_ft: 32, depth_ft: 24, risers: [...], inputs: [...] }
 *   lighting    — { spots: 8, par: 24, hazer: true, follow_spot: 1 }
 *   power       — { circuits: ['32A 3-phase x2', '16A x4'], generator_kva: 100 }
 *   green_room  — { rooms: 2, lockable: true, mirrors: 4, ac: true }
 *
 * hospitality_requirements + travel_requirements already exist (since 2026-04-01).
 * stage_plot_url stores an optional uploaded image / PDF.
 */
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('artist_riders', (t) => {
    t.jsonb('sound').notNullable().defaultTo('{}');
    t.jsonb('backline').notNullable().defaultTo('{}');
    t.jsonb('stage_plot').notNullable().defaultTo('{}');
    t.jsonb('lighting').notNullable().defaultTo('{}');
    t.jsonb('power').notNullable().defaultTo('{}');
    t.jsonb('green_room').notNullable().defaultTo('{}');
    t.text('stage_plot_url').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('artist_riders', (t) => {
    t.dropColumn('sound');
    t.dropColumn('backline');
    t.dropColumn('stage_plot');
    t.dropColumn('lighting');
    t.dropColumn('power');
    t.dropColumn('green_room');
    t.dropColumn('stage_plot_url');
  });
}
