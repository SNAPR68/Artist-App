import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('workspace_members', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('workspace_id').notNullable().references('id').inTable('workspaces').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.specificType('role', 'workspace_role').notNullable();
    table.uuid('invited_by').nullable().references('id').inTable('users');
    table.timestamp('invited_at').nullable();
    table.timestamp('accepted_at').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['workspace_id', 'user_id']);
  });

  await knex.raw('CREATE INDEX idx_wm_user ON workspace_members (user_id)');
  await knex.raw('CREATE INDEX idx_wm_workspace ON workspace_members (workspace_id)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('workspace_members');
}
