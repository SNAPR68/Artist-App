import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('booking_quotes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('booking_id').notNullable().references('id').inTable('bookings').onDelete('CASCADE');
    table.uuid('quoted_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.integer('round_number').notNullable();
    table.bigInteger('base_amount').notNullable(); // paise
    table.bigInteger('travel_surcharge').notNullable().defaultTo(0); // paise
    table.bigInteger('platform_fee').notNullable(); // paise
    table.bigInteger('total_amount').notNullable(); // paise
    table.jsonb('breakdown').notNullable();
    table.boolean('is_final').notNullable().defaultTo(false);
    table.text('notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['booking_id', 'round_number']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('booking_quotes');
}
