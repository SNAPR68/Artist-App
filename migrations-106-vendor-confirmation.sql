-- Migration 106 (2026-04-23): Vendor confirmation via WhatsApp
-- Run in Supabase SQL editor after deploying API code.

DO $$ BEGIN
  CREATE TYPE event_file_vendor_confirmation_status AS ENUM ('pending', 'confirmed', 'declined', 'no_response');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE event_file_vendors
  ADD COLUMN IF NOT EXISTS confirmation_status event_file_vendor_confirmation_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS confirmation_responded_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS confirmation_token VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS confirmation_response_text TEXT NULL;

DO $$ BEGIN
  ALTER TABLE event_file_vendors ADD CONSTRAINT event_file_vendors_confirmation_token_unique UNIQUE (confirmation_token);
EXCEPTION WHEN duplicate_object THEN null; WHEN duplicate_table THEN null; END $$;

CREATE INDEX IF NOT EXISTS event_file_vendors_confirmation_token_idx ON event_file_vendors (confirmation_token);
CREATE INDEX IF NOT EXISTS event_file_vendors_confirmation_status_idx ON event_file_vendors (confirmation_status);
