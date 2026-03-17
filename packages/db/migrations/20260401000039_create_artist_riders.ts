import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('artist_riders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('artist_id').notNullable().unique().references('id').inTable('artist_profiles').onDelete('CASCADE');
    table.integer('version').notNullable().defaultTo(1);
    table.text('notes').nullable();
    table.jsonb('hospitality_requirements').notNullable().defaultTo('{}');
    table.jsonb('travel_requirements').notNullable().defaultTo('{}');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('artist_riders');
}
