-- =============================================================================
-- Event Company OS pivot — migrations 096-105 consolidated
-- Generated: 2026-04-22
-- Target: Supabase prod (paste into SQL Editor, run as one transaction)
-- Idempotent: safe to re-run (uses IF NOT EXISTS everywhere)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 096: vendor_category enum + category column on artist_profiles
-- -----------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS artist_profiles_category_base_city_idx
  ON artist_profiles(category, base_city);

-- -----------------------------------------------------------------------------
-- 097: category_attributes JSONB on artist_profiles
-- -----------------------------------------------------------------------------
ALTER TABLE artist_profiles
  ADD COLUMN IF NOT EXISTS category_attributes JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS artist_profiles_category_attributes_gin_idx
  ON artist_profiles USING GIN (category_attributes);

-- -----------------------------------------------------------------------------
-- 098: event_files
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_file_status') THEN
    CREATE TYPE event_file_status AS ENUM (
      'planning', 'confirmed', 'in_progress', 'completed', 'cancelled'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS event_files (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  event_name varchar(300) NOT NULL,
  event_date date NOT NULL,
  call_time time NULL,
  city varchar(100) NOT NULL,
  venue varchar(500) NULL,
  brief jsonb NOT NULL DEFAULT '{}'::jsonb,
  status event_file_status NOT NULL DEFAULT 'planning',
  budget_paise bigint NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS event_files_client_id_status_idx ON event_files(client_id, status);
CREATE INDEX IF NOT EXISTS event_files_event_date_idx ON event_files(event_date);
CREATE INDEX IF NOT EXISTS event_files_status_idx ON event_files(status);

-- -----------------------------------------------------------------------------
-- 099: event_file_vendors join
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_file_vendors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_file_id uuid NOT NULL REFERENCES event_files(id) ON DELETE CASCADE,
  vendor_profile_id uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE RESTRICT,
  booking_id uuid NULL REFERENCES bookings(id) ON DELETE SET NULL,
  role varchar(50) NOT NULL DEFAULT 'primary',
  call_time_override time NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_file_vendors_unique UNIQUE (event_file_id, vendor_profile_id, role)
);

CREATE INDEX IF NOT EXISTS event_file_vendors_event_file_id_idx ON event_file_vendors(event_file_id);
CREATE INDEX IF NOT EXISTS event_file_vendors_vendor_profile_id_idx ON event_file_vendors(vendor_profile_id);
CREATE INDEX IF NOT EXISTS event_file_vendors_booking_id_idx ON event_file_vendors(booking_id);

-- -----------------------------------------------------------------------------
-- 100: outbound_voice_calls
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS outbound_voice_calls (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_profile_id uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  initiated_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  event_file_id uuid NULL REFERENCES event_files(id) ON DELETE SET NULL,
  booking_id uuid NULL REFERENCES bookings(id) ON DELETE SET NULL,
  category varchar(32) NOT NULL,
  purpose varchar(32) NOT NULL,
  provider varchar(16) NULL,
  provider_call_sid varchar(128) NULL,
  status varchar(16) NOT NULL DEFAULT 'queued',
  phone_e164 varchar(20) NULL,
  available boolean NULL,
  transcript text NULL,
  ai_summary jsonb NULL,
  duration_seconds integer NULL,
  recording_url varchar(512) NULL,
  queued_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz NULL,
  ended_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outbound_voice_calls_vendor_profile_id_idx ON outbound_voice_calls(vendor_profile_id);
CREATE INDEX IF NOT EXISTS outbound_voice_calls_event_file_id_idx ON outbound_voice_calls(event_file_id);
CREATE INDEX IF NOT EXISTS outbound_voice_calls_booking_id_idx ON outbound_voice_calls(booking_id);
CREATE INDEX IF NOT EXISTS outbound_voice_calls_status_idx ON outbound_voice_calls(status);
CREATE INDEX IF NOT EXISTS outbound_voice_calls_purpose_idx ON outbound_voice_calls(purpose);

-- -----------------------------------------------------------------------------
-- 101: call_sheet_dispatches
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS call_sheet_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_file_id uuid NOT NULL REFERENCES event_files(id) ON DELETE CASCADE,
  generated_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  pdf_url text NULL,
  xlsx_url text NULL,
  pdf_s3_key text NULL,
  xlsx_s3_key text NULL,
  snapshot jsonb NULL,
  dispatch_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  recipient_count integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now(),
  dispatched_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS call_sheet_dispatches_event_file_id_idx ON call_sheet_dispatches(event_file_id);
CREATE INDEX IF NOT EXISTS call_sheet_dispatches_generated_at_idx ON call_sheet_dispatches(generated_at);

-- -----------------------------------------------------------------------------
-- 102: consolidated_rider_artifacts
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consolidated_rider_source') THEN
    CREATE TYPE consolidated_rider_source AS ENUM ('generated', 'uploaded');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS consolidated_rider_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_file_id uuid NOT NULL REFERENCES event_files(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  source consolidated_rider_source NOT NULL,
  pdf_url text NULL,
  xlsx_url text NULL,
  pdf_s3_key text NULL,
  xlsx_s3_key text NULL,
  snapshot jsonb NULL,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consolidated_rider_artifacts_event_file_id_idx ON consolidated_rider_artifacts(event_file_id);
CREATE INDEX IF NOT EXISTS consolidated_rider_artifacts_event_file_created_idx ON consolidated_rider_artifacts(event_file_id, created_at);

-- -----------------------------------------------------------------------------
-- 103: boq_artifacts + boq_line_items
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'boq_artifact_source') THEN
    CREATE TYPE boq_artifact_source AS ENUM ('generated', 'uploaded');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS boq_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_file_id uuid NOT NULL REFERENCES event_files(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  source boq_artifact_source NOT NULL,
  pdf_url text NULL,
  xlsx_url text NULL,
  pdf_s3_key text NULL,
  xlsx_s3_key text NULL,
  subtotal_inr decimal(14, 2) NULL,
  gst_inr decimal(14, 2) NULL,
  total_inr decimal(14, 2) NULL,
  line_item_count integer NULL,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS boq_artifacts_event_file_id_idx ON boq_artifacts(event_file_id);
CREATE INDEX IF NOT EXISTS boq_artifacts_event_file_created_idx ON boq_artifacts(event_file_id, created_at);

CREATE TABLE IF NOT EXISTS boq_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_file_id uuid NOT NULL REFERENCES event_files(id) ON DELETE CASCADE,
  vendor_profile_id uuid NULL REFERENCES artist_profiles(id) ON DELETE SET NULL,
  category varchar(32) NOT NULL,
  description varchar(255) NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_inr decimal(12, 2) NOT NULL DEFAULT 0,
  line_total_inr decimal(14, 2) NOT NULL DEFAULT 0,
  gst_rate_pct decimal(5, 2) NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS boq_line_items_event_file_id_idx ON boq_line_items(event_file_id);
CREATE INDEX IF NOT EXISTS boq_line_items_event_file_sort_idx ON boq_line_items(event_file_id, sort_order);

-- -----------------------------------------------------------------------------
-- 104: instagram_connections
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS instagram_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_profile_id uuid NOT NULL UNIQUE REFERENCES artist_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token_encrypted text NOT NULL,
  access_token_expires_at timestamptz NOT NULL,
  fb_user_id text NOT NULL,
  fb_page_id text NOT NULL,
  ig_user_id text NOT NULL,
  ig_username varchar(64) NOT NULL,
  follower_count integer NULL,
  follows_count integer NULL,
  media_count integer NULL,
  profile_picture_url text NULL,
  biography text NULL,
  last_synced_at timestamptz NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS instagram_connections_vendor_profile_id_idx ON instagram_connections(vendor_profile_id);
CREATE INDEX IF NOT EXISTS instagram_connections_ig_user_id_idx ON instagram_connections(ig_user_id);

-- -----------------------------------------------------------------------------
-- 105: epk_artifacts
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'epk_artifact_source') THEN
    CREATE TYPE epk_artifact_source AS ENUM ('generated', 'uploaded');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS epk_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_profile_id uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  source epk_artifact_source NOT NULL,
  pdf_url text NULL,
  xlsx_url text NULL,
  pptx_url text NULL,
  mp4_url text NULL,
  pdf_s3_key text NULL,
  xlsx_s3_key text NULL,
  pptx_s3_key text NULL,
  mp4_s3_key text NULL,
  media_item_count integer NULL,
  follower_count_snapshot integer NULL,
  ig_username_snapshot varchar(64) NULL,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS epk_artifacts_vendor_profile_id_idx ON epk_artifacts(vendor_profile_id);
CREATE INDEX IF NOT EXISTS epk_artifacts_vendor_created_idx ON epk_artifacts(vendor_profile_id, created_at);

-- -----------------------------------------------------------------------------
-- Register migrations in knex_migrations so Knex won't re-apply locally
-- -----------------------------------------------------------------------------
INSERT INTO knex_migrations (name, batch, migration_time)
SELECT m.name, (SELECT COALESCE(MAX(batch), 0) + 1 FROM knex_migrations), now()
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
) AS m(name)
WHERE NOT EXISTS (SELECT 1 FROM knex_migrations km WHERE km.name = m.name);

-- -----------------------------------------------------------------------------
-- Sanity check: return the newly created tables + row counts
-- -----------------------------------------------------------------------------
SELECT table_name,
       (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I', table_name), true, true, '')))[1]::text::int AS row_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'event_files', 'event_file_vendors', 'outbound_voice_calls',
    'call_sheet_dispatches', 'consolidated_rider_artifacts',
    'boq_artifacts', 'boq_line_items', 'instagram_connections', 'epk_artifacts'
  )
ORDER BY table_name;

COMMIT;
