import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TYPE venue_status AS ENUM (
      'active', 'inactive', 'pending_verification'
    );
  `);
  await knex.raw(`
    CREATE TYPE rider_item_category AS ENUM (
      'sound', 'lighting', 'backline', 'staging',
      'power', 'hospitality', 'transport', 'other'
    );
  `);
  await knex.raw(`
    CREATE TYPE rider_priority AS ENUM (
      'must_have', 'nice_to_have', 'flexible'
    );
  `);
  await knex.raw(`
    CREATE TYPE rider_fulfillment_status AS ENUM (
      'not_checked', 'available', 'partial', 'unavailable', 'alternative_offered'
    );
  `);
  await knex.raw(`
    CREATE TYPE crowd_energy_level AS ENUM (
      'low', 'moderate', 'high', 'electric'
    );
  `);
  await knex.raw(`
    CREATE TYPE demographic_age_group AS ENUM (
      'under_18', '18_25', '25_35', '35_50', '50_plus', 'mixed'
    );
  `);
  await knex.raw(`
    CREATE TYPE whatsapp_message_direction AS ENUM (
      'inbound', 'outbound'
    );
  `);
  await knex.raw(`
    CREATE TYPE whatsapp_intent_type AS ENUM (
      'search_artist', 'check_availability', 'create_inquiry',
      'get_quote', 'check_status', 'general_question', 'unknown'
    );
  `);
  await knex.raw(`
    CREATE TYPE pricing_tier AS ENUM (
      'budget', 'mid_range', 'premium', 'luxury'
    );
  `);
  await knex.raw(`
    CREATE TYPE demand_level AS ENUM (
      'low', 'moderate', 'high', 'peak'
    );
  `);
}

export async function down(knex: Knex): Promise<void> {
  const types = [
    'demand_level', 'pricing_tier', 'whatsapp_intent_type',
    'whatsapp_message_direction', 'demographic_age_group',
    'crowd_energy_level', 'rider_fulfillment_status',
    'rider_priority', 'rider_item_category', 'venue_status',
  ];
  for (const t of types) {
    await knex.raw(`DROP TYPE IF EXISTS ${t} CASCADE`);
  }
}
