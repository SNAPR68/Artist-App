import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('workspace_presentations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('workspace_id').notNullable().references('id').inTable('workspaces').onDelete('CASCADE');
    table.uuid('workspace_event_id').nullable().references('id').inTable('workspace_events');
    table.string('title', 255).notNullable();
    table.string('slug', 100).notNullable().unique();
    table.specificType('artist_ids', 'uuid[]').notNullable();
    table.jsonb('notes_per_artist').notNullable().defaultTo('{}');
    table.text('custom_header').nullable();
    table.text('custom_footer').nullable();
    table.boolean('include_pricing').notNullable().defaultTo(false);
    table.boolean('include_media').notNullable().defaultTo(true);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.integer('view_count').notNullable().defaultTo(0);
    table.uuid('created_by').notNullable().references('id').inTable('users');
    table.timestamp('expires_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_wp_workspace ON workspace_presentations (workspace_id)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('workspace_presentations');
}
