import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('recommendation_feedback', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.uuid('recommendation_score_id').notNullable().references('id').inTable('recommendation_scores').onDelete('CASCADE');
    table.string('action', 20).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_rf_user ON recommendation_feedback (user_id)');
  await knex.raw('CREATE INDEX idx_rf_rec ON recommendation_feedback (recommendation_score_id)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('recommendation_feedback');
}
