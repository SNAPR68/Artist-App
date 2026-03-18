import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('price_elasticity_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('artist_id').notNullable().references('id').inTable('artist_profiles');
    table.uuid('booking_id').nullable().references('id').inTable('bookings');
    table.specificType('event_type', 'event_type').notNullable();
    table.string('city', 100).notNullable();
    table.bigInteger('quoted_paise').notNullable();
    table.specificType('demand_level', 'demand_level').notNullable();
    table.boolean('surge_applied').notNullable().defaultTo(false);
    table.decimal('surge_pct', 5, 2).nullable();
    table.string('outcome', 20).notNullable();
    table.integer('days_before_event').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_pel_artist ON price_elasticity_log (artist_id)');
  await knex.raw('CREATE INDEX idx_pel_outcome ON price_elasticity_log (outcome)');
  await knex.raw('CREATE INDEX idx_pel_demand ON price_elasticity_log (demand_level)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('price_elasticity_log');
}
