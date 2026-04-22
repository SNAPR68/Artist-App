-- =============================================================================
-- GRID Event Company OS Pivot — Idempotent SQL
-- Generated: 2026-04-22
-- Contains: migrations 096–105 (10 migrations)
-- Run via: Supabase SQL Editor (paste entire file)
-- =============================================================================

-- ─── 20260422000096_add_vendor_category_to_artist_profiles ───

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_category') THEN
    CREATE TYPE vendor_category AS ENUM (
      'artist', 'av', 'photo', 'decor', 'license', 'promoters', 'transport'
    );
  END IF;
END$$;

ALTER TABLE artist_profiles
  ADD COLUMN IF NOT EXISTS category vendor_category NOT NULL DEFAULT 'artist';

CREATE INDEX IF NOT EXISTS artist_profiles_category_idx
  ON artist_profiles(category);

CREATE INDEX IF NOT EXISTS artist_profiles_category_city_idx
  ON artist_profiles(category, base_city);


-- ─── 20260422000097_add_category_attributes_to_artist_profiles ───

ALTER TABLE artist_profiles
  ADD COLUMN IF NOT EXISTS category_attributes JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS artist_profiles_category_attributes_gin_idx
  ON artist_profiles USING GIN (category_attributes);


-- ─── 20260422000098_create_event_files ───

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_file_status') THEN
    CREATE TYPE event_file_status AS ENUM (
      'planning', 'confirmed', 'in_progress', 'completed', 'cancelled'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS event_files (
  id             UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id      UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  event_name     VARCHAR(300) NOT NULL,
  event_date     DATE        NOT NULL,
  call_time      TIME        NULL,
  city           VARCHAR(100) NOT NULL,
  venue          VARCHAR(500) NULL,
  brief          JSONB       NOT NULL DEFAULT '{}',
  status         event_file_status NOT NULL DEFAULT 'planning',
  budget_paise   BIGINT      NULL,
  created_at     TIMESTAMP   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP   NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMP   NULL
);

CREATE INDEX IF NOT EXISTS event_files_client_id_status_idx
  ON event_files(client_id, status);

CREATE INDEX IF NOT EXISTS event_files_event_date_idx
  ON event_files(event_date);

CREATE INDEX IF NOT EXISTS event_files_status_idx
  ON event_files(status);


-- ─── 20260422000099_create_event_file_vendors ───

CREATE TABLE IF NOT EXISTS event_file_vendors (
  id                  UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_file_id       UUID        NOT NULL REFERENCES event_files(id) ON DELETE CASCADE,
  vendor_profile_id   UUID        NOT NULL REFERENCES artist_profiles(id) ON DELETE RESTRICT,
  booking_id          UUID        NULL     REFERENCES bookings(id) ON DELETE SET NULL,
  role                VARCHAR(50) NOT NULL DEFAULT 'primary',
  call_time_override  TIME        NULL,
  notes               TEXT        NULL,
  created_at          TIMESTAMP   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP   NOT NULL DEFAULT NOW(),
  UNIQUE (event_file_id, vendor_profile_id, role)
);

CREATE INDEX IF NOT EXISTS event_file_vendors_event_file_id_idx
  ON event_file_vendors(event_file_id);

CREATE INDEX IF NOT EXISTS event_file_vendors_vendor_profile_id_idx
  ON event_file_vendors(vendor_profile_id);

CREATE INDEX IF NOT EXISTS event_file_vendors_booking_id_idx
  ON event_file_vendors(booking_id);


-- ─── 20260422000100_create_outbound_voice_calls ───

CREATE TABLE IF NOT EXISTS outbound_voice_calls (
  id                    UUID         NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_profile_id     UUID         NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  initiated_by_user_id  UUID         NULL     REFERENCES users(id) ON DELETE SET NULL,
  event_file_id         UUID         NULL     REFERENCES event_files(id) ON DELETE SET NULL,
  booking_id            UUID         NULL     REFERENCES bookings(id) ON DELETE SET NULL,
  category              VARCHAR(32)  NOT NULL,
  purpose               VARCHAR(32)  NOT NULL,
  provider              VARCHAR(16)  NULL,
  provider_call_sid     VARCHAR(128) NULL,
  status                VARCHAR(16)  NOT NULL DEFAULT 'queued',
  phone_e164            VARCHAR(20)  NULL,
  available             BOOLEAN      NULL,
  transcript            TEXT         NULL,
  ai_summary            JSONB        NULL,
  duration_seconds      INTEGER      NULL,
  recording_url         VARCHAR(512) NULL,
  queued_at             TIMESTAMP    NOT NULL DEFAULT NOW(),
  started_at            TIMESTAMP    NULL,
  ended_at              TIMESTAMP    NULL,
  created_at            TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS outbound_voice_calls_vendor_profile_id_idx
  ON outbound_voice_calls(vendor_profile_id);

CREATE INDEX IF NOT EXISTS outbound_voice_calls_event_file_id_idx
  ON outbound_voice_calls(event_file_id);

CREATE INDEX IF NOT EXISTS outbound_voice_calls_booking_id_idx
  ON outbound_voice_calls(booking_id);

CREATE INDEX IF NOT EXISTS outbound_voice_calls_status_idx
  ON outbound_voice_calls(status);

CREATE INDEX IF NOT EXISTS outbound_voice_calls_purpose_idx
  ON outbound_voice_calls(purpose);


-- ─── 20260422000101_create_call_sheet_dispatches ───

CREATE TABLE IF NOT EXISTS call_sheet_dispatches (
  id                    UUID      NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_file_id         UUID      NOT NULL REFERENCES event_files(id) ON DELETE CASCADE,
  generated_by_user_id  UUID      NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  pdf_url               TEXT      NULL,
  xlsx_url              TEXT      NULL,
  pdf_s3_key            TEXT      NULL,
  xlsx_s3_key           TEXT      NULL,
  snapshot              JSONB     NULL,
  dispatch_log          JSONB     NOT NULL DEFAULT '[]',
  recipient_count       INTEGER   NOT NULL DEFAULT 0,
  success_count         INTEGER   NOT NULL DEFAULT 0,
  failure_count         INTEGER   NOT NULL DEFAULT 0,
  generated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  dispatched_at         TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS call_sheet_dispatches_event_file_id_idx
  ON call_sheet_dispatches(event_file_id);

CREATE INDEX IF NOT EXISTS call_sheet_dispatches_generated_at_idx
  ON call_sheet_dispatches(generated_at);


-- ─── 20260422000102_create_consolidated_rider_artifacts ───

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consolidated_rider_source') THEN
    CREATE TYPE consolidated_rider_source AS ENUM ('generated', 'uploaded');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS consolidated_rider_artifacts (
  id                  UUID                     NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_file_id       UUID                     NOT NULL REFERENCES event_files(id) ON DELETE CASCADE,
  created_by_user_id  UUID                     NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  source              consolidated_rider_source NOT NULL,
  pdf_url             TEXT                     NULL,
  xlsx_url            TEXT                     NULL,
  pdf_s3_key          TEXT                     NULL,
  xlsx_s3_key         TEXT                     NULL,
  snapshot            JSONB                    NULL,
  note                TEXT                     NULL,
  created_at          TIMESTAMP                NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS consolidated_rider_artifacts_event_file_id_idx
  ON consolidated_rider_artifacts(event_file_id);

CREATE INDEX IF NOT EXISTS consolidated_rider_artifacts_event_file_id_created_at_idx
  ON consolidated_rider_artifacts(event_file_id, created_at);


-- ─── 20260422000103_create_boq_artifacts ───

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'boq_artifact_source') THEN
    CREATE TYPE boq_artifact_source AS ENUM ('generated', 'uploaded');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS boq_artifacts (
  id                  UUID               NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_file_id       UUID               NOT NULL REFERENCES event_files(id) ON DELETE CASCADE,
  created_by_user_id  UUID               NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  source              boq_artifact_source NOT NULL,
  pdf_url             TEXT               NULL,
  xlsx_url            TEXT               NULL,
  pdf_s3_key          TEXT               NULL,
  xlsx_s3_key         TEXT               NULL,
  subtotal_inr        DECIMAL(14, 2)     NULL,
  gst_inr             DECIMAL(14, 2)     NULL,
  total_inr           DECIMAL(14, 2)     NULL,
  line_item_count     INTEGER            NULL,
  note                TEXT               NULL,
  created_at          TIMESTAMP          NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS boq_artifacts_event_file_id_idx
  ON boq_artifacts(event_file_id);

CREATE INDEX IF NOT EXISTS boq_artifacts_event_file_id_created_at_idx
  ON boq_artifacts(event_file_id, created_at);

CREATE TABLE IF NOT EXISTS boq_line_items (
  id                  UUID           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_file_id       UUID           NOT NULL REFERENCES event_files(id) ON DELETE CASCADE,
  vendor_profile_id   UUID           NULL     REFERENCES artist_profiles(id) ON DELETE SET NULL,
  category            VARCHAR(32)    NOT NULL,
  description         VARCHAR(255)   NOT NULL,
  quantity            INTEGER        NOT NULL DEFAULT 1,
  unit_price_inr      DECIMAL(12, 2) NOT NULL DEFAULT 0,
  line_total_inr      DECIMAL(14, 2) NOT NULL DEFAULT 0,
  gst_rate_pct        DECIMAL(5, 2)  NULL,
  sort_order          INTEGER        NOT NULL DEFAULT 0,
  created_at          TIMESTAMP      NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS boq_line_items_event_file_id_idx
  ON boq_line_items(event_file_id);

CREATE INDEX IF NOT EXISTS boq_line_items_event_file_id_sort_order_idx
  ON boq_line_items(event_file_id, sort_order);


-- ─── 20260422000104_create_instagram_connections ───

CREATE TABLE IF NOT EXISTS instagram_connections (
  id                       UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_profile_id        UUID         NOT NULL UNIQUE REFERENCES artist_profiles(id) ON DELETE CASCADE,
  user_id                  UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token_encrypted   TEXT         NOT NULL,
  access_token_expires_at  TIMESTAMP    NOT NULL,
  fb_user_id               TEXT         NOT NULL,
  fb_page_id               TEXT         NOT NULL,
  ig_user_id               TEXT         NOT NULL,
  ig_username              VARCHAR(64)  NOT NULL,
  follower_count           INTEGER      NULL,
  follows_count            INTEGER      NULL,
  media_count              INTEGER      NULL,
  profile_picture_url      TEXT         NULL,
  biography                TEXT         NULL,
  last_synced_at           TIMESTAMP    NULL,
  is_active                BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS instagram_connections_vendor_profile_id_idx
  ON instagram_connections(vendor_profile_id);

CREATE INDEX IF NOT EXISTS instagram_connections_ig_user_id_idx
  ON instagram_connections(ig_user_id);


-- ─── 20260422000105_create_epk_artifacts ───

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'epk_artifact_source') THEN
    CREATE TYPE epk_artifact_source AS ENUM ('generated', 'uploaded');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS epk_artifacts (
  id                      UUID               NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_profile_id       UUID               NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  created_by_user_id      UUID               NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  source                  epk_artifact_source NOT NULL,
  pdf_url                 TEXT               NULL,
  xlsx_url                TEXT               NULL,
  pptx_url                TEXT               NULL,
  mp4_url                 TEXT               NULL,
  pdf_s3_key              TEXT               NULL,
  xlsx_s3_key             TEXT               NULL,
  pptx_s3_key             TEXT               NULL,
  mp4_s3_key              TEXT               NULL,
  media_item_count        INTEGER            NULL,
  follower_count_snapshot INTEGER            NULL,
  ig_username_snapshot    VARCHAR(64)        NULL,
  note                    TEXT               NULL,
  created_at              TIMESTAMP          NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS epk_artifacts_vendor_profile_id_idx
  ON epk_artifacts(vendor_profile_id);

CREATE INDEX IF NOT EXISTS epk_artifacts_vendor_profile_id_created_at_idx
  ON epk_artifacts(vendor_profile_id, created_at);


-- =============================================================================
-- Mark all 10 migrations as applied in knex_migrations
-- Safe to re-run: INSERT ... WHERE NOT EXISTS guards each row.
-- =============================================================================

DO $$
DECLARE
  v_batch INTEGER;
BEGIN
  SELECT COALESCE(MAX(batch), 0) + 1 INTO v_batch FROM knex_migrations;

  INSERT INTO knex_migrations (name, batch, migration_time)
  SELECT name, v_batch, NOW()
  FROM (VALUES
    ('20260422000096_add_vendor_category_to_artist_profiles.ts'),
    ('20260422000097_add_category_attributes_to_artist_profiles.ts'),
    ('20260422000098_create_event_files.ts'),
    ('20260422000099_create_event_file_vendors.ts'),
    ('20260422000100_create_outbound_voice_calls.ts'),
    ('20260422000101_create_call_sheet_dispatches.ts'),
    ('20260422000102_create_consolidated_rider_artifacts.ts'),
    ('20260422000103_create_boq_artifacts.ts'),
    ('20260422000104_create_instagram_connections.ts'),
    ('20260422000105_create_epk_artifacts.ts')
  ) AS t(name)
  WHERE NOT EXISTS (
    SELECT 1 FROM knex_migrations km WHERE km.name = t.name
  );
END$$;
