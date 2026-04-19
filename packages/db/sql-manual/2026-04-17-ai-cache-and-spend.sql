-- ═══════════════════════════════════════════════════════════════════
-- Migration: AI response cache + daily spend tracker
-- Apply via Supabase SQL Editor (per CLAUDE.md — no CLI DB access)
-- ═══════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- ai_response_cache
-- Purpose: hash(system_prompt_version + last N turns) → cached Claude
-- response. Avoids re-paying for identical questions across all users.
-- TTL: 30 days generic, 1 hour for time-sensitive (handled in app).
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_response_cache (
  hash TEXT PRIMARY KEY,
  response JSONB NOT NULL,
  model TEXT NOT NULL,
  hit_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_response_cache_expires_idx
  ON ai_response_cache(expires_at);

-- ────────────────────────────────────────────────────────────────────
-- ai_spend_daily
-- Purpose: running USD total per IST calendar day. Checked atomically
-- via UPSERT … RETURNING before every Claude API call. Hard-caps spend.
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_spend_daily (
  date DATE PRIMARY KEY,
  total_cost_usd NUMERIC(10,4) NOT NULL DEFAULT 0,
  request_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optional: cleanup function for expired cache (call nightly or via cron)
-- DELETE FROM ai_response_cache WHERE expires_at < now();
