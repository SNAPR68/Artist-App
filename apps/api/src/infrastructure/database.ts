import knex from 'knex';
import pg from 'pg';
import { config } from '../config/index.js';

// PostgreSQL returns DECIMAL/NUMERIC columns as strings for precision.
// Our app doesn't need arbitrary precision — parse them as JS floats.
// OID 1700 = NUMERIC, 700 = FLOAT4, 701 = FLOAT8
pg.types.setTypeParser(1700, (val: string) => parseFloat(val));
pg.types.setTypeParser(700, (val: string) => parseFloat(val));
pg.types.setTypeParser(701, (val: string) => parseFloat(val));

// Supabase direct connection (db.*.supabase.co) is IPv6-only and unreachable from Render.
// Automatically rewrite to the IPv4-compatible session pooler if needed.
function getConnectionUrl(url: string): string {
  const poolerHost = process.env.SUPABASE_POOLER_HOST || 'aws-1-ap-southeast-2.pooler.supabase.com';
  const match = url.match(/db\.([a-z0-9]+)\.supabase\.co/);
  if (match) {
    const rewritten = url.replace(
      `db.${match[1]}.supabase.co`,
      poolerHost
    ).replace(
      /postgresql:\/\/postgres:/,
      `postgresql://postgres.${match[1]}:`
    );
    // Rewritten to session pooler for IPv4 compatibility
    return rewritten;
  }
  return url;
}

const connectionUrl = config.NODE_ENV === 'production' ? getConnectionUrl(config.DATABASE_URL) : config.DATABASE_URL;

export const db = knex({
  client: 'pg',
  connection: {
    connectionString: connectionUrl,
    ssl: config.NODE_ENV === 'production' ? true : false,
  },
  pool: {
    min: config.DATABASE_POOL_MIN ?? 5,
    max: config.DATABASE_POOL_MAX ?? 20,
    idleTimeoutMillis: 30000,
    afterCreate: (conn: any, done: Function) => {
      conn.query('SET statement_timeout = 30000', (err: any) => {
        if (err) return done(err, conn);
        conn.query('SET idle_in_transaction_session_timeout = 60000', (err2: any) => done(err2, conn));
      });
    },
  },
  acquireConnectionTimeout: 5_000,
});

// Slow query logging (> 1 second) — all environments
db.on('query', (query: any) => {
  query.__startTime = Date.now();
});
db.on('query-response', (_response: any, query: any) => {
  const duration = Date.now() - (query.__startTime || Date.now());
  if (duration > 1000) {
    console.warn(`[SLOW QUERY] ${duration}ms: ${(query.sql || '').substring(0, 200)}`);
  }
});

export async function checkDatabaseHealth(): Promise<{ ok: boolean; error?: string }> {
  try {
    await db.raw('SELECT 1');
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}
