import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('availability_calendar', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('artist_id').notNullable().references('id').inTable('artist_profiles').onDelete('CASCADE');
    table.date('date').notNullable();
    table.specificType('status', 'calendar_status').notNullable().defaultTo('available');
    table.uuid('booking_id').nullable();
    table.uuid('inquiry_id').nullable();
    table.timestamp('hold_expires_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['artist_id', 'date']);
    table.index(['artist_id', 'status']);
    table.index(['hold_expires_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('availability_calendar');
}
