import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('workspaces', (table) => {
    table.decimal('default_commission_pct', 5, 2).notNullable().defaultTo(0);
  });

  await knex.schema.alterTable('workspace_event_bookings', (table) => {
    table.decimal('commission_pct', 5, 2).nullable().defaultTo(null);
    table.bigInteger('commission_amount_paise').nullable().defaultTo(null);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('workspace_event_bookings', (table) => {
    table.dropColumn('commission_amount_paise');
    table.dropColumn('commission_pct');
  });

  await knex.schema.alterTable('workspaces', (table) => {
    table.dropColumn('default_commission_pct');
  });
}
