import type { Knex } from 'knex';

/**
 * Add missing columns to bookings that the repository/service expect.
 * The migration has: duration_hours, state, agreed_amount, platform_fee
 * The repository uses: event_duration_hours, guest_count, special_requirements,
 *   quoted_amount_paise, final_amount_paise, etc.
 *
 * Solution: add the missing columns that the repository needs.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('bookings', (table) => {
    table.integer('guest_count').nullable();
    table.text('special_requirements').nullable();
    table.bigInteger('quoted_amount_paise').nullable();
    table.bigInteger('final_amount_paise').nullable();
    table.bigInteger('platform_fee_paise').nullable();
    table.bigInteger('artist_payout_paise').nullable();
    table.bigInteger('tds_amount_paise').nullable();
    table.bigInteger('gst_amount_paise').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('bookings', (table) => {
    table.dropColumn('guest_count');
    table.dropColumn('special_requirements');
    table.dropColumn('quoted_amount_paise');
    table.dropColumn('final_amount_paise');
    table.dropColumn('platform_fee_paise');
    table.dropColumn('artist_payout_paise');
    table.dropColumn('tds_amount_paise');
    table.dropColumn('gst_amount_paise');
  });
}
