import type { Knex } from 'knex';

/**
 * Phase 3 — Vendor Rating System (2026-05-04).
 *
 * vendor_workspace_flags: per-workspace preferred / blacklisted flags.
 * Distinct from artist_profiles.is_preferred / is_blacklisted, which are
 * GRID-wide admin flags.
 *
 * An event company can mark "Soundwave AV" as their preferred AV vendor
 * without affecting other workspaces.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('vendor_workspace_flags', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('workspace_id').notNullable()
      .references('id').inTable('workspaces').onDelete('CASCADE');
    table.uuid('vendor_profile_id').notNullable()
      .references('id').inTable('artist_profiles').onDelete('CASCADE');

    table.boolean('is_preferred').notNullable().defaultTo(false);
    table.boolean('is_blacklisted').notNullable().defaultTo(false);
    table.text('blacklist_reason').nullable();
    table.text('notes').nullable();

    table.uuid('flagged_by').notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['workspace_id', 'vendor_profile_id']);
    table.index(['workspace_id', 'is_preferred']);
    table.index(['workspace_id', 'is_blacklisted']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('vendor_workspace_flags');
}
