import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('workspace_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('workspace_id').notNullable().references('id').inTable('workspaces').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.date('event_date').notNullable();
    table.date('event_end_date').nullable();
    table.string('event_city', 100).notNullable();
    table.uuid('venue_id').nullable().references('id').inTable('venue_profiles');
    table.specificType('event_type', 'event_type').notNullable();
    table.integer('guest_count').nullable();
    table.bigInteger('budget_min_paise').nullable();
    table.bigInteger('budget_max_paise').nullable();
    table.text('notes').nullable();
    table.specificType('status', 'workspace_event_status').notNullable().defaultTo('planning');
    table.string('client_name', 255).nullable();
    table.string('client_phone', 20).nullable();
    table.text('client_email').nullable();
    table.uuid('created_by').notNullable().references('id').inTable('users');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
  });

  await knex.raw('CREATE INDEX idx_we_workspace ON workspace_events (workspace_id)');
  await knex.raw('CREATE INDEX idx_we_date ON workspace_events (event_date)');
  await knex.raw('CREATE INDEX idx_we_status ON workspace_events (status)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('workspace_events');
}
