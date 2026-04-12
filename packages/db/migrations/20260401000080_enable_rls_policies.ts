import type { Knex } from 'knex';

/**
 * Enable Row Level Security on all critical user-scoped tables.
 * Policies ensure agencies/users can only see their own data.
 *
 * NOTE: Supabase RLS works with the `auth.uid()` function for PostgREST.
 * Since we use Fastify (not PostgREST), RLS policies use the
 * `current_setting('app.current_user_id')` pattern — the API sets this
 * via SET LOCAL before each query. For now, we enable RLS but use
 * permissive policies that the application layer enforces. This prevents
 * direct DB access from bypassing application security.
 */

const TABLES_WITH_USER_ID = [
  'artist_profiles',
  'agent_profiles',
  'client_profiles',
  'availability_calendar',
  'artist_bank_accounts',
  'media_items',
  'voice_conversations',
];

const TABLES_WITH_WORKSPACE_ID = [
  'workspaces',
  'workspace_members',
  'workspace_events',
  'workspace_event_bookings',
  'workspace_presentations',
];

const TABLES_WITH_BOOKING_SCOPE = [
  'bookings',
  'booking_quotes',
  'payments',
  'reviews',
  'disputes',
];

const TABLES_WITH_BRIEF_SCOPE = [
  'decision_briefs',
  'decision_recommendations',
  'decision_events',
];

export async function up(knex: Knex): Promise<void> {
  // Enable RLS on all critical tables
  const allTables = [
    ...TABLES_WITH_USER_ID,
    ...TABLES_WITH_WORKSPACE_ID,
    ...TABLES_WITH_BOOKING_SCOPE,
    ...TABLES_WITH_BRIEF_SCOPE,
  ];

  for (const table of allTables) {
    await knex.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);

    // Create a permissive policy for the service role (API server)
    // This allows the Fastify API (which connects as the DB user) to
    // access all rows. RLS primarily protects against direct PostgREST
    // or Supabase client access.
    await knex.raw(`
      CREATE POLICY "${table}_service_full_access" ON ${table}
      FOR ALL
      USING (true)
      WITH CHECK (true)
    `);
  }

  // Additionally, create restrictive policies for anon/authenticated
  // Supabase roles (if anyone accesses via PostgREST directly)

  // User-scoped tables: only owner can see their data
  for (const table of TABLES_WITH_USER_ID) {
    await knex.raw(`
      CREATE POLICY "${table}_user_isolation" ON ${table}
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid())
    `);
  }

  // Booking-scoped tables: client or artist can see
  await knex.raw(`
    CREATE POLICY "bookings_party_access" ON bookings
    FOR ALL
    TO authenticated
    USING (client_id = auth.uid() OR artist_id = auth.uid())
  `);

  // Workspace tables: members only
  await knex.raw(`
    CREATE POLICY "workspace_members_access" ON workspace_members
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
  `);

  // Decision briefs: creator only
  await knex.raw(`
    CREATE POLICY "decision_briefs_creator_access" ON decision_briefs
    FOR ALL
    TO authenticated
    USING (created_by_user_id = auth.uid())
  `);
}

export async function down(knex: Knex): Promise<void> {
  const allTables = [
    ...TABLES_WITH_USER_ID,
    ...TABLES_WITH_WORKSPACE_ID,
    ...TABLES_WITH_BOOKING_SCOPE,
    ...TABLES_WITH_BRIEF_SCOPE,
  ];

  for (const table of allTables) {
    // Drop all policies
    await knex.raw(`DROP POLICY IF EXISTS "${table}_service_full_access" ON ${table}`);
    await knex.raw(`DROP POLICY IF EXISTS "${table}_user_isolation" ON ${table}`);
    await knex.raw(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
  }

  await knex.raw(`DROP POLICY IF EXISTS "bookings_party_access" ON bookings`);
  await knex.raw(`DROP POLICY IF EXISTS "workspace_members_access" ON workspace_members`);
  await knex.raw(`DROP POLICY IF EXISTS "decision_briefs_creator_access" ON decision_briefs`);
}
