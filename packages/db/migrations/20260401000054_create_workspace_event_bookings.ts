import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('workspace_event_bookings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('workspace_event_id').notNullable().references('id').inTable('workspace_events').onDelete('CASCADE');
    table.uuid('booking_id').notNullable().references('id').inTable('bookings');
    table.string('role_label', 100).nullable();
    table.integer('sort_order').notNullable().defaultTo(0);
    table.text('notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['workspace_event_id', 'booking_id']);
  });

  await knex.raw('CREATE INDEX idx_web_event ON workspace_event_bookings (workspace_event_id)');
  await knex.raw('CREATE INDEX idx_web_booking ON workspace_event_bookings (booking_id)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('workspace_event_bookings');
}
