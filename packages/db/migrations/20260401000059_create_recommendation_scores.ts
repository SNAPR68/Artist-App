import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('recommendation_scores', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('source_type', 20).notNullable();
    table.uuid('source_id').notNullable();
    table.uuid('target_artist_id').notNullable().references('id').inTable('artist_profiles').onDelete('CASCADE');
    table.decimal('score', 5, 3).notNullable();
    table.jsonb('score_breakdown').notNullable();
    table.string('recommendation_type', 50).notNullable();
    table.jsonb('context').notNullable().defaultTo('{}');
    table.timestamp('computed_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable();
  });

  await knex.raw('CREATE INDEX idx_rs_source ON recommendation_scores (source_type, source_id)');
  await knex.raw('CREATE INDEX idx_rs_target ON recommendation_scores (target_artist_id)');
  await knex.raw('CREATE INDEX idx_rs_type ON recommendation_scores (recommendation_type)');
  await knex.raw('CREATE INDEX idx_rs_expires ON recommendation_scores (expires_at)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('recommendation_scores');
}
