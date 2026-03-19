import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('workspace_events', (table) => {
    table.string('public_slug', 100).unique().nullable();
    table.boolean('public_dashboard_enabled').notNullable().defaultTo(false);
    table.jsonb('client_visible_fields').notNullable().defaultTo('["name","date","venue","artists","status"]');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('workspace_events', (table) => {
    table.dropColumn('public_slug');
    table.dropColumn('public_dashboard_enabled');
    table.dropColumn('client_visible_fields');
  });
}
