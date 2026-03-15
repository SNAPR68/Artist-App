import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('reviews', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('booking_id').notNullable().references('id').inTable('bookings').onDelete('RESTRICT');
    table.uuid('reviewer_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.uuid('reviewee_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.integer('overall_rating').notNullable();
    table.jsonb('dimensions').notNullable().defaultTo('{}');
    table.text('comment').nullable();
    table.boolean('is_published').notNullable().defaultTo(false);
    table.timestamp('publish_at').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.unique(['booking_id', 'reviewer_id']);
    table.index(['reviewee_id', 'is_published']);
    table.index(['publish_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('reviews');
}
