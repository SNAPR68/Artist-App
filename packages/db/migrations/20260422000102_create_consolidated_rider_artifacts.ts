/**
 * Event Company OS pivot (2026-04-22) — Consolidated tech rider artifacts.
 *
 * Two upload paths (per MVP spec):
 *   1. 'generated' — machine-built merge from per-vendor artist_riders rows
 *   2. 'uploaded'  — event company re-uploads a hand-merged PDF as the
 *                    file-of-record (no parse-back; human source of truth)
 *
 * Latest row per event file wins for display, but all versions are retained
 * so the company can diff or revert. One row per generation/upload.
 */
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('consolidated_rider_artifacts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('event_file_id').notNullable()
      .references('id').inTable('event_files').onDelete('CASCADE');
    t.uuid('created_by_user_id').notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');

    t.enu('source', ['generated', 'uploaded'], {
      useNative: true,
      enumName: 'consolidated_rider_source',
    }).notNullable();

    // Artifact URLs. For 'generated', both PDF + Excel are produced. For
    // 'uploaded', only pdf_url/pdf_s3_key is populated (Excel is optional).
    t.text('pdf_url').nullable();
    t.text('xlsx_url').nullable();
    t.text('pdf_s3_key').nullable();
    t.text('xlsx_s3_key').nullable();

    // Snapshot only meaningful for 'generated' — captures vendor_count,
    // vendors_with_rider, total_line_items at build time.
    t.jsonb('snapshot').nullable();

    // Optional free-text caption from the user on upload (e.g. "venue-approved v2").
    t.text('note').nullable();

    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index('event_file_id');
    t.index(['event_file_id', 'created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('consolidated_rider_artifacts');
  await knex.raw('DROP TYPE IF EXISTS consolidated_rider_source');
}
