-- Event Company OS pivot (2026-04-22) — Sprint A Day 2 vendor seed.
-- Seeds 80 vendors across 5 MVP categories by inserting users + artist_profiles
-- rows with the new `category` enum and per-category `category_attributes` JSONB.
--
-- Assumes migrations 96 (vendor_category enum + column) and 97 (category_attributes
-- JSONB) have been applied. Safe to re-run — uses ON CONFLICT DO NOTHING on users
-- (phone unique) and deletes prior seed rows by email prefix 'seed-eos+'.
--
-- Category breakdown:
--   artist   : 20  (existing 'artist' default; we add 20 more for distribution)
--   av       : 20
--   photo    : 15
--   decor    : 15
--   license  : 10
--   promoters: 10  (Sprint D wk1 add)
--   transport: 10  (Sprint D wk1 add)
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Tear down prior run (idempotency)
DELETE FROM artist_profiles
WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'seed-eos+%@grid.test');
DELETE FROM users WHERE email LIKE 'seed-eos+%@grid.test';

-- Helper: generate N vendor rows for a given category with a stage_name prefix
-- We inline the inserts per category for clarity (no pg function needed).

-- ─── 1. ARTIST (20) — extra live performers beyond existing 100 seed ────────
WITH inserted_users AS (
  INSERT INTO users (id, email, phone, phone_hash, role, is_active, created_at)
  SELECT
    gen_random_uuid(),
    'seed-eos+artist' || gs || '@grid.test',
    '+9199990' || LPAD(gs::text, 5, '0'),
    'hash_9199990' || LPAD(gs::text, 5, '0'),
    'artist',
    true,
    now()
  FROM generate_series(1, 20) gs
  RETURNING id, email
)
INSERT INTO artist_profiles (
  id, user_id, stage_name, bio, genres, languages, base_city,
  travel_radius_km, event_types, performance_duration_min,
  performance_duration_max, pricing, profile_completion_pct,
  category, category_attributes, created_at
)
SELECT
  gen_random_uuid(),
  u.id,
  (ARRAY['DJ Kavya','Raga Collective','Beats by Aryan','Neon Groove','Sufi Saaz',
         'The Monsoon Band','Aurora Sound','Tabla Fusion','Midnight Drums','Viva Strings',
         'Electro Raaga','The Barkat Band','Indie Lights','Bhangra Beats','Ritu Live',
         'Acoustic Dost','Bombay Pulse','The Sitar Sessions','Khwaab Duo','Groove Baazaar'])[idx],
  'Live performer seeded for Event OS pilot.',
  ARRAY['Bollywood','Electronic']::text[],
  ARRAY['Hindi','English']::text[],
  (ARRAY['Mumbai','Delhi','Bangalore','Pune','Hyderabad'])[(idx % 5) + 1],
  100, ARRAY['wedding','corporate','private_party']::event_type[], 60, 180,
  '[{"event_type":"wedding","price_min":50000,"price_max":200000}]'::jsonb,
  60, 'artist'::vendor_category,
  jsonb_build_object(
    'genres', ARRAY['Bollywood','Electronic'],
    'languages', ARRAY['Hindi','English'],
    'setup_minutes', 45,
    'has_own_sound', (idx % 2 = 0)
  ),
  now()
FROM (
  SELECT u.id, u.email, row_number() OVER (ORDER BY u.email) AS idx
  FROM inserted_users u
) u;

