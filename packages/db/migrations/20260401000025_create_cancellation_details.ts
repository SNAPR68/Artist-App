import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('cancellation_details', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('booking_id').notNullable().references('id').inTable('bookings').onDelete('RESTRICT').unique();
    table.specificType('sub_type', 'cancellation_sub_type').notNullable();
    table.uuid('initiated_by').notNullable().references('id').inTable('users');
    table.text('reason').notNullable();
    table.boolean('backup_artist_triggered').notNullable().defaultTo(false);
    table.bigInteger('refund_amount_paise').notNullable().defaultTo(0);
    table.bigInteger('artist_amount_paise').notNullable().defaultTo(0);
    table.jsonb('trust_impact').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['sub_type']);
    table.index(['initiated_by']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('cancellation_details');
}
