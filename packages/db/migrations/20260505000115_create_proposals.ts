/**
 * Phase 1 Proposal-with-P&L (2026-05-05) — `proposals` table.
 *
 * GRID's first inbound surface: ECs work leads in WhatsApp/email/calls,
 * but when they need to send a *priced, branded, client-facing proposal*
 * with internal P&L margin, they come to GRID.
 *
 * - Workspace-scoped. Optional `event_file_id` linkage (set on conversion
 *   or pre-linked when EC builds proposal off an existing event file).
 * - Status machine: draft → sent → viewed → accepted | declined | expired.
 *   Terminal: accepted (converts to event_file), declined, expired.
 * - Versioning: cloning a proposal creates a new row with parent_proposal_id
 *   pointing back. Client always sees the latest *sent* version.
 * - `public_token` gates the unauthenticated client-facing accept page
 *   (grid.app/p/{token}). NULL until first send.
 * - Money: paise (bigint) everywhere. `margin_pct` is a generated column.
 */
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('proposals', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    t.uuid('workspace_id').notNullable()
      .references('id').inTable('workspaces').onDelete('CASCADE');
    t.uuid('event_file_id').nullable()
      .references('id').inTable('event_files').onDelete('SET NULL');

    // Client (denormalized — proposal predates any client record)
    t.text('client_name').notNullable();
    t.text('client_email').nullable();
    t.text('client_phone').nullable();

    // Event basics
    t.text('event_title').notNullable();
    t.date('event_date').nullable();
    t.text('venue_text').nullable();

    // Status machine
    t.text('status').notNullable().defaultTo('draft');

    // Versioning
    t.integer('version').notNullable().defaultTo(1);
    t.uuid('parent_proposal_id').nullable()
      .references('id').inTable('proposals').onDelete('SET NULL');

    // Money — totals are denormalized from line items, refreshed on write
    t.bigInteger('total_cost_paise').notNullable().defaultTo(0);
    t.bigInteger('total_sell_paise').notNullable().defaultTo(0);

    // Validity
    t.date('valid_until').nullable();

    // Public client-facing token (NULL until first send)
    t.text('public_token').unique().nullable();

    // Timeline
    t.timestamp('sent_at').nullable();
    t.timestamp('viewed_at').nullable();
    t.timestamp('accepted_at').nullable();
    t.timestamp('declined_at').nullable();

    t.uuid('created_by').nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    t.index(['workspace_id', 'status', 'created_at']);
    t.index(['event_file_id']);
    t.index(['parent_proposal_id']);
  });

  // Status check + generated margin_pct column
  await knex.raw(`
    ALTER TABLE proposals
      ADD CONSTRAINT proposals_status_chk
      CHECK (status IN ('draft','sent','viewed','accepted','declined','expired'))
  `);

  await knex.raw(`
    ALTER TABLE proposals
      ADD COLUMN margin_pct numeric(5,2)
      GENERATED ALWAYS AS (
        CASE
          WHEN total_sell_paise > 0
            THEN ROUND(((total_sell_paise - total_cost_paise)::numeric
                      / total_sell_paise::numeric) * 100, 2)
          ELSE 0
        END
      ) STORED
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('proposals');
}
