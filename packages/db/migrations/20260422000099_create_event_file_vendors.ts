/**
 * Event Company OS pivot (2026-04-22) — Event File ↔ Vendor join.
 *
 * One event_file has many vendors (one per category typically, but e.g. two
 * photographers is allowed). Each row optionally links to a bookings.id so we
 * don't duplicate booking state — bookings remains source of truth for state/
 * amount/contract, event_file_vendors is just the *roster* of who's on this
 * event and in what capacity.
 *
 * The `role` field captures category-level role (primary artist, opener, AV,
 * lead photographer, etc.) separate from the vendor's own category enum so
 * we can render a call sheet like:
 *   "Soundwave AV — AV (primary)"
 *   "DJ Kavya — Artist (primary)"
 *   "DJ Melody — Artist (opener)"
 */
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('event_file_vendors', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('event_file_id')
      .notNullable()
      .references('id')
      .inTable('event_files')
      .onDelete('CASCADE');
    table
      .uuid('vendor_profile_id')
      .notNullable()
      .references('id')
      .inTable('artist_profiles')
      .onDelete('RESTRICT');
    // Optional link to the actual booking row (if the vendor has been booked).
    // NULL when the vendor is shortlisted/inquired but not yet booked.
    table
      .uuid('booking_id')
      .nullable()
      .references('id')
      .inTable('bookings')
      .onDelete('SET NULL');
    // Category-level role (e.g. 'primary', 'opener', 'lead', 'backup').
    // Free-form to avoid over-constraining across categories.
    table.string('role', 50).notNullable().defaultTo('primary');
    // Per-vendor call time override (e.g. AV arrives 2 hrs before crew call).
    table.time('call_time_override').nullable();
    table.text('notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['event_file_id', 'vendor_profile_id', 'role']);
    table.index(['event_file_id']);
    table.index(['vendor_profile_id']);
    table.index(['booking_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('event_file_vendors');
}
