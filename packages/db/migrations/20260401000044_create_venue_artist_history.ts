import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('venue_artist_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('venue_id').notNullable().references('id').inTable('venue_profiles');
    table.uuid('artist_id').notNullable().references('id').inTable('artist_profiles');
    table.uuid('booking_id').notNullable().unique().references('id').inTable('bookings');
    table.specificType('event_type', 'event_type').notNullable();
    table.date('event_date').notNullable();
    table.specificType('crowd_energy', 'crowd_energy_level').nullable();
    table.integer('venue_acoustics_rating').nullable();
    table.decimal('overall_review_rating', 3, 1).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_venue_artist_history_va ON venue_artist_history (venue_id, artist_id)');
  await knex.raw('CREATE INDEX idx_venue_artist_history_ve ON venue_artist_history (venue_id, event_type)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('venue_artist_history');
}
