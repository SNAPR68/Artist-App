/**
 * Event Company OS (2026-04-23) — Day-of check-in via WhatsApp.
 *
 * Morning-of the event, confirmed vendors get a `day_of_checkin` template
 * asking if they're on track. Replies: YES | DELAYED | HELP.
 *
 * DELAYED / HELP raise an ops flag (checkin_status = 'delayed' | 'help').
 * YES flips them to 'on_track'.
 */
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('event_file_vendors', (table) => {
    table
      .enu('checkin_status', ['pending', 'on_track', 'delayed', 'help', 'no_response'], {
        useNative: true,
        enumName: 'event_file_vendor_checkin_status',
      })
      .notNullable()
      .defaultTo('pending');
    table.timestamp('checkin_sent_at').nullable();
    table.timestamp('checkin_responded_at').nullable();
    table.text('checkin_response_text').nullable();
    table.index(['checkin_status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('event_file_vendors', (table) => {
    table.dropColumn('checkin_response_text');
    table.dropColumn('checkin_responded_at');
    table.dropColumn('checkin_sent_at');
    table.dropColumn('checkin_status');
  });
  await knex.raw('DROP TYPE IF EXISTS event_file_vendor_checkin_status');
}
