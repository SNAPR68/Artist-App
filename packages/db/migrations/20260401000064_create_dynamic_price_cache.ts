import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('dynamic_price_cache', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('artist_id').notNullable().references('id').inTable('artist_profiles').onDelete('CASCADE');
    table.specificType('event_type', 'event_type').notNullable();
    table.string('city', 100).notNullable();
    table.date('event_date').notNullable();
    table.bigInteger('base_min_paise').notNullable();
    table.bigInteger('base_max_paise').notNullable();
    table.bigInteger('adjusted_min_paise').notNullable();
    table.bigInteger('adjusted_max_paise').notNullable();
    table.specificType('demand_level', 'demand_level').notNullable();
    table.jsonb('adjustments_applied').notNullable().defaultTo('[]');
    table.bigInteger('fair_price_min_paise').nullable();
    table.bigInteger('fair_price_max_paise').nullable();
    table.timestamp('computed_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable();
    table.unique(['artist_id', 'event_type', 'city', 'event_date']);
  });

  await knex.raw('CREATE INDEX idx_dpc_artist_date ON dynamic_price_cache (artist_id, event_date)');
  await knex.raw('CREATE INDEX idx_dpc_expires ON dynamic_price_cache (expires_at)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dynamic_price_cache');
}
