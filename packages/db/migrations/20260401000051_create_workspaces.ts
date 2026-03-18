import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('workspaces', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.string('slug', 255).notNullable().unique();
    table.uuid('owner_user_id').notNullable().references('id').inTable('users');
    table.text('logo_url').nullable();
    table.string('brand_color', 7).nullable();
    table.text('description').nullable();
    table.text('website').nullable();
    table.string('city', 100).nullable();
    table.string('company_type', 50).nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
  });

  await knex.raw('CREATE INDEX idx_workspaces_owner ON workspaces (owner_user_id)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('workspaces');
}
