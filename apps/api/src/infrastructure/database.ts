import knex from 'knex';
import { config } from '../config/index.js';

// Supabase direct connection (db.*.supabase.co) is IPv6-only and unreachable from Render.
// Automatically rewrite to the IPv4-compatible session pooler if needed.
function getConnectionUrl(url: string): string {
  const match = url.match(/db\.([a-z0-9]+)\.supabase\.co/);
  if (match) {
    const rewritten = url.replace(
      `db.${match[1]}.supabase.co`,
      'aws-1-ap-southeast-2.pooler.supabase.com'
    ).replace(
      /postgresql:\/\/postgres:/,
      `postgresql://postgres.${match[1]}:`
    );
    console.log(`[database] Rewrote direct connection to session pooler`);
    return rewritten;
  }
  return url;
}

const connectionUrl = config.NODE_ENV === 'production' ? getConnectionUrl(config.DATABASE_URL) : config.DATABASE_URL;

export const db = knex({
  client: 'pg',
  connection: {
    connectionString: connectionUrl,
    ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },
  pool: {
    min: config.DATABASE_POOL_MIN,
    max: config.DATABASE_POOL_MAX,
  },
  acquireConnectionTimeout: 10_000,
});

export async function checkDatabaseHealth(): Promise<{ ok: boolean; error?: string }> {
  try {
    await db.raw('SELECT 1');
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}
