import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TYPE workspace_role AS ENUM (
      'owner', 'manager', 'coordinator'
    );
  `);
  await knex.raw(`
    CREATE TYPE workspace_event_status AS ENUM (
      'planning', 'confirmed', 'in_progress', 'completed', 'cancelled'
    );
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TYPE IF EXISTS workspace_event_status CASCADE');
  await knex.raw('DROP TYPE IF EXISTS workspace_role CASCADE');
}
