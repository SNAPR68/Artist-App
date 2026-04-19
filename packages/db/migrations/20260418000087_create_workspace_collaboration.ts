import type { Knex } from 'knex';

/**
 * Workspace collaboration — comments, @mentions, and assignments on any
 * workspace "resource" (event, booking, presentation).
 *
 * This is the daily-use switching-cost. Once a team has chat history
 * attached to every deal, leaving means losing institutional memory.
 *
 *   workspace_comments      — threaded comments on resources (polymorphic)
 *   workspace_mentions      — denormalized @mention inbox per user
 *   workspace_assignments   — assign a deal/event to a specific team member
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS workspace_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      resource_type TEXT NOT NULL CHECK (resource_type IN ('event', 'booking', 'presentation')),
      resource_id UUID NOT NULL,
      author_user_id UUID NOT NULL REFERENCES users(id),
      body TEXT NOT NULL,
      mentioned_user_ids UUID[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ NULL
    );
  `);
  await knex.raw(`CREATE INDEX IF NOT EXISTS ws_comments_resource_idx ON workspace_comments(resource_type, resource_id, created_at DESC);`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS ws_comments_workspace_idx ON workspace_comments(workspace_id);`);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS workspace_mentions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      mentioned_user_id UUID NOT NULL REFERENCES users(id),
      comment_id UUID NOT NULL REFERENCES workspace_comments(id) ON DELETE CASCADE,
      resource_type TEXT NOT NULL,
      resource_id UUID NOT NULL,
      read_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await knex.raw(`CREATE INDEX IF NOT EXISTS ws_mentions_user_unread_idx ON workspace_mentions(mentioned_user_id, read_at) WHERE read_at IS NULL;`);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS workspace_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      resource_type TEXT NOT NULL CHECK (resource_type IN ('event', 'booking')),
      resource_id UUID NOT NULL,
      assignee_user_id UUID NOT NULL REFERENCES users(id),
      assigned_by_user_id UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (resource_type, resource_id)
    );
  `);
  await knex.raw(`CREATE INDEX IF NOT EXISTS ws_assignments_assignee_idx ON workspace_assignments(assignee_user_id);`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS ws_assignments_workspace_idx ON workspace_assignments(workspace_id);`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TABLE IF EXISTS workspace_assignments;');
  await knex.raw('DROP TABLE IF EXISTS workspace_mentions;');
  await knex.raw('DROP TABLE IF EXISTS workspace_comments;');
}
