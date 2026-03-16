import type { Knex } from 'knex';

/**
 * Add missing columns to client_profiles that the repository expects.
 * The original migration only had: id, user_id, client_type, company_name, total_bookings.
 * The repository also uses: city, company_type, event_types_interested, average_budget_min, average_budget_max.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('client_profiles', (table) => {
    table.string('company_type', 100).nullable();
    table.string('city', 100).nullable();
    table.specificType('event_types_interested', 'text[]').defaultTo('{}');
    table.bigInteger('average_budget_min').nullable();
    table.bigInteger('average_budget_max').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('client_profiles', (table) => {
    table.dropColumn('company_type');
    table.dropColumn('city');
    table.dropColumn('event_types_interested');
    table.dropColumn('average_budget_min');
    table.dropColumn('average_budget_max');
  });
}
