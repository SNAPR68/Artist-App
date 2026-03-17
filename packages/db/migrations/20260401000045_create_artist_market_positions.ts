import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('artist_market_positions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('artist_id').notNullable().references('id').inTable('artist_profiles').onDelete('CASCADE');
    table.string('genre', 100).notNullable();
    table.string('city', 100).notNullable();
    table.specificType('event_type', 'event_type').notNullable();
    table.specificType('pricing_tier', 'pricing_tier').notNullable();
    table.decimal('percentile_rank', 5, 2).notNullable();
    table.bigInteger('market_median_paise').notNullable();
    table.bigInteger('artist_avg_paise').notNullable();
    table.decimal('price_vs_market_pct', 5, 2).notNullable();
    table.integer('sample_size').notNullable();
    table.integer('market_sample_size').notNullable();
    table.timestamp('last_computed_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE UNIQUE INDEX idx_artist_market_pos_unique
    ON artist_market_positions (artist_id, genre, city, event_type)
  `);
  await knex.raw('CREATE INDEX idx_artist_market_pos_artist ON artist_market_positions (artist_id)');
  await knex.raw('CREATE INDEX idx_artist_market_pos_segment ON artist_market_positions (genre, city, event_type)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('artist_market_positions');
}
