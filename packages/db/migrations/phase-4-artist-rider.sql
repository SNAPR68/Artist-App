-- ════════════════════════════════════════════════════════════════════════════
-- PHASE 4 — ARTIST TECHNICAL RIDER EXTENSION (2026-05-04)
-- Paste this whole block into Supabase SQL Editor.
-- Idempotent: safe to re-run.
--
-- What this adds:
--   1. Structured rider sections on artist_riders (sound/backline/stage_plot/
--      lighting/power/green_room — hospitality already exists).
--   2. event_rider_fulfillment table — per-event-file checklist that tracks
--      whether each rider line item is fulfilled, by which vendor, and the
--      vendor cross-check status (matched / mismatched / pending).
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Migration 112: structured rider sections on artist_riders ────────────────
ALTER TABLE artist_riders
  ADD COLUMN IF NOT EXISTS sound          JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS backline       JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS stage_plot     JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS lighting       JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS power          JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS green_room     JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS stage_plot_url TEXT  NULL;

-- ── Migration 113: event_rider_fulfillment table ─────────────────────────────
CREATE TABLE IF NOT EXISTS event_rider_fulfillment (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_file_id        UUID NOT NULL REFERENCES event_files(id) ON DELETE CASCADE,
  rider_id             UUID NOT NULL REFERENCES artist_riders(id) ON DELETE CASCADE,
  line_item_id         UUID NOT NULL REFERENCES rider_line_items(id) ON DELETE CASCADE,

  -- Vendor responsible for fulfilling this line item (typically AV / decor).
  assigned_vendor_id   UUID NULL REFERENCES artist_profiles(id) ON DELETE SET NULL,

  -- Fulfilment state — manual override by event company.
  fulfillment_status   rider_fulfillment_status NOT NULL DEFAULT 'not_checked',

  -- Cross-check against assigned vendor's category_attributes (e.g. AV must
  -- carry the requested mic count / wedge count). Updated by API logic.
  -- Values: 'pending' | 'matched' | 'mismatched' | 'partial'
  cross_check_status   TEXT NOT NULL DEFAULT 'pending'
    CHECK (cross_check_status IN ('pending', 'matched', 'mismatched', 'partial')),
  cross_check_notes    TEXT NULL,

  alternative_offered  TEXT NULL,
  checked_by           UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  checked_at           TIMESTAMPTZ NULL,
  notes                TEXT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT event_rider_fulfillment_unique UNIQUE (event_file_id, line_item_id)
);

CREATE INDEX IF NOT EXISTS event_rider_fulfillment_event_idx
  ON event_rider_fulfillment(event_file_id);
CREATE INDEX IF NOT EXISTS event_rider_fulfillment_vendor_idx
  ON event_rider_fulfillment(assigned_vendor_id)
  WHERE assigned_vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS event_rider_fulfillment_status_idx
  ON event_rider_fulfillment(event_file_id, fulfillment_status);

-- ── Record migrations as applied ─────────────────────────────────────────────
INSERT INTO knex_migrations (name, batch, migration_time)
SELECT '20260504000112_extend_artist_riders_sections.ts',
       (SELECT COALESCE(MAX(batch), 0) + 1 FROM knex_migrations), now()
WHERE NOT EXISTS (SELECT 1 FROM knex_migrations WHERE name = '20260504000112_extend_artist_riders_sections.ts');

INSERT INTO knex_migrations (name, batch, migration_time)
SELECT '20260504000113_create_event_rider_fulfillment.ts',
       (SELECT COALESCE(MAX(batch), 0) FROM knex_migrations), now()
WHERE NOT EXISTS (SELECT 1 FROM knex_migrations WHERE name = '20260504000113_create_event_rider_fulfillment.ts');

COMMIT;

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT 'artist_riders new cols' AS check, COUNT(*)::bigint AS n
  FROM information_schema.columns
  WHERE table_name = 'artist_riders'
    AND column_name IN ('sound','backline','stage_plot','lighting','power','green_room','stage_plot_url')
UNION ALL
SELECT 'event_rider_fulfillment rows', COUNT(*)::bigint FROM event_rider_fulfillment;
