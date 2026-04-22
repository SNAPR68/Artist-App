-- Event Company OS pivot (2026-04-22) — demo Event Files for pilot demos.
-- Seeds 1 demo event_company client + 3 Event Files with realistic vendor rosters
-- so the dashboard isn't empty on first login during pilot walk-throughs.
--
-- Safe to re-run — tears down prior demo rows by email prefix 'demo-eos+'.
-- Assumes migrations 96–99 (vendor_category, event_files, event_file_vendors)
-- and the event-os-vendors.sql seed have been applied.
--
-- Run: paste into Supabase SQL Editor. Verification queries at bottom.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ─── Tear down prior demo ────────────────────────────────────────────────────
DELETE FROM event_file_vendors
WHERE event_file_id IN (
  SELECT id FROM event_files WHERE client_id IN (
    SELECT id FROM users WHERE email LIKE 'demo-eos+%@grid.test'
  )
);
DELETE FROM event_files WHERE client_id IN (
  SELECT id FROM users WHERE email LIKE 'demo-eos+%@grid.test'
);
DELETE FROM users WHERE email LIKE 'demo-eos+%@grid.test';

-- ─── 1. Demo client (event company) ──────────────────────────────────────────
INSERT INTO users (id, email, phone, phone_hash, role, is_active, created_at)
VALUES (
  uuid_generate_v4(),
  'demo-eos+pilot-company@grid.test',
  '9999100001',
  'hash_9999100001',
  'event_company',
  true,
  NOW()
);

-- Capture the client id for reuse below
-- (pg doesn't support session vars across statements in SQL editor cleanly, so
--  we embed a subquery in each insert below.)

-- ─── 2. Three Event Files ────────────────────────────────────────────────────
-- File A: Acme Gala (confirmed, all vendors booked)
INSERT INTO event_files
  (client_id, event_name, event_date, call_time, city, venue, brief, status, budget_paise)
SELECT
  u.id,
  'Acme Annual Gala 2026',
  '2026-06-15',
  '17:00',
  'Mumbai',
  'Grand Hyatt Ballroom, Santacruz',
  '{"crowd_size": 400, "vibe": "black-tie corporate", "notes": "Client wants live band for dinner, DJ for after-party."}',
  'confirmed',
  2500000 * 100  -- ₹25L
FROM users u WHERE u.email = 'demo-eos+pilot-company@grid.test';

-- File B: Sharma Sangeet (planning stage, partial roster)
INSERT INTO event_files
  (client_id, event_name, event_date, call_time, city, venue, brief, status, budget_paise)
SELECT
  u.id,
  'Sharma Sangeet',
  '2026-07-20',
  '18:30',
  'Delhi',
  'ITC Maurya, Diplomatic Enclave',
  '{"crowd_size": 250, "vibe": "Bollywood sangeet", "notes": "Need DJ + dhol + photographer. Decor TBD."}',
  'planning',
  1500000 * 100  -- ₹15L
FROM users u WHERE u.email = 'demo-eos+pilot-company@grid.test';

-- File C: Tech Summit (in-progress, day-of ops active)
INSERT INTO event_files
  (client_id, event_name, event_date, call_time, city, venue, brief, status, budget_paise)
SELECT
  u.id,
  'Zenith Tech Summit 2026',
  '2026-04-28',  -- 6 days out from today (2026-04-22)
  '08:00',
  'Bangalore',
  'The Leela Palace, Kempegowda',
  '{"crowd_size": 800, "vibe": "corporate conference", "notes": "Full AV + photo/video + keynote speaker. Day-of check-ins daily."}',
  'in_progress',
  4000000 * 100  -- ₹40L
FROM users u WHERE u.email = 'demo-eos+pilot-company@grid.test';

-- ─── 3. Vendor rosters ───────────────────────────────────────────────────────
-- For each file, attach 2–4 vendors picked from existing seed pool. We pick by
-- category to make the call sheet realistic. Uses the first N vendors of each
-- category (ordered by created_at) — deterministic for demos.

-- File A (Acme Gala): 1 artist (primary), 1 artist (opener), 1 AV, 1 photo, 1 decor
INSERT INTO event_file_vendors (event_file_id, vendor_profile_id, role, call_time_override, notes)
SELECT ef.id, ap.id, 'primary', NULL, 'Headline act — 90 min set during dinner'
FROM event_files ef
CROSS JOIN LATERAL (
  SELECT id FROM artist_profiles WHERE category = 'artist' ORDER BY created_at LIMIT 1 OFFSET 0
) ap
WHERE ef.event_name = 'Acme Annual Gala 2026';

INSERT INTO event_file_vendors (event_file_id, vendor_profile_id, role, call_time_override, notes)
SELECT ef.id, ap.id, 'opener', '16:30', 'Opening DJ set, warm-up'
FROM event_files ef
CROSS JOIN LATERAL (
  SELECT id FROM artist_profiles WHERE category = 'artist' ORDER BY created_at LIMIT 1 OFFSET 1
) ap
WHERE ef.event_name = 'Acme Annual Gala 2026';

