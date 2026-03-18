import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('cash_flow_forecasts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('artist_id').notNullable().references('id').inTable('artist_profiles').onDelete('CASCADE');
    table.string('period_label', 20).notNullable();
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.bigInteger('confirmed_income_paise').notNullable().defaultTo(0);
    table.bigInteger('probable_income_paise').notNullable().defaultTo(0);
    table.bigInteger('pending_settlement_paise').notNullable().defaultTo(0);
    table.bigInteger('net_forecast_paise').notNullable().defaultTo(0);
    table.boolean('is_light_month').notNullable().defaultTo(false);
    table.text('advisory').nullable();
    table.timestamp('computed_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_cff_artist ON cash_flow_forecasts (artist_id)');
  await knex.raw('CREATE INDEX idx_cff_artist_period ON cash_flow_forecasts (artist_id, period_label)');

  await knex.schema.createTable('income_certificates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('artist_id').notNullable().references('id').inTable('artist_profiles').onDelete('CASCADE');
    table.uuid('requested_by').notNullable().references('id').inTable('users');
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.bigInteger('total_gross_paise').notNullable();
    table.bigInteger('total_tds_paise').notNullable();
    table.bigInteger('total_gst_paise').notNullable();
    table.bigInteger('total_platform_fee_paise').notNullable();
    table.bigInteger('total_net_paise').notNullable();
    table.integer('booking_count').notNullable();
    table.string('certificate_number', 50).notNullable().unique();
    table.text('document_url').nullable();
    table.string('status', 20).notNullable().defaultTo('generating');
    table.date('valid_until').notNullable();
    table.jsonb('metadata').notNullable().defaultTo('{}');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_ic_artist ON income_certificates (artist_id)');
  await knex.raw('CREATE INDEX idx_ic_cert_num ON income_certificates (certificate_number)');
  await knex.raw('CREATE INDEX idx_ic_status ON income_certificates (status)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('income_certificates');
  await knex.schema.dropTableIfExists('cash_flow_forecasts');
}
