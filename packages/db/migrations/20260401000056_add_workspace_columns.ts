import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('bookings', (table) => {
    table.uuid('workspace_id').nullable().references('id').inTable('workspaces');
    table.uuid('workspace_event_id').nullable().references('id').inTable('workspace_events');
  });

  await knex.schema.alterTable('client_profiles', (table) => {
    table.uuid('workspace_id').nullable().references('id').inTable('workspaces');
  });

  await knex.raw('CREATE INDEX idx_bookings_workspace ON bookings (workspace_id)');
  await knex.raw('CREATE INDEX idx_bookings_ws_event ON bookings (workspace_event_id)');
  await knex.raw('CREATE INDEX idx_cp_workspace ON client_profiles (workspace_id)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('client_profiles', (table) => {
    table.dropColumn('workspace_id');
  });
  await knex.schema.alterTable('bookings', (table) => {
    table.dropColumn('workspace_event_id');
    table.dropColumn('workspace_id');
  });
}
