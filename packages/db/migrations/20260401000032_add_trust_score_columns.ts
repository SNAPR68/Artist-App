import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('artist_profiles', (table) => {
    table.decimal('completion_rate', 5, 2).defaultTo(0);
    table.decimal('on_time_rate', 5, 2).defaultTo(0);
    table.decimal('rebooking_rate', 5, 2).defaultTo(0);
    table.decimal('cancellation_rate', 5, 2).defaultTo(0);
    table.decimal('avg_contract_compliance', 5, 2).defaultTo(100);
    table.timestamp('trust_score_updated_at').nullable();
    table.jsonb('trust_score_breakdown').defaultTo('{}');
  });

  await knex.schema.alterTable('reviews', (table) => {
    table.boolean('would_rebook').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('reviews', (table) => {
    table.dropColumn('would_rebook');
  });

  await knex.schema.alterTable('artist_profiles', (table) => {
    table.dropColumn('completion_rate');
    table.dropColumn('on_time_rate');
    table.dropColumn('rebooking_rate');
    table.dropColumn('cancellation_rate');
    table.dropColumn('avg_contract_compliance');
    table.dropColumn('trust_score_updated_at');
    table.dropColumn('trust_score_breakdown');
  });
}
