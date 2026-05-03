-- ════════════════════════════════════════════════════════════════════════════
-- PHASE 3 — VENDOR RATING SYSTEM (2026-05-04)
-- Paste this whole block into Supabase SQL Editor.
-- Idempotent: safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Migration 109: rating columns on artist_profiles ──────────────────────────
ALTER TABLE artist_profiles
  ADD COLUMN IF NOT EXISTS rating           NUMERIC(3,2)  NULL,
  ADD COLUMN IF NOT EXISTS rating_count     INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ontime_rate      NUMERIC(5,2)  NULL,
  ADD COLUMN IF NOT EXISTS events_done      INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_preferred     BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_blacklisted   BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blacklist_reason TEXT          NULL,
  ADD COLUMN IF NOT EXISTS last_used_at     TIMESTAMPTZ   NULL;

CREATE INDEX IF NOT EXISTS artist_profiles_rating_idx
  ON artist_profiles(rating DESC NULLS LAST)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS artist_profiles_preferred_idx
  ON artist_profiles(is_preferred)
  WHERE is_preferred = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS artist_profiles_blacklist_idx
  ON artist_profiles(is_blacklisted)
  WHERE is_blacklisted = true;

-- ── Migration 110: vendor_ratings table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_ratings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  vendor_profile_id UUID NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  event_file_id     UUID NOT NULL REFERENCES event_files(id) ON DELETE CASCADE,
  rater_user_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  overall           NUMERIC(3,2) NOT NULL,
  quality           NUMERIC(3,2) NULL,
  punctuality       NUMERIC(3,2) NULL,
  communication     NUMERIC(3,2) NULL,
  professionalism   NUMERIC(3,2) NULL,

  was_ontime        BOOLEAN NOT NULL DEFAULT true,
  would_rebook      BOOLEAN NOT NULL DEFAULT true,
  comment           TEXT NULL,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT vendor_ratings_unique UNIQUE (workspace_id, vendor_profile_id, event_file_id),
  CONSTRAINT vendor_ratings_overall_range        CHECK (overall >= 0 AND overall <= 5),
  CONSTRAINT vendor_ratings_quality_range        CHECK (quality IS NULL OR (quality >= 0 AND quality <= 5)),
  CONSTRAINT vendor_ratings_punctuality_range    CHECK (punctuality IS NULL OR (punctuality >= 0 AND punctuality <= 5)),
  CONSTRAINT vendor_ratings_communication_range  CHECK (communication IS NULL OR (communication >= 0 AND communication <= 5)),
  CONSTRAINT vendor_ratings_professionalism_range CHECK (professionalism IS NULL OR (professionalism >= 0 AND professionalism <= 5))
);

CREATE INDEX IF NOT EXISTS vendor_ratings_vendor_idx
  ON vendor_ratings(vendor_profile_id);
CREATE INDEX IF NOT EXISTS vendor_ratings_workspace_created_idx
  ON vendor_ratings(workspace_id, created_at DESC);

-- ── Migration 111: vendor_workspace_flags ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_workspace_flags (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  vendor_profile_id UUID NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,

  is_preferred      BOOLEAN NOT NULL DEFAULT false,
  is_blacklisted    BOOLEAN NOT NULL DEFAULT false,
  blacklist_reason  TEXT NULL,
  notes             TEXT NULL,

  flagged_by        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT vendor_workspace_flags_unique UNIQUE (workspace_id, vendor_profile_id)
);

CREATE INDEX IF NOT EXISTS vendor_workspace_flags_pref_idx
  ON vendor_workspace_flags(workspace_id, is_preferred)
  WHERE is_preferred = true;
CREATE INDEX IF NOT EXISTS vendor_workspace_flags_bl_idx
  ON vendor_workspace_flags(workspace_id, is_blacklisted)
  WHERE is_blacklisted = true;

-- ── Record migrations as applied (so knex won't retry) ────────────────────────
INSERT INTO knex_migrations (name, batch, migration_time)
VALUES
  ('20260504000109_add_vendor_rating_columns.ts',
    (SELECT COALESCE(MAX(batch), 0) + 1 FROM knex_migrations), now()),
  ('20260504000110_create_vendor_ratings.ts',
    (SELECT COALESCE(MAX(batch), 0) FROM knex_migrations), now()),
  ('20260504000111_create_vendor_workspace_flags.ts',
    (SELECT COALESCE(MAX(batch), 0) FROM knex_migrations), now())
ON CONFLICT (name) DO NOTHING;

COMMIT;

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT 'artist_profiles cols' AS check, COUNT(*) AS n
  FROM information_schema.columns
  WHERE table_name = 'artist_profiles'
    AND column_name IN ('rating','rating_count','ontime_rate','events_done',
                        'is_preferred','is_blacklisted','blacklist_reason','last_used_at')
UNION ALL
SELECT 'vendor_ratings rows', COUNT(*)::bigint FROM vendor_ratings
UNION ALL
SELECT 'vendor_workspace_flags rows', COUNT(*)::bigint FROM vendor_workspace_flags;
