import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TYPE user_role AS ENUM ('artist', 'agent', 'client', 'event_company', 'admin');
  `);
  await knex.raw(`
    CREATE TYPE booking_state AS ENUM (
      'inquiry', 'shortlisted', 'quoted', 'negotiating', 'confirmed',
      'pre_event', 'event_day', 'completed', 'settled',
      'cancelled', 'expired', 'disputed'
    );
  `);
  await knex.raw(`
    CREATE TYPE payment_status AS ENUM (
      'pending', 'authorized', 'captured', 'in_escrow', 'settled',
      'refund_initiated', 'refunded', 'partially_refunded', 'failed'
    );
  `);
  await knex.raw(`
    CREATE TYPE media_type AS ENUM ('video', 'image', 'audio');
  `);
  await knex.raw(`
    CREATE TYPE transcode_status AS ENUM ('pending', 'processing', 'completed', 'failed');
  `);
  await knex.raw(`
    CREATE TYPE calendar_status AS ENUM ('available', 'held', 'booked', 'blocked');
  `);
  await knex.raw(`
    CREATE TYPE event_type AS ENUM (
      'wedding', 'corporate', 'private_party', 'concert', 'club_gig',
      'festival', 'college_event', 'restaurant', 'other'
    );
  `);
  await knex.raw(`
    CREATE TYPE city_tier AS ENUM ('tier_1', 'tier_2', 'tier_3');
  `);
  await knex.raw(`
    CREATE TYPE client_type AS ENUM (
      'corporate', 'wedding_planner', 'club_venue', 'individual', 'event_company'
    );
  `);
}

export async function down(knex: Knex): Promise<void> {
  const types = [
    'client_type', 'city_tier', 'event_type', 'calendar_status',
    'transcode_status', 'media_type', 'payment_status', 'booking_state', 'user_role',
  ];
  for (const t of types) {
    await knex.raw(`DROP TYPE IF EXISTS ${t} CASCADE`);
  }
}
