import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('demand_signals', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.date('signal_date').notNullable();
    table.string('city', 100).notNullable();
    table.string('genre', 100).nullable();
    table.specificType('event_type', 'event_type').nullable();
    table.integer('search_count').notNullable().defaultTo(0);
    table.integer('inquiry_count').notNullable().defaultTo(0);
    table.integer('booking_count').notNullable().defaultTo(0);
    table.integer('available_artist_count').notNullable().defaultTo(0);
    table.decimal('fill_rate', 5, 2).notNullable().defaultTo(0);
    table.specificType('demand_level', 'demand_level').notNullable().defaultTo('low');
    table.decimal('yoy_growth_pct', 5, 2).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // Postgres requires immutable expressions in unique indexes.
  // Use partial indexes to handle the four NULL combinations.
  await knex.raw(`CREATE UNIQUE INDEX idx_demand_signals_unique_both
    ON demand_signals (signal_date, city, genre, event_type)
    WHERE genre IS NOT NULL AND event_type IS NOT NULL`);
  await knex.raw(`CREATE UNIQUE INDEX idx_demand_signals_unique_genre_only
    ON demand_signals (signal_date, city, genre)
    WHERE genre IS NOT NULL AND event_type IS NULL`);
  await knex.raw(`CREATE UNIQUE INDEX idx_demand_signals_unique_type_only
    ON demand_signals (signal_date, city, event_type)
    WHERE genre IS NULL AND event_type IS NOT NULL`);
  await knex.raw(`CREATE UNIQUE INDEX idx_demand_signals_unique_none
    ON demand_signals (signal_date, city)
    WHERE genre IS NULL AND event_type IS NULL`);
  await knex.raw('CREATE INDEX idx_demand_signals_date ON demand_signals (signal_date)');
  await knex.raw('CREATE INDEX idx_demand_signals_city_date ON demand_signals (city, signal_date)');
  await knex.raw('CREATE INDEX idx_demand_signals_level ON demand_signals (demand_level)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('demand_signals');
}
