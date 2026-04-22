/**
 * Event Company OS pivot (2026-04-22) — Event File.
 *
 * The Event File is the single container for one client event across all vendor
 * categories. Prior model: each booking was isolated. New model: an event has
 * one file that carries client_id, call_time, venue, and links out to all vendor
 * bookings via the join table in migration 99.
 *
 * Key fields:
 *   - client_id      → users.id (the event company / planner owning the event)
 *   - event_name     → human label ("Acme Gala 2026")
 *   - event_date     → date the event happens
 *   - call_time      → **single source of truth for crew call time**
 *                      (call sheet generator in Sprint C reads this)
 *   - venue / city   → where the event happens
 *   - status         → planning | confirmed | in_progress | completed | cancelled
 *   - brief          → free-form brief / client requirements JSONB
 *
 * Bookings stay their own table; migration 99 adds event_file_id + role to
 * a join table so we never break existing queries.
 */
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_file_status') THEN
        CREATE TYPE event_file_status AS ENUM (
          'planning', 'confirmed', 'in_progress', 'completed', 'cancelled'
        );
      END IF;
    END$$;
  `);

  await knex.schema.createTable('event_files', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('client_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('RESTRICT');
    table.string('event_name', 300).notNullable();
    table.date('event_date').notNullable();
    table.time('call_time').nullable();
    table.string('city', 100).notNullable();
    table.string('venue', 500).nullable();
    table.jsonb('brief').notNullable().defaultTo('{}');
    table.specificType('status', 'event_file_status').notNullable().defaultTo('planning');
    table.bigInteger('budget_paise').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.index(['client_id', 'status']);
    table.index(['event_date']);
    table.index(['status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('event_files');
  await knex.raw(`DROP TYPE IF EXISTS event_file_status;`);
}
