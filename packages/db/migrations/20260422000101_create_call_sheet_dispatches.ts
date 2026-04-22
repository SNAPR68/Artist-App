/**
 * Event Company OS pivot (2026-04-22) — Call sheet dispatch audit table.
 *
 * Every call sheet generation + send-out is recorded for trace. Stores the
 * rendered artifact URLs and per-recipient dispatch outcome. Re-generating
 * overwrites nothing — each run creates a new row (time-ordered history).
 */
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('call_sheet_dispatches', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('event_file_id').notNullable()
      .references('id').inTable('event_files').onDelete('CASCADE');
    t.uuid('generated_by_user_id').notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');

    // Artifact URLs (CDN-served from S3/Supabase Storage).
    t.text('pdf_url').nullable();
    t.text('xlsx_url').nullable();
    t.text('pdf_s3_key').nullable();
    t.text('xlsx_s3_key').nullable();

    // Snapshot of event state at generation time — survives later edits.
    t.jsonb('snapshot').nullable();

    // Dispatch log: [{ vendor_profile_id, channel, status, error?, sent_at }]
    t.jsonb('dispatch_log').notNullable().defaultTo('[]');

    t.integer('recipient_count').notNullable().defaultTo(0);
    t.integer('success_count').notNullable().defaultTo(0);
    t.integer('failure_count').notNullable().defaultTo(0);

    t.timestamp('generated_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('dispatched_at').nullable();

    t.index('event_file_id');
    t.index('generated_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('call_sheet_dispatches');
}
