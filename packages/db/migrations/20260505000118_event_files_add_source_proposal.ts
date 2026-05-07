/**
 * Phase 1 Proposal-with-P&L (2026-05-05) — `event_files.source_proposal_id`.
 *
 * Back-pointer set when a proposal is converted via
 * POST /v1/workspaces/:wid/proposals/:id/convert-to-event-file.
 * Lets the event file's UI surface the originating proposal (price
 * basis, accept-trail) and lets us prevent the same proposal from
 * being converted twice.
 *
 * SET NULL on proposal delete — preserves the event file even if
 * the proposal is later wiped.
 */
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('event_files', (t) => {
    t.uuid('source_proposal_id').nullable()
      .references('id').inTable('proposals').onDelete('SET NULL');
    t.index(['source_proposal_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('event_files', (t) => {
    t.dropIndex(['source_proposal_id']);
    t.dropColumn('source_proposal_id');
  });
}
