import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('event_day_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('booking_id').notNullable().references('id').inTable('bookings').onDelete('RESTRICT');
    table.unique(['booking_id']);

    // GPS arrival verification
    table.decimal('arrival_lat', 10, 7).nullable();
    table.decimal('arrival_lng', 10, 7).nullable();
    table.boolean('arrival_verified').notNullable().defaultTo(false);
    table.integer('arrival_distance_m').nullable();
    table.timestamp('arrival_at').nullable();

    // Soundcheck
    table.boolean('soundcheck_artist').notNullable().defaultTo(false);
    table.timestamp('soundcheck_artist_at').nullable();
    table.boolean('soundcheck_client').notNullable().defaultTo(false);
    table.timestamp('soundcheck_client_at').nullable();

    // Set timing
    table.timestamp('set_start_at').nullable();
    table.timestamp('set_end_at').nullable();
    table.integer('actual_duration_min').nullable();

    // Completion confirmation
    table.boolean('completion_artist').notNullable().defaultTo(false);
    table.timestamp('completion_artist_at').nullable();
    table.boolean('completion_client').notNullable().defaultTo(false);
    table.timestamp('completion_client_at').nullable();

    // Issues (append-only JSONB array)
    table.jsonb('issues').notNullable().defaultTo('[]');

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // Add venue coordinates to bookings for GPS verification
  await knex.schema.alterTable('bookings', (table) => {
    table.decimal('venue_lat', 10, 7).nullable();
    table.decimal('venue_lng', 10, 7).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('bookings', (table) => {
    table.dropColumn('venue_lat');
    table.dropColumn('venue_lng');
  });
  await knex.schema.dropTableIfExists('event_day_logs');
}
