import type { Knex } from 'knex';

/**
 * White-label tier — agencies on the ₹50K/mo plan can hide GRID branding
 * from proposals, client portal URLs, and WhatsApp messages. Their clients
 * see only the agency brand. Platform presence stays invisible.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE workspaces
      ADD COLUMN IF NOT EXISTS white_label BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS custom_domain TEXT NULL;
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS workspaces_custom_domain_idx
      ON workspaces(custom_domain) WHERE custom_domain IS NOT NULL;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS workspaces_custom_domain_idx;');
  await knex.raw('ALTER TABLE workspaces DROP COLUMN IF EXISTS white_label, DROP COLUMN IF EXISTS custom_domain;');
}
