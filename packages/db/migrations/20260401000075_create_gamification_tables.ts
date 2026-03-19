import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_points', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').unique();
    table.integer('points').notNullable().defaultTo(0);
    table.string('level', 20).notNullable().defaultTo('bronze');
    table.integer('streak_days').notNullable().defaultTo(0);
    table.timestamp('last_activity_at', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('point_transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.string('action_type', 50).notNullable();
    table.integer('points').notNullable();
    table.jsonb('metadata').notNullable().defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['user_id']);
    table.index(['action_type']);
  });

  await knex.schema.createTable('user_badges', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.string('badge_type', 50).notNullable();
    table.timestamp('earned_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(['user_id', 'badge_type']);
    table.index(['user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_badges');
  await knex.schema.dropTableIfExists('point_transactions');
  await knex.schema.dropTableIfExists('user_points');
}
