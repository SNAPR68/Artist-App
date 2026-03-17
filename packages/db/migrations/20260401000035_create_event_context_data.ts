import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('event_context_data', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('booking_id').notNullable().unique().references('id').inTable('bookings').onDelete('CASCADE');
    table.uuid('submitted_by').notNullable().references('id').inTable('users');
    table.integer('crowd_size_estimate').notNullable();
    table.specificType('crowd_energy', 'crowd_energy_level').notNullable();
    table.specificType('primary_age_group', 'demographic_age_group').notNullable();
    table.specificType('secondary_age_group', 'demographic_age_group').nullable();
    table.integer('gender_ratio_male_pct').notNullable();
    table.specificType('vibe_tags', 'text[]').notNullable().defaultTo('{}');
    table.jsonb('genre_reception').notNullable().defaultTo('{}');
    table.text('set_highlights').nullable();
    table.boolean('would_rebook_artist').notNullable();
    table.integer('venue_acoustics_rating').nullable();
    table.integer('venue_crowd_flow_rating').nullable();
    table.specificType('audience_requests', 'text[]').notNullable().defaultTo('{}');
    table.text('weather_conditions').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_event_context_crowd_energy ON event_context_data (crowd_energy)');
  await knex.raw('CREATE INDEX idx_event_context_age_group ON event_context_data (primary_age_group)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('event_context_data');
}
