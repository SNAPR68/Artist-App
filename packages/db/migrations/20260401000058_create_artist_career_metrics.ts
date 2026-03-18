import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('artist_career_metrics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('artist_id').notNullable().unique().references('id').inTable('artist_profiles').onDelete('CASCADE');
    table.timestamp('computed_at').notNullable().defaultTo(knex.fn.now());
    table.jsonb('trust_score_history').notNullable().defaultTo('[]');
    table.jsonb('price_progression').notNullable().defaultTo('[]');
    table.jsonb('booking_velocity').notNullable().defaultTo('{}');
    table.jsonb('top_cities').notNullable().defaultTo('[]');
    table.jsonb('top_event_types').notNullable().defaultTo('[]');
    table.decimal('rebook_rate', 5, 2).nullable();
    table.string('avg_crowd_energy', 20).nullable();
    table.decimal('demand_alignment', 5, 2).nullable();
    table.jsonb('gig_advisor').notNullable().defaultTo('[]');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('artist_career_metrics');
}
