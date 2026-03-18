import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('artist_earnings_snapshots', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('artist_id').notNullable().references('id').inTable('artist_profiles').onDelete('CASCADE');
    table.string('period_type', 20).notNullable();
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.integer('total_bookings').notNullable().defaultTo(0);
    table.integer('completed_bookings').notNullable().defaultTo(0);
    table.bigInteger('total_revenue_paise').notNullable().defaultTo(0);
    table.bigInteger('avg_booking_paise').nullable();
    table.jsonb('revenue_by_event_type').notNullable().defaultTo('{}');
    table.jsonb('revenue_by_city').notNullable().defaultTo('{}');
    table.bigInteger('market_avg_paise').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['artist_id', 'period_type', 'period_start']);
  });

  await knex.raw('CREATE INDEX idx_aes_artist ON artist_earnings_snapshots (artist_id)');
  await knex.raw('CREATE INDEX idx_aes_period ON artist_earnings_snapshots (period_type, period_start)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('artist_earnings_snapshots');
}
