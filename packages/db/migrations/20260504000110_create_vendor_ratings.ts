import type { Knex } from 'knex';

/**
 * Phase 3 — Vendor Rating System (2026-05-04).
 *
 * vendor_ratings: one row per (vendor × event_file × rater_workspace).
 * Submitted by an event company after an event completes.
 *
 * Sub-scores capture what actually matters for live events:
 *   - quality      output quality (sound mix, photo set, decor finish)
 *   - punctuality  arrived on time, set up on time
 *   - communication responsiveness pre-event + day-of
 *   - professionalism conduct on-site
 * overall is the average (or admin-overridable).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('vendor_ratings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('workspace_id').notNullable()
      .references('id').inTable('workspaces').onDelete('CASCADE');
    table.uuid('vendor_profile_id').notNullable()
      .references('id').inTable('artist_profiles').onDelete('CASCADE');
    table.uuid('event_file_id').notNullable()
      .references('id').inTable('event_files').onDelete('CASCADE');
    table.uuid('rater_user_id').notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');

    table.decimal('overall', 3, 2).notNullable();
    table.decimal('quality', 3, 2).nullable();
    table.decimal('punctuality', 3, 2).nullable();
    table.decimal('communication', 3, 2).nullable();
    table.decimal('professionalism', 3, 2).nullable();

    table.boolean('was_ontime').notNullable().defaultTo(true);
    table.boolean('would_rebook').notNullable().defaultTo(true);
    table.text('comment').nullable();

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // One rating per workspace per vendor per event.
    table.unique(['workspace_id', 'vendor_profile_id', 'event_file_id']);
    table.index(['vendor_profile_id']);
    table.index(['workspace_id', 'created_at']);
  });

  // Range checks (0.00–5.00 for ratings, ontime/rebook booleans handled by type).
  await knex.raw(`
    ALTER TABLE vendor_ratings
      ADD CONSTRAINT vendor_ratings_overall_range
        CHECK (overall >= 0 AND overall <= 5),
      ADD CONSTRAINT vendor_ratings_quality_range
        CHECK (quality IS NULL OR (quality >= 0 AND quality <= 5)),
      ADD CONSTRAINT vendor_ratings_punctuality_range
        CHECK (punctuality IS NULL OR (punctuality >= 0 AND punctuality <= 5)),
      ADD CONSTRAINT vendor_ratings_communication_range
        CHECK (communication IS NULL OR (communication >= 0 AND communication <= 5)),
      ADD CONSTRAINT vendor_ratings_professionalism_range
        CHECK (professionalism IS NULL OR (professionalism >= 0 AND professionalism <= 5));
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('vendor_ratings');
}
