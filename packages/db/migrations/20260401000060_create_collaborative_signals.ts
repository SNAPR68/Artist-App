import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('collaborative_signals', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('artist_a_id').notNullable().references('id').inTable('artist_profiles').onDelete('CASCADE');
    table.uuid('artist_b_id').notNullable().references('id').inTable('artist_profiles').onDelete('CASCADE');
    table.string('signal_type', 50).notNullable();
    table.decimal('strength', 5, 3).notNullable();
    table.integer('occurrence_count').notNullable().defaultTo(1);
    table.timestamp('last_occurred_at').nullable();
    table.timestamp('computed_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['artist_a_id', 'artist_b_id', 'signal_type']);
  });

  await knex.raw('CREATE INDEX idx_cs_artist_a ON collaborative_signals (artist_a_id)');
  await knex.raw('CREATE INDEX idx_cs_artist_b ON collaborative_signals (artist_b_id)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('collaborative_signals');
}
