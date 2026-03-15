import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('booking_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('booking_id').notNullable().references('id').inTable('bookings').onDelete('CASCADE');
    table.string('event_type', 100).notNullable();
    table.specificType('from_state', 'booking_state').nullable();
    table.specificType('to_state', 'booking_state').notNullable();
    table.uuid('triggered_by').nullable(); // null for system-triggered events
    table.jsonb('metadata').notNullable().defaultTo('{}');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['booking_id', 'created_at']);
    table.index(['event_type']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('booking_events');
}