-- ─── 2. AV (20) — bundled sound+lights+stage vendors ─────────────────────────
WITH inserted_users AS (
  INSERT INTO users (id, email, phone, phone_hash, role, is_active, created_at)
  SELECT
    gen_random_uuid(),
    'seed-eos+av' || gs || '@grid.test',
    '+9199991' || LPAD(gs::text, 5, '0'),
    'hash_9199991' || LPAD(gs::text, 5, '0'),
    'artist', true, now()
  FROM generate_series(1, 20) gs
  RETURNING id, email
)
INSERT INTO artist_profiles (
  id, user_id, stage_name, bio, genres, languages, base_city,
  travel_radius_km, event_types, performance_duration_min,
  performance_duration_max, pricing, profile_completion_pct,
  category, category_attributes, created_at
)
SELECT
  gen_random_uuid(),
  u.id,
  (ARRAY['Soundwave AV','Prism Lights','Stagecraft Mumbai','BoomBox Rentals','LiveLoud AV',
         'Phoenix Stage','Ambient AV','Decibel Pro','Radiance Lighting','Crescendo Rentals',
         'Thunder AV','Arcade Stage','Luminous Events','Echo Pro','Stellar Sound',
         'Voltage AV','Halcyon Lights','Orbit Stage','Quasar AV','Zenith Rentals'])[idx],
  'Bundled sound+lights+stage rental house.',
  ARRAY[]::text[], ARRAY[]::text[],
  (ARRAY['Mumbai','Delhi','Bangalore','Hyderabad','Chennai'])[(idx % 5) + 1],
  150, ARRAY['wedding','corporate','concert']::event_type[], 0, 0,
  '[{"event_type":"corporate","price_min":80000,"price_max":500000}]'::jsonb,
  55, 'av'::vendor_category,
  jsonb_build_object(
    'max_watts', 5000 + (idx * 1000),
    'stage_size_ft', jsonb_build_object('width', 24, 'depth', 16),
    'light_units', 12 + (idx % 8),
    'led_wall_sqft', CASE WHEN idx % 3 = 0 THEN 120 ELSE 0 END,
    'truss_available', (idx % 2 = 0)
  ),
  now()
FROM (
  SELECT u.id, u.email, row_number() OVER (ORDER BY u.email) AS idx
  FROM inserted_users u
) u;

-- ─── 3. PHOTO (15) — photo + video vendors ───────────────────────────────────
WITH inserted_users AS (
  INSERT INTO users (id, email, phone, phone_hash, role, is_active, created_at)
  SELECT
    gen_random_uuid(),
    'seed-eos+photo' || gs || '@grid.test',
    '+9199992' || LPAD(gs::text, 5, '0'),
    'hash_9199992' || LPAD(gs::text, 5, '0'),
    'artist', true, now()
  FROM generate_series(1, 15) gs
  RETURNING id, email
)
INSERT INTO artist_profiles (
  id, user_id, stage_name, bio, genres, languages, base_city,
  travel_radius_km, event_types, performance_duration_min,
  performance_duration_max, pricing, profile_completion_pct,
  category, category_attributes, created_at
)
SELECT
  gen_random_uuid(),
  u.id,
  (ARRAY['Framewala Studios','Cinestory Films','Aperture Co','Candid Capsule','Still Motion Co',
         'Reel Weddings','Lenshaus','Moment Makers','Frame by Frame','Luminous Lens',
         'Nirvana Films','Pixel Diary','OneTake Cinema','Shutter Sutra','Silver Reel'])[idx],
  'Photo + video production house.',
  ARRAY[]::text[], ARRAY[]::text[],
  (ARRAY['Mumbai','Delhi','Bangalore','Goa','Jaipur'])[(idx % 5) + 1],
  200, ARRAY['wedding','corporate','private_party']::event_type[], 0, 0,
  '[{"event_type":"wedding","price_min":80000,"price_max":400000}]'::jsonb,
  55, 'photo'::vendor_category,
  jsonb_build_object(
    'photographers', 1 + (idx % 3),
    'videographers', idx % 3,
    'drone', (idx % 2 = 0),
    'same_day_edit', (idx % 4 = 0),
    'backup_shooter', (idx % 3 = 0)
  ),
  now()
FROM (
  SELECT u.id, u.email, row_number() OVER (ORDER BY u.email) AS idx
  FROM inserted_users u
) u;

