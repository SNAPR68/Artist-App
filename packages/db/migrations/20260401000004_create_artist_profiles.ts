import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('artist_profiles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    table.string('stage_name', 100).notNullable();
    table.text('bio').nullable();
    table.specificType('genres', 'text[]').notNullable().defaultTo('{}');
    table.specificType('languages', 'text[]').notNullable().defaultTo('{}');
    table.string('base_city', 100).notNullable();
    table.integer('travel_radius_km').notNullable().defaultTo(100);
    table.specificType('event_types', 'event_type[]').notNullable().defaultTo('{}');
    table.integer('performance_duration_min').notNullable().defaultTo(60);
    table.integer('performance_duration_max').notNullable().defaultTo(120);
    table.jsonb('pricing').notNullable().defaultTo('[]');
    table.decimal('trust_score', 5, 2).notNullable().defaultTo(0);
    table.integer('total_bookings').notNullable().defaultTo(0);
    table.decimal('acceptance_rate', 5, 2).notNullable().defaultTo(0);
    table.decimal('avg_response_time_hours', 8, 2).notNullable().defaultTo(0);
    table.boolean('is_verified').notNullable().defaultTo(false);
    table.integer('profile_completion_pct').notNullable().defaultTo(0);
    table.decimal('location_lat', 10, 7).nullable();
    table.decimal('location_lng', 10, 7).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.index(['base_city']);
    table.index(['trust_score']);
    table.index(['is_verified']);
    table.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('artist_profiles');
}
