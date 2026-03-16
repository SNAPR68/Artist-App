import knex from 'knex';
import { config } from '../config/index.js';

export const db = knex({
  client: 'pg',
  connection: {
    connectionString: config.DATABASE_URL,
    ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },
  pool: {
    min: config.DATABASE_POOL_MIN,
    max: config.DATABASE_POOL_MAX,
  },
  acquireConnectionTimeout: 10_000,
});

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await db.raw('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
