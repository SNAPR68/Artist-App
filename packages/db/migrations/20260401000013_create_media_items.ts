import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('media_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('artist_id').notNullable().references('id').inTable('artist_profiles').onDelete('CASCADE');
    table.specificType('type', 'media_type').notNullable();
    table.string('original_url', 1024).notNullable();
    table.string('cdn_url', 1024).nullable();
    table.string('thumbnail_url', 1024).nullable();
    table.string('preview_url', 1024).nullable();
    table.specificType('transcode_status', 'transcode_status').notNullable().defaultTo('pending');
    table.string('title', 200).nullable();
    table.specificType('tags', 'text[]').notNullable().defaultTo('{}');
    table.integer('sort_order').notNullable().defaultTo(0);
    table.bigInteger('file_size_bytes').notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.index(['artist_id', 'sort_order']);
    table.index(['transcode_status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('media_items');
}
