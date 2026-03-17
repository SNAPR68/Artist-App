import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('venue_profiles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 200).notNullable();
    table.string('slug', 200).notNullable().unique();
    table.string('venue_type', 50).notNullable();
    table.specificType('status', 'venue_status').notNullable().defaultTo('pending_verification');
    table.string('city', 100).notNullable();
    table.specificType('city_tier', 'city_tier').notNullable();
    table.text('address').notNullable();
    table.decimal('lat', 10, 7).nullable();
    table.decimal('lng', 10, 7).nullable();
    table.integer('capacity_min').notNullable();
    table.integer('capacity_max').notNullable();
    table.boolean('indoor').notNullable().defaultTo(false);
    table.boolean('outdoor_covered').notNullable().defaultTo(false);
    table.boolean('outdoor_open').notNullable().defaultTo(false);
    table.decimal('stage_width_ft', 6, 1).nullable();
    table.decimal('stage_depth_ft', 6, 1).nullable();
    table.decimal('ceiling_height_ft', 6, 1).nullable();
    table.integer('power_supply_kva').nullable();
    table.boolean('has_green_room').notNullable().defaultTo(false);
    table.boolean('has_parking').notNullable().defaultTo(false);
    table.integer('parking_capacity').nullable();
    table.text('load_in_access').nullable();
    table.decimal('acoustics_rating', 3, 1).nullable();
    table.jsonb('photos').notNullable().defaultTo('[]');
    table.string('contact_name', 200).nullable();
    table.string('contact_phone', 20).nullable();
    table.string('contact_email', 200).nullable();
    table.text('notes').nullable();
    table.uuid('created_by').nullable().references('id').inTable('users');
    table.integer('total_events_hosted').notNullable().defaultTo(0);
    table.decimal('avg_crowd_rating', 3, 1).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
  });

  await knex.raw('CREATE INDEX idx_venue_city ON venue_profiles (city)');
  await knex.raw('CREATE INDEX idx_venue_city_tier ON venue_profiles (city_tier)');
  await knex.raw('CREATE INDEX idx_venue_type ON venue_profiles (venue_type)');
  await knex.raw('CREATE INDEX idx_venue_capacity ON venue_profiles (capacity_max)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('venue_profiles');
}