-- ─── 4. DECOR (15) — florals, themed setup, custom fab ──────────────────────
WITH inserted_users AS (
  INSERT INTO users (id, email, phone, phone_hash, role, is_active, created_at)
  SELECT
    gen_random_uuid(),
    'seed-eos+decor' || gs || '@grid.test',
    '+9199993' || LPAD(gs::text, 5, '0'),
    'hash_9199993' || LPAD(gs::text, 5, '0'),
    'artist', true, now()
  FROM generate_series(1, 15) gs
  RETURNING id, email
)
INSERT INTO artist_profiles (
  id, user_id, stage_name, bio, genres, languages, base_city,
  travel_radius_km, event_types, performance_duration_min,
  performance_duration_max, pricing, profile_completion_pct,
  category, category_attributes, created_at
)
SELECT
  gen_random_uuid(),
  u.id,
  (ARRAY['Petal & Prose','Mandap Masters','Aura Decor','Velvet Gatherings','Bloomwood',
         'Marigold Studio','White Canvas Events','The Gilded Room','Maharaja Decor','Orchid & Oak',
         'Soirée Lane','Rose Vault','Banyan Events','Crimson Drapes','Jasmine House'])[idx],
  'Event decor, florals, and custom fabrication.',
  ARRAY[]::text[], ARRAY[]::text[],
  (ARRAY['Mumbai','Delhi','Jaipur','Udaipur','Goa'])[(idx % 5) + 1],
  300, ARRAY['wedding','private_party','corporate']::event_type[], 0, 0,
  '[{"event_type":"wedding","price_min":150000,"price_max":1200000}]'::jsonb,
  55, 'decor'::vendor_category,
  jsonb_build_object(
    'themes', ARRAY['royal','contemporary','floral'],
    'flower_types', ARRAY['rose','marigold','orchid'],
    'setup_hours', 6 + (idx % 6),
    'indoor_outdoor', (ARRAY['indoor','outdoor','both'])[(idx % 3) + 1],
    'custom_fab', (idx % 2 = 0)
  ),
  now()
FROM (
  SELECT u.id, u.email, row_number() OVER (ORDER BY u.email) AS idx
  FROM inserted_users u
) u;

-- ─── 5. LICENSE (10) — PPL/IPRS/Novex/permit agents ─────────────────────────
WITH inserted_users AS (
  INSERT INTO users (id, email, phone, phone_hash, role, is_active, created_at)
  SELECT
    gen_random_uuid(),
    'seed-eos+license' || gs || '@grid.test',
    '+9199994' || LPAD(gs::text, 5, '0'),
    'hash_9199994' || LPAD(gs::text, 5, '0'),
    'artist', true, now()
  FROM generate_series(1, 10) gs
  RETURNING id, email
)
INSERT INTO artist_profiles (
  id, user_id, stage_name, bio, genres, languages, base_city,
  travel_radius_km, event_types, performance_duration_min,
  performance_duration_max, pricing, profile_completion_pct,
  category, category_attributes, created_at
)
SELECT
  gen_random_uuid(),
  u.id,
  (ARRAY['Clearance Co','Permit Pundits','Stage Rights Hub','SoundLicense India','EventNOC Partners',
         'LiveLaw Clearances','Decibel Legal','TuneRights','StageDocs','PermitPro Events'])[idx],
  'Event license + permit clearance agent.',
  ARRAY[]::text[], ARRAY[]::text[],
  (ARRAY['Mumbai','Delhi','Bangalore','Hyderabad','Pune'])[(idx % 5) + 1],
  500, ARRAY['concert','corporate','festival']::event_type[], 0, 0,
  '[{"event_type":"concert","price_min":25000,"price_max":150000}]'::jsonb,
  55, 'license'::vendor_category,
  jsonb_build_object(
    'license_types', ARRAY['PPL','IPRS','Novex','Police NOC','Fire NOC'],
    'cities_covered', ARRAY['Mumbai','Delhi','Bangalore'],
    'turnaround_days', 3 + (idx % 7),
    'govt_fees_included', (idx % 2 = 0)
  ),
  now()
FROM (
  SELECT u.id, u.email, row_number() OVER (ORDER BY u.email) AS idx
  FROM inserted_users u
) u;

