import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('bookings', (table) => {
    table.boolean('is_concierge_assisted').notNullable().defaultTo(false);
    table.uuid('concierge_user_id').nullable().references('id').inTable('users');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('bookings', (table) => {
    table.dropColumn('concierge_user_id');
    table.dropColumn('is_concierge_assisted');
  });
}
