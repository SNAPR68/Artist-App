/**
 * Event Company OS (2026-04-23) — Vendor confirmation via WhatsApp.
 *
 * After call sheet dispatch, each vendor gets a template message with YES/NO
 * buttons. Their reply (via Interakt webhook) flips confirmation_status.
 *
 * confirmation_token is a short opaque string we embed in the outbound link
 * so tap-through confirmations work even when the vendor doesn't hit the
 * template button (e.g. forwards the message, replies from a different
 * number, etc.). It's generated fresh on every dispatch.
 */
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('event_file_vendors', (table) => {
    table
      .enu('confirmation_status', ['pending', 'confirmed', 'declined', 'no_response'], {
        useNative: true,
        enumName: 'event_file_vendor_confirmation_status',
      })
      .notNullable()
      .defaultTo('pending');
    table.timestamp('confirmation_sent_at').nullable();
    table.timestamp('confirmation_responded_at').nullable();
    table.string('confirmation_token', 64).nullable().unique();
    table.text('confirmation_response_text').nullable();
    table.index(['confirmation_token']);
    table.index(['confirmation_status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('event_file_vendors', (table) => {
    table.dropColumn('confirmation_response_text');
    table.dropColumn('confirmation_token');
    table.dropColumn('confirmation_responded_at');
    table.dropColumn('confirmation_sent_at');
    table.dropColumn('confirmation_status');
  });
  await knex.raw('DROP TYPE IF EXISTS event_file_vendor_confirmation_status');
}
