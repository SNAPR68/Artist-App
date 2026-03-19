import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('artist_profiles', (table) => {
    table.string('slug', 100).unique().nullable();
    table.string('microsite_layout', 20).notNullable().defaultTo('classic');
    table.string('microsite_brand_color', 7).nullable();
    table.text('microsite_hero_image_url').nullable();
    table.jsonb('microsite_featured_review_ids').notNullable().defaultTo('[]');
    table.jsonb('microsite_featured_media_ids').notNullable().defaultTo('[]');
    table.jsonb('social_links').notNullable().defaultTo('{}');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('artist_profiles', (table) => {
    table.dropColumn('slug');
    table.dropColumn('microsite_layout');
    table.dropColumn('microsite_brand_color');
    table.dropColumn('microsite_hero_image_url');
    table.dropColumn('microsite_featured_review_ids');
    table.dropColumn('microsite_featured_media_ids');
    table.dropColumn('social_links');
  });
}