INSERT INTO event_file_vendors (event_file_id, vendor_profile_id, role, call_time_override, notes)
SELECT ef.id, ap.id, 'primary', '14:00', 'Sound + lights + stage bundle'
FROM event_files ef
CROSS JOIN LATERAL (
  SELECT id FROM artist_profiles WHERE category = 'av' ORDER BY created_at LIMIT 1
) ap
WHERE ef.event_name = 'Acme Annual Gala 2026';

INSERT INTO event_file_vendors (event_file_id, vendor_profile_id, role, call_time_override, notes)
SELECT ef.id, ap.id, 'primary', '16:00', 'Coverage: cocktails, dinner, performances'
FROM event_files ef
CROSS JOIN LATERAL (
  SELECT id FROM artist_profiles WHERE category = 'photo' ORDER BY created_at LIMIT 1
) ap
WHERE ef.event_name = 'Acme Annual Gala 2026';

INSERT INTO event_file_vendors (event_file_id, vendor_profile_id, role, call_time_override, notes)
SELECT ef.id, ap.id, 'primary', '09:00', 'Ballroom setup — full day load-in'
FROM event_files ef
CROSS JOIN LATERAL (
  SELECT id FROM artist_profiles WHERE category = 'decor' ORDER BY created_at LIMIT 1
) ap
WHERE ef.event_name = 'Acme Annual Gala 2026';

-- File B (Sharma Sangeet): 2 vendors (in planning, sparser roster)
INSERT INTO event_file_vendors (event_file_id, vendor_profile_id, role, call_time_override, notes)
SELECT ef.id, ap.id, 'primary', NULL, 'DJ + dhol combo'
FROM event_files ef
CROSS JOIN LATERAL (
  SELECT id FROM artist_profiles WHERE category = 'artist' ORDER BY created_at LIMIT 1 OFFSET 2
) ap
WHERE ef.event_name = 'Sharma Sangeet';

INSERT INTO event_file_vendors (event_file_id, vendor_profile_id, role, call_time_override, notes)
SELECT ef.id, ap.id, 'primary', NULL, 'Candid + traditional coverage'
FROM event_files ef
CROSS JOIN LATERAL (
  SELECT id FROM artist_profiles WHERE category = 'photo' ORDER BY created_at LIMIT 1 OFFSET 1
) ap
WHERE ef.event_name = 'Sharma Sangeet';

-- File C (Zenith Tech Summit): 4 vendors (full roster, in-progress)
INSERT INTO event_file_vendors (event_file_id, vendor_profile_id, role, call_time_override, notes)
SELECT ef.id, ap.id, 'primary', NULL, 'Keynote speaker / emcee'
FROM event_files ef
CROSS JOIN LATERAL (
  SELECT id FROM artist_profiles WHERE category = 'artist' ORDER BY created_at LIMIT 1 OFFSET 3
) ap
WHERE ef.event_name = 'Zenith Tech Summit 2026';

INSERT INTO event_file_vendors (event_file_id, vendor_profile_id, role, call_time_override, notes)
SELECT ef.id, ap.id, 'primary', '06:00', 'Full conference AV — 3 breakout rooms + main hall'
FROM event_files ef
CROSS JOIN LATERAL (
  SELECT id FROM artist_profiles WHERE category = 'av' ORDER BY created_at LIMIT 1 OFFSET 1
) ap
WHERE ef.event_name = 'Zenith Tech Summit 2026';

INSERT INTO event_file_vendors (event_file_id, vendor_profile_id, role, call_time_override, notes)
SELECT ef.id, ap.id, 'primary', '07:30', 'Photo + video — full-day coverage, same-day reel'
FROM event_files ef
CROSS JOIN LATERAL (
  SELECT id FROM artist_profiles WHERE category = 'photo' ORDER BY created_at LIMIT 1 OFFSET 2
) ap
WHERE ef.event_name = 'Zenith Tech Summit 2026';

INSERT INTO event_file_vendors (event_file_id, vendor_profile_id, role, call_time_override, notes)
SELECT ef.id, ap.id, 'primary', '04:00', 'Stage + signage + green room decor'
FROM event_files ef
CROSS JOIN LATERAL (
  SELECT id FROM artist_profiles WHERE category = 'decor' ORDER BY created_at LIMIT 1 OFFSET 1
) ap
WHERE ef.event_name = 'Zenith Tech Summit 2026';

COMMIT;

-- ─── Verification ────────────────────────────────────────────────────────────
SELECT event_name, event_date, status, city, venue
FROM event_files
WHERE client_id IN (SELECT id FROM users WHERE email LIKE 'demo-eos+%@grid.test')
ORDER BY event_date;

SELECT ef.event_name, COUNT(efv.id) AS vendor_count
FROM event_files ef
LEFT JOIN event_file_vendors efv ON efv.event_file_id = ef.id
WHERE ef.client_id IN (SELECT id FROM users WHERE email LIKE 'demo-eos+%@grid.test')
GROUP BY ef.event_name
ORDER BY ef.event_name;

-- Demo login: phone 9999100001, OTP 123456 (dev bypass), role event_company
