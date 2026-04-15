import type { Knex } from 'knex';

/**
 * Add brand_kit + metadata JSONB columns to workspaces.
 *
 * brand_kit stores the agency's branding (captured at onboarding):
 *   - logo_url, primary_color, secondary_color, font_family
 *   - brand_voice (tone description), signature_tagline
 *   - whatsapp_business_number, business_email
 *
 * metadata stores subscription state, feature flags, and misc JSONB:
 *   - plan (free/pro/enterprise), trial_ends_at, trial_used
 *   - razorpay_subscription_id
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('workspaces', (table) => {
    table.jsonb('brand_kit').notNullable().defaultTo('{}');
    table.jsonb('metadata').notNullable().defaultTo('{}');
  });

  // Index on metadata->>plan for subscription queries
  await knex.raw(`
    CREATE INDEX idx_workspaces_metadata_plan
    ON workspaces ((metadata->>'plan'))
    WHERE (metadata->>'plan') IS NOT NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP INDEX IF EXISTS idx_workspaces_metadata_plan`);
  await knex.schema.alterTable('workspaces', (table) => {
    table.dropColumn('brand_kit');
    table.dropColumn('metadata');
  });
}
