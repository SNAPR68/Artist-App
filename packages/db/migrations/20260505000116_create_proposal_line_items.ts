/**
 * Phase 1 Proposal-with-P&L (2026-05-05) — `proposal_line_items` table.
 *
 * One row per line on a proposal. Carries both `cost_paise` (internal,
 * hidden from client) and `sell_paise` (shown to client). Margin per line
 * is derived; proposal-level totals are denormalized onto `proposals` and
 * refreshed by the API on every write.
 *
 * `category` matches the GRID vendor taxonomy so that on conversion to
 * event_file, lines can be mapped 1:1 to vendor slots / boq_items.
 */
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('proposal_line_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    t.uuid('proposal_id').notNullable()
      .references('id').inTable('proposals').onDelete('CASCADE');

    // Vendor taxonomy: artist | av | photo | decor | license | promoters | transport | other
    t.text('category').notNullable();

    t.text('description').notNullable();
    t.text('notes').nullable();

    t.decimal('qty', 10, 2).notNullable().defaultTo(1);

    // Money — paise. cost is internal-only, sell is client-facing.
    t.bigInteger('cost_paise').notNullable().defaultTo(0);
    t.bigInteger('sell_paise').notNullable().defaultTo(0);

    t.integer('sort_order').notNullable().defaultTo(0);

    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    t.index(['proposal_id', 'sort_order']);
  });

  await knex.raw(`
    ALTER TABLE proposal_line_items
      ADD CONSTRAINT proposal_line_items_category_chk
      CHECK (category IN ('artist','av','photo','decor','license','promoters','transport','other'))
  `);

  await knex.raw(`
    ALTER TABLE proposal_line_items
      ADD CONSTRAINT proposal_line_items_qty_chk CHECK (qty > 0),
      ADD CONSTRAINT proposal_line_items_cost_chk CHECK (cost_paise >= 0),
      ADD CONSTRAINT proposal_line_items_sell_chk CHECK (sell_paise >= 0)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('proposal_line_items');
}
