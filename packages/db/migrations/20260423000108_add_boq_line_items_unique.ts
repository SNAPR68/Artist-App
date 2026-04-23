import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Remove duplicate rows created by the seedFromRoster race condition,
  // keeping the row with the lowest sort_order per (event_file_id, vendor_profile_id).
  await knex.raw(`
    DELETE FROM boq_line_items a
    USING boq_line_items b
    WHERE a.event_file_id = b.event_file_id
      AND a.vendor_profile_id = b.vendor_profile_id
      AND a.vendor_profile_id IS NOT NULL
      AND a.sort_order > b.sort_order
  `);

  await knex.schema.alterTable('boq_line_items', (t) => {
    t.unique(['event_file_id', 'vendor_profile_id'], {
      indexName: 'boq_line_items_event_vendor_uidx',
      useConstraint: true,
    });
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('boq_line_items', (t) => {
    t.dropUnique(['event_file_id', 'vendor_profile_id'], 'boq_line_items_event_vendor_uidx');
  });
}
