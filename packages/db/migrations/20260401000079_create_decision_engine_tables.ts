import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ─── decision_briefs ──────────────────────────────────────
  await knex.schema.createTable('decision_briefs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('source', 20).notNullable().defaultTo('web');
    table.text('raw_text').notNullable();
    table.jsonb('structured_brief').notNullable().defaultTo('{}');
    table.string('status', 20).notNullable().defaultTo('draft');
    table.uuid('created_by_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.uuid('workspace_id').nullable();
    table.uuid('selected_recommendation_id').nullable();
    table.jsonb('metadata').notNullable().defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();

    table.index(['status']);
    table.index(['created_by_user_id']);
    table.index(['workspace_id']);
    table.index(['created_at']);
  });

  // ─── decision_recommendations ─────────────────────────────
  await knex.schema.createTable('decision_recommendations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('brief_id').notNullable().references('id').inTable('decision_briefs').onDelete('CASCADE');
    table.uuid('artist_id').notNullable();
    table.decimal('score', 5, 3).notNullable();
    table.decimal('confidence', 3, 2).notNullable();
    table.bigInteger('price_min_paise').notNullable();
    table.bigInteger('price_max_paise').notNullable();
    table.bigInteger('expected_close_paise').nullable();
    table.jsonb('reasons').notNullable().defaultTo('[]');
    table.jsonb('risk_flags').notNullable().defaultTo('[]');
    table.jsonb('logistics_flags').notNullable().defaultTo('[]');
    table.jsonb('score_breakdown').notNullable().defaultTo('{}');
    table.smallint('rank').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['brief_id']);
    table.index(['artist_id']);
    table.index(['brief_id', 'rank']);
  });

  // ─── decision_events ──────────────────────────────────────
  await knex.schema.createTable('decision_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('brief_id').notNullable().references('id').inTable('decision_briefs').onDelete('CASCADE');
    table.string('event_type', 50).notNullable();
    table.jsonb('payload').notNullable().defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['brief_id']);
    table.index(['event_type']);
    table.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('decision_events');
  await knex.schema.dropTableIfExists('decision_recommendations');
  await knex.schema.dropTableIfExists('decision_briefs');
}
