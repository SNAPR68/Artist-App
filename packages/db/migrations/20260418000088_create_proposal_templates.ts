import type { Knex } from 'knex';

/**
 * Proposal templates — reusable settings agencies apply when generating
 * presentations. Lets an agency save "Corporate pitch deck" or
 * "Wedding pitch" presets with their own copy, terms, header style.
 *
 * Switching cost: once an agency has 5 polished templates, migrating means
 * rewriting all of them elsewhere.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS proposal_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NULL,
      custom_header TEXT NULL,
      custom_footer TEXT NULL,
      terms_and_conditions TEXT NULL,
      include_pricing BOOLEAN NOT NULL DEFAULT false,
      include_media BOOLEAN NOT NULL DEFAULT true,
      is_default BOOLEAN NOT NULL DEFAULT false,
      created_by UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ NULL
    );
  `);
  await knex.raw(`CREATE INDEX IF NOT EXISTS proposal_templates_workspace_idx ON proposal_templates(workspace_id) WHERE deleted_at IS NULL;`);

  // Add terms_and_conditions to workspace_presentations so templates can inject it
  await knex.raw(`
    ALTER TABLE workspace_presentations
      ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT NULL,
      ADD COLUMN IF NOT EXISTS template_id UUID NULL REFERENCES proposal_templates(id) ON DELETE SET NULL;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE workspace_presentations
      DROP COLUMN IF EXISTS template_id,
      DROP COLUMN IF EXISTS terms_and_conditions;
  `);
  await knex.raw('DROP TABLE IF EXISTS proposal_templates;');
}
