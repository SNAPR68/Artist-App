import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('bookings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('client_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.uuid('artist_id').notNullable().references('id').inTable('artist_profiles').onDelete('RESTRICT');
    table.uuid('agent_id').nullable().references('id').inTable('agent_profiles').onDelete('SET NULL');
    table.specificType('event_type', 'event_type').notNullable();
    table.date('event_date').notNullable();
    table.string('event_city', 100).notNullable();
    table.string('event_venue', 500).nullable();
    table.decimal('duration_hours', 4, 1).notNullable();
    table.text('requirements').nullable();
    table.specificType('state', 'booking_state').notNullable().defaultTo('inquiry');
    table.bigInteger('agreed_amount').nullable(); // paise
    table.bigInteger('platform_fee').nullable(); // paise
    table.string('contract_url', 1024).nullable();
    table.string('contract_hash', 64).nullable();
    table.timestamp('confirmed_at').nullable();
    table.timestamp('completed_at').nullable();
    table.timestamp('cancelled_at').nullable();
    table.string('cancellation_reason', 1000).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.index(['client_id', 'state']);
    table.index(['artist_id', 'state']);
    table.index(['agent_id']);
    table.index(['event_date']);
    table.index(['state']);
    table.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('bookings');
}
