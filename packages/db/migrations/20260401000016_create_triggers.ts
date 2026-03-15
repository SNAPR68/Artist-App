import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create a function to auto-update updated_at timestamp
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // Apply the trigger to all tables with updated_at column
  const tables = [
    'users',
    'artist_profiles',
    'agent_profiles',
    'client_profiles',
    'artist_agent_links',
    'availability_calendar',
    'bookings',
    'booking_quotes',
    'payments',
    'reviews',
    'media_items',
    'shortlists',
  ];

  for (const tableName of tables) {
    await knex.raw(`
      CREATE TRIGGER update_${tableName}_updated_at
      BEFORE UPDATE ON ${tableName}
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
  }
}

export async function down(knex: Knex): Promise<void> {
  const tables = [
    'users',
    'artist_profiles',
    'agent_profiles',
    'client_profiles',
    'artist_agent_links',
    'availability_calendar',
    'bookings',
    'booking_quotes',
    'payments',
    'reviews',
    'media_items',
    'shortlists',
  ];

  for (const tableName of tables) {
    await knex.raw(`DROP TRIGGER IF EXISTS update_${tableName}_updated_at ON ${tableName}`);
  }

  await knex.raw('DROP FUNCTION IF EXISTS update_updated_at_column()');
}
