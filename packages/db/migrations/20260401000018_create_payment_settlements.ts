import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('payment_settlements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('payment_id').notNullable().references('id').inTable('payments').onDelete('RESTRICT');
    table.bigInteger('artist_payout_paise').notNullable();
    table.bigInteger('platform_fee_paise').notNullable();
    table.bigInteger('tds_paise').notNullable();
    table.timestamp('settled_at').notNullable();
    table.string('payout_reference', 100).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['payment_id']);
    table.index(['settled_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('payment_settlements');
}
