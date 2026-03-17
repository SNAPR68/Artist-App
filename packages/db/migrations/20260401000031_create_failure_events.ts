import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('failure_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('event_type', 50).notNullable();
    table.uuid('user_id').nullable().references('id').inTable('users');
    table.string('session_id', 100).nullable();
    table.jsonb('search_params').nullable();
    table.uuid('booking_id').nullable().references('id').inTable('bookings');
    table.string('stage', 50).nullable();
    table.text('reason').nullable();
    table.jsonb('metadata').notNullable().defaultTo('{}');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['event_type']);
    table.index(['created_at']);
  });

  // GIN index for JSONB supply gap queries
  await knex.raw(`
    CREATE INDEX idx_failure_events_search_params
    ON failure_events USING GIN (search_params)
    WHERE search_params IS NOT NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('failure_events');
}
