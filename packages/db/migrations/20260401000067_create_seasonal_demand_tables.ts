import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('seasonal_demand_curves', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('city', 100).notNullable();
    table.string('genre', 100).nullable();
    table.string('event_type', 50).nullable();
    table.integer('month').notNullable();
    table.decimal('avg_fill_rate', 5, 2).notNullable();
    table.decimal('avg_booking_count', 8, 2).notNullable();
    table.decimal('avg_inquiry_count', 8, 2).notNullable();
    table.string('demand_classification', 20).notNullable();
    table.decimal('yoy_trend_pct', 5, 2).nullable();
    table.integer('sample_months').notNullable().defaultTo(0);
    table.timestamp('computed_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`CREATE UNIQUE INDEX idx_sdc_unique ON seasonal_demand_curves (city, COALESCE(genre, ''), COALESCE(event_type, ''), month)`);
  await knex.raw('CREATE INDEX idx_sdc_city ON seasonal_demand_curves (city)');
  await knex.raw('CREATE INDEX idx_sdc_classification ON seasonal_demand_curves (demand_classification)');

  await knex.schema.createTable('seasonal_alerts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('recipient_id').notNullable().references('id').inTable('users');
    table.string('recipient_role', 20).notNullable();
    table.string('alert_type', 50).notNullable();
    table.string('title', 255).notNullable();
    table.text('message').notNullable();
    table.jsonb('metadata').notNullable().defaultTo('{}');
    table.string('city', 100).notNullable();
    table.integer('season_month').notNullable();
    table.boolean('is_read').notNullable().defaultTo(false);
    table.boolean('is_dismissed').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable();
  });

  await knex.raw('CREATE INDEX idx_sa_recipient_read ON seasonal_alerts (recipient_id, is_read)');
  await knex.raw('CREATE INDEX idx_sa_expires ON seasonal_alerts (expires_at)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('seasonal_alerts');
  await knex.schema.dropTableIfExists('seasonal_demand_curves');
}
