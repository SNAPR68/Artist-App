import type { Knex } from 'knex';

/**
 * AI cost control infrastructure for Claude-powered voice assistant.
 *
 * - ai_response_cache: hashed input → cached response (30-day TTL for generic,
 *   1-hour TTL for time-sensitive). Purpose: avoid re-calling Claude for
 *   identical questions across users.
 * - ai_spend_daily: daily running total of Anthropic API spend in USD.
 *   Checked atomically before every Claude call via UPSERT RETURNING.
 *   Hard-caps daily spend to prevent runaway costs.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ai_response_cache (
      hash TEXT PRIMARY KEY,
      response JSONB NOT NULL,
      model TEXT NOT NULL,
      hit_count INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at TIMESTAMPTZ NOT NULL
    );
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ai_response_cache_expires_idx
      ON ai_response_cache(expires_at);
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ai_spend_daily (
      date DATE PRIMARY KEY,
      total_cost_usd NUMERIC(10,4) NOT NULL DEFAULT 0,
      request_count INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TABLE IF EXISTS ai_response_cache;');
  await knex.raw('DROP TABLE IF EXISTS ai_spend_daily;');
}
