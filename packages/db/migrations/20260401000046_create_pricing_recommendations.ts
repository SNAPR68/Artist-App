import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('pricing_recommendations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('artist_id').notNullable().references('id').inTable('artist_profiles').onDelete('CASCADE');
    table.specificType('event_type', 'event_type').notNullable();
    table.string('city', 100).nullable();
    table.bigInteger('recommended_min_paise').notNullable();
    table.bigInteger('recommended_max_paise').notNullable();
    table.bigInteger('current_min_paise').notNullable();
    table.bigInteger('current_max_paise').notNullable();
    table.text('rationale').notNullable();
    table.jsonb('factors').notNullable().defaultTo('{}');
    table.decimal('confidence', 3, 2).notNullable();
    table.boolean('is_dismissed').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable();
  });

  await knex.raw('CREATE INDEX idx_pricing_recs_artist ON pricing_recommendations (artist_id, is_dismissed)');
  await knex.raw('CREATE INDEX idx_pricing_recs_expires ON pricing_recommendations (expires_at)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('pricing_recommendations');
}
