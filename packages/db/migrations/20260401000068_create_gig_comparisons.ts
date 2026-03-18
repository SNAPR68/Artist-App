import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('gig_comparisons', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('artist_id').notNullable().references('id').inTable('artist_profiles').onDelete('CASCADE');
    table.jsonb('inquiry_ids').notNullable().defaultTo('[]');
    table.jsonb('comparison_data').notNullable().defaultTo('[]');
    table.string('recommendation', 50).nullable();
    table.jsonb('reasoning').notNullable().defaultTo('{}');
    table.timestamp('computed_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_gc_artist ON gig_comparisons (artist_id)');
  await knex.raw('CREATE INDEX idx_gc_computed ON gig_comparisons (computed_at)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('gig_comparisons');
}
