import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('payout_transfers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('settlement_id').notNullable().references('id').inTable('payment_settlements').onDelete('RESTRICT');
    table.uuid('artist_id').notNullable().references('id').inTable('artist_profiles').onDelete('RESTRICT');
    table.bigInteger('amount_paise').notNullable();
    table.specificType('transfer_method', 'transfer_method').notNullable().defaultTo('manual');
    table.string('transfer_reference', 200).nullable();
    table.specificType('status', 'payout_status').notNullable().defaultTo('pending');
    table.timestamp('initiated_at').nullable();
    table.timestamp('completed_at').nullable();
    table.text('failed_reason').nullable();
    table.integer('retry_count').notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['settlement_id']);
    table.index(['artist_id']);
    table.index(['status']);
    table.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('payout_transfers');
}
