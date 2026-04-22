/**
 * Event Company OS pivot (2026-04-22) — BOQ (Bill of Quantities) artifacts.
 *
 * BOQ = the event's priced line-item sheet. Two upload paths:
 *   1. 'generated' — machine-built from event_file_vendors fees + overheads
 *   2. 'uploaded'  — event company re-uploads their hand-built Excel/PDF as
 *                    the file-of-record (no parse-back, per MVP spec)
 *
 * Line items for generated BOQs are stored in `boq_line_items` so the UI can
 * edit individual rows before re-rendering. Uploaded BOQs carry no line items.
 */
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('boq_artifacts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('event_file_id').notNullable()
      .references('id').inTable('event_files').onDelete('CASCADE');
    t.uuid('created_by_user_id').notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');

    t.enu('source', ['generated', 'uploaded'], {
      useNative: true,
      enumName: 'boq_artifact_source',
    }).notNullable();

    t.text('pdf_url').nullable();
    t.text('xlsx_url').nullable();
    t.text('pdf_s3_key').nullable();
    t.text('xlsx_s3_key').nullable();

    // Totals snapshot for generated BOQs — cached on the artifact row so list
    // views don't need to aggregate line items.
    t.decimal('subtotal_inr', 14, 2).nullable();
    t.decimal('gst_inr', 14, 2).nullable();
    t.decimal('total_inr', 14, 2).nullable();
    t.integer('line_item_count').nullable();

    t.text('note').nullable();

    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index('event_file_id');
    t.index(['event_file_id', 'created_at']);
  });

  await knex.schema.createTable('boq_line_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('event_file_id').notNullable()
      .references('id').inTable('event_files').onDelete('CASCADE');
    t.uuid('vendor_profile_id').nullable()
      .references('id').inTable('artist_profiles').onDelete('SET NULL');

    // Category from the vendor roster, copied for easy grouping. Free text
    // 'overhead' is allowed for non-vendor line items (venue, logistics, tax).
    t.string('category', 32).notNullable();
    t.string('description', 255).notNullable();
    t.integer('quantity').notNullable().defaultTo(1);
    t.decimal('unit_price_inr', 12, 2).notNullable().defaultTo(0);
    t.decimal('line_total_inr', 14, 2).notNullable().defaultTo(0);

    // GST rate applied to the line (e.g. 18.00 for 18%). NULL = out of scope.
    t.decimal('gst_rate_pct', 5, 2).nullable();

    t.integer('sort_order').notNullable().defaultTo(0);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    t.index('event_file_id');
    t.index(['event_file_id', 'sort_order']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('boq_line_items');
  await knex.schema.dropTableIfExists('boq_artifacts');
  await knex.raw('DROP TYPE IF EXISTS boq_artifact_source');
}
