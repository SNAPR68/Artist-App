import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('rider_venue_checks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('booking_id').notNullable().references('id').inTable('bookings');
    table.uuid('rider_id').notNullable().references('id').inTable('artist_riders');
    table.uuid('venue_id').notNullable().references('id').inTable('venue_profiles');
    table.uuid('line_item_id').notNullable().references('id').inTable('rider_line_items');
    table.specificType('fulfillment_status', 'rider_fulfillment_status').notNullable().defaultTo('not_checked');
    table.text('alternative_offered').nullable();
    table.uuid('checked_by').nullable().references('id').inTable('users');
    table.timestamp('checked_at').nullable();
    table.text('notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_rider_checks_booking ON rider_venue_checks (booking_id)');
  await knex.raw('CREATE INDEX idx_rider_checks_venue_rider ON rider_venue_checks (venue_id, rider_id)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('rider_venue_checks');
}
