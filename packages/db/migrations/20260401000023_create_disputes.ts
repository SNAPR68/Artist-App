import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('disputes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('booking_id').notNullable().references('id').inTable('bookings').onDelete('RESTRICT');
    table.specificType('dispute_type', 'dispute_type').notNullable();
    table.specificType('status', 'dispute_status').notNullable().defaultTo('submitted');
    table.uuid('initiated_by').notNullable().references('id').inTable('users');
    table.text('description').notNullable();
    table.specificType('resolution_type', 'resolution_type').nullable();
    table.text('resolution_notes').nullable();
    table.uuid('resolved_by').nullable().references('id').inTable('users');
    table.timestamp('resolved_at').nullable();
    table.jsonb('financial_resolution').nullable();
    table.jsonb('trust_impact').nullable();
    table.timestamp('evidence_deadline').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['booking_id']);
    table.index(['status']);
    table.index(['initiated_by']);
    table.index(['created_at']);
  });

  // Partial unique index: only one non-closed dispute per booking
  await knex.raw(`
    CREATE UNIQUE INDEX disputes_one_active_per_booking
    ON disputes (booking_id)
    WHERE status NOT IN ('resolved', 'closed');
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('disputes');
}