-- ─── 6. PROMOTERS (10) — Sprint D wk1 ────────────────────────────────────────
WITH inserted_users AS (
  INSERT INTO users (id, email, phone, phone_hash, role, is_active, created_at)
  SELECT
    gen_random_uuid(),
    'seed-eos+promoters' || gs || '@grid.test',
    '+9199995' || LPAD(gs::text, 5, '0'),
    'hash_9199995' || LPAD(gs::text, 5, '0'),
    'artist', true, now()
  FROM generate_series(1, 10) gs
  RETURNING id, email
)
INSERT INTO artist_profiles (
  id, user_id, stage_name, bio, genres, languages, base_city,
  travel_radius_km, event_types, performance_duration_min,
  performance_duration_max, pricing, profile_completion_pct,
  category, category_attributes, created_at
)
SELECT
  gen_random_uuid(),
  u.id,
  (ARRAY['SoundWave Promotions','Nocturne Nights','LiveLoop Agency','CityPulse Promoters',
         'Encore Events','Backbeat Promotions','Afterglow Agency','Stagecraft Promoters',
         'Marquee Nights','Beatfront Agency'])[idx],
  'Event promoter — ticketing, pre-event marketing, influencer seeding.',
  ARRAY[]::text[], ARRAY['Hindi','English']::text[],
  (ARRAY['Mumbai','Delhi','Bangalore','Pune','Hyderabad'])[(idx % 5) + 1],
  500, ARRAY['concert','festival','corporate']::event_type[], 0, 0,
  '[{"event_type":"concert","price_min":75000,"price_max":500000}]'::jsonb,
  60, 'promoters'::vendor_category,
  jsonb_build_object(
    'ticketing_platforms', ARRAY['BookMyShow','District','Paytm Insider'],
    'reach_followers', 50000 + (idx * 25000),
    'past_events_count', 20 + (idx * 5),
    'cities_covered', ARRAY['Mumbai','Delhi','Bangalore']
  ),
  now()
FROM (
  SELECT u.id, u.email, row_number() OVER (ORDER BY u.email) AS idx
  FROM inserted_users u
) u;

-- ─── 7. TRANSPORT (10) — Sprint D wk1 ────────────────────────────────────────
WITH inserted_users AS (
  INSERT INTO users (id, email, phone, phone_hash, role, is_active, created_at)
  SELECT
    gen_random_uuid(),
    'seed-eos+transport' || gs || '@grid.test',
    '+9199996' || LPAD(gs::text, 5, '0'),
    'hash_9199996' || LPAD(gs::text, 5, '0'),
    'artist', true, now()
  FROM generate_series(1, 10) gs
  RETURNING id, email
)
INSERT INTO artist_profiles (
  id, user_id, stage_name, bio, genres, languages, base_city,
  travel_radius_km, event_types, performance_duration_min,
  performance_duration_max, pricing, profile_completion_pct,
  category, category_attributes, created_at
)
SELECT
  gen_random_uuid(),
  u.id,
  (ARRAY['Roadstar Logistics','StageRoll Cartage','Venue Move Co','GearShip India',
         'TourTruck Partners','SetHaul Logistics','LiveLoad Transport','Curtain Cartage',
         'BigWheel Events','RiggerRoad Co'])[idx],
  'Tour + gear transport — sound/light rigs, instrument freight, band vans.',
  ARRAY[]::text[], ARRAY['Hindi','English']::text[],
  (ARRAY['Mumbai','Delhi','Bangalore','Chennai','Kolkata'])[(idx % 5) + 1],
  2000, ARRAY['concert','corporate','festival']::event_type[], 0, 0,
  '[{"event_type":"concert","price_min":15000,"price_max":200000}]'::jsonb,
  55, 'transport'::vendor_category,
  jsonb_build_object(
    'vehicle_types', ARRAY['Tempo Traveller','Mini Container','22-ft Truck','Sedan'],
    'fleet_size', 5 + (idx * 2),
    'gst_registered', true,
    'intercity_capable', (idx % 3 != 0),
    'per_km_rate_inr', 25 + (idx * 5)
  ),
  now()
FROM (
  SELECT u.id, u.email, row_number() OVER (ORDER BY u.email) AS idx
  FROM inserted_users u
) u;

COMMIT;

-- Verify counts
-- SELECT category, COUNT(*) FROM artist_profiles
-- WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'seed-eos+%@grid.test')
-- GROUP BY category ORDER BY category;
