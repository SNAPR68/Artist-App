/**
 * Phase 1 Proposal-with-P&L (2026-05-05) — `proposal_events` audit log.
 *
 * Append-only timeline of everything that happens to a proposal:
 * sent, viewed (first public-token GET), accepted, declined, version
 * created, converted to event_file. Powers the timeline sidebar in
 * the editor and gives us a tamper-resistant accept-trail (IP +
 * user agent are captured in `meta` jsonb on accept/decline events).
 */
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('proposal_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    t.uuid('proposal_id').notNullable()
      .references('id').inTable('proposals').onDelete('CASCADE');

    // sent | viewed | accepted | declined | version_created | converted
    t.text('event_type').notNullable();

    // Free-form payload: ip, user_agent, decline_reason, target_event_file_id, etc.
    t.jsonb('meta').notNullable().defaultTo('{}');

    // NULL for client-driven events (viewed/accepted/declined via public token)
    t.uuid('actor_user_id').nullable()
      .references('id').inTable('users').onDelete('SET NULL');

    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index(['proposal_id', 'created_at']);
  });

  await knex.raw(`
    ALTER TABLE proposal_events
      ADD CONSTRAINT proposal_events_type_chk
      CHECK (event_type IN ('sent','viewed','accepted','declined','version_created','converted'))
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('proposal_events');
}
