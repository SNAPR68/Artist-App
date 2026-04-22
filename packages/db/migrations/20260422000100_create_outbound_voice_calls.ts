/**
 * Event Company OS pivot (2026-04-22) — Outbound voice calls.
 *
 * Every outbound voice interaction (availability-check, day-of check-in, call
 * sheet confirmation) writes a row here. `purpose` distinguishes the call
 * script; `category` is captured at queue-time so we can route to the correct
 * script template for any of the 5 vendor categories.
 *
 * Provider-agnostic: `provider_call_sid` + `provider` are nullable so rows can
 * exist in 'queued' state before a telephony provider is attached (Exotel/
 * Plivo plug-in later). `status` mirrors the standard telephony state machine.
 */
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('outbound_voice_calls', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));

    // Who the call is going to.
    table
      .uuid('vendor_profile_id')
      .notNullable()
      .references('id')
      .inTable('artist_profiles')
      .onDelete('CASCADE');
    // Who asked for the call (the event company user).
    table
      .uuid('initiated_by_user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    // Optional event file context so the transcript attaches to the file.
    table
      .uuid('event_file_id')
      .nullable()
      .references('id')
      .inTable('event_files')
      .onDelete('SET NULL');
    // Optional booking context (day-of check-ins always have a booking).
    table
      .uuid('booking_id')
      .nullable()
      .references('id')
      .inTable('bookings')
      .onDelete('SET NULL');

    // Vendor category at time of queue — frozen here for script routing even
    // if the vendor later changes category.
    table.string('category', 32).notNullable(); // artist | av | photo | decor | license | promoter | transport
    // Why we're calling: 'availability' | 'call_sheet_confirm' | 'day_of_checkin' | 'rider_confirm'
    table.string('purpose', 32).notNullable();

    // Telephony provider state.
    table.string('provider', 16).nullable(); // 'exotel' | 'plivo' | 'twilio'
    table.string('provider_call_sid', 128).nullable();
    table
      .string('status', 16)
      .notNullable()
      .defaultTo('queued'); // queued | dialing | answered | completed | failed | no_answer
    table.string('phone_e164', 20).nullable();

    // Outcome — what the vendor said.
    table.boolean('available').nullable(); // availability calls only
    table.text('transcript').nullable();
    table.jsonb('ai_summary').nullable(); // { intent, next_step, flags[] }
    table.integer('duration_seconds').nullable();
    table.string('recording_url', 512).nullable();

    table.timestamp('queued_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('started_at').nullable();
    table.timestamp('ended_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['vendor_profile_id']);
    table.index(['event_file_id']);
    table.index(['booking_id']);
    table.index(['status']);
    table.index(['purpose']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('outbound_voice_calls');
}
