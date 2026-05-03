/**
 * Phase 4 (2026-05-04) — Event-scoped rider fulfilment tracker.
 *
 * One row per (event_file, rider_line_item). Tracks:
 *   - which vendor was assigned to fulfil the line item
 *   - manual fulfilment status (event-company override)
 *   - automated cross-check vs. vendor's category_attributes
 *
 * This is distinct from rider_venue_checks (which is venue-scoped, booking-
 * scoped). event_rider_fulfillment is vendor-scoped and event-file-scoped —
 * the unit Event Companies actually operate on day-of.
 */
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('event_rider_fulfillment', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('event_file_id').notNullable()
      .references('id').inTable('event_files').onDelete('CASCADE');
    t.uuid('rider_id').notNullable()
      .references('id').inTable('artist_riders').onDelete('CASCADE');
    t.uuid('line_item_id').notNullable()
      .references('id').inTable('rider_line_items').onDelete('CASCADE');

    t.uuid('assigned_vendor_id').nullable()
      .references('id').inTable('artist_profiles').onDelete('SET NULL');

    t.specificType('fulfillment_status', 'rider_fulfillment_status')
      .notNullable().defaultTo('not_checked');

    t.text('cross_check_status').notNullable().defaultTo('pending');
    t.text('cross_check_notes').nullable();

    t.text('alternative_offered').nullable();
    t.uuid('checked_by').nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('checked_at').nullable();
    t.text('notes').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    t.unique(['event_file_id', 'line_item_id']);
    t.index(['event_file_id']);
    t.index(['assigned_vendor_id']);
    t.index(['event_file_id', 'fulfillment_status']);
  });

  await knex.raw(`
    ALTER TABLE event_rider_fulfillment
      ADD CONSTRAINT event_rider_fulfillment_xcheck_chk
      CHECK (cross_check_status IN ('pending', 'matched', 'mismatched', 'partial'))
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('event_rider_fulfillment');
}
