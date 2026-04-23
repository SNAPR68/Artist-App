-- Re-seed DEMO event files with confirmation + checkin statuses
-- Run in Supabase SQL Editor (Settings → SQL Editor)
-- Safe to run multiple times (idempotent)

DO $$
DECLARE
  v_client_id uuid;
  v_ef1_id uuid;
  v_ef2_id uuid;
  v_ef3_id uuid;

  -- artist category vendor IDs (6 slots)
  a_ids uuid[];
  -- av category
  av_ids uuid[];
  -- photo
  ph_ids uuid[];
  -- decor
  dc_ids uuid[];
  -- transport
  tr_ids uuid[];
  -- license
  li_ids uuid[];
  -- promoters
  pr_ids uuid[];

BEGIN
  -- 1. Pick a client user
  SELECT id INTO v_client_id FROM users WHERE role = 'client' AND deleted_at IS NULL LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'No client user found — run base seeds first.';
  END IF;
  RAISE NOTICE 'Using client_id = %', v_client_id;

  -- 2. Clear prior DEMO files
  DELETE FROM event_file_vendors WHERE event_file_id IN (
    SELECT id FROM event_files WHERE event_name LIKE 'DEMO:%' AND deleted_at IS NULL
  );
  DELETE FROM event_files WHERE event_name LIKE 'DEMO:%';
  RAISE NOTICE 'Cleared prior DEMO event files.';

  -- 3. Pick vendor IDs by category (random, enough for all 3 events)
  SELECT ARRAY(SELECT id FROM artist_profiles WHERE category = 'artist' AND deleted_at IS NULL ORDER BY random() LIMIT 15) INTO a_ids;
  SELECT ARRAY(SELECT id FROM artist_profiles WHERE category = 'av'     AND deleted_at IS NULL ORDER BY random() LIMIT 6)  INTO av_ids;
  SELECT ARRAY(SELECT id FROM artist_profiles WHERE category = 'photo'  AND deleted_at IS NULL ORDER BY random() LIMIT 7)  INTO ph_ids;
  SELECT ARRAY(SELECT id FROM artist_profiles WHERE category = 'decor'  AND deleted_at IS NULL ORDER BY random() LIMIT 6)  INTO dc_ids;
  SELECT ARRAY(SELECT id FROM artist_profiles WHERE category = 'transport' AND deleted_at IS NULL ORDER BY random() LIMIT 4) INTO tr_ids;
  SELECT ARRAY(SELECT id FROM artist_profiles WHERE category = 'license'   AND deleted_at IS NULL ORDER BY random() LIMIT 2) INTO li_ids;
  SELECT ARRAY(SELECT id FROM artist_profiles WHERE category = 'promoters' AND deleted_at IS NULL ORDER BY random() LIMIT 1) INTO pr_ids;

  -- ── EVENT FILE 1: Malabar Hill Wedding ──────────────────────────────────
  INSERT INTO event_files (client_id, event_name, event_date, call_time, city, venue, brief, status)
  VALUES (
    v_client_id, 'DEMO: Malabar Hill Wedding', '2026-12-14', '15:00',
    'Mumbai', 'Taj Mahal Palace — Ballroom',
    '{"scale":"intimate","guest_count":280,"theme":"Royal Indian","budget_tier":"premium","dietary":["vegetarian","jain"]}',
    'confirmed'
  ) RETURNING id INTO v_ef1_id;

  INSERT INTO event_file_vendors (event_file_id, vendor_profile_id, role, call_time_override, notes, confirmation_status, checkin_status) VALUES
    (v_ef1_id, a_ids[1],  'Sangeet Band',    '13:00', NULL,                              'confirmed',   'on_track'),
    (v_ef1_id, a_ids[2],  'DJ',              '14:00', NULL,                              'confirmed',   'on_track'),
    (v_ef1_id, av_ids[1], 'Sound + Lights #1','10:00','Full stage rig, ~8kW',            'confirmed',   'delayed'),
    (v_ef1_id, av_ids[2], 'Sound + Lights #2','10:00','Full stage rig, ~8kW',            'confirmed',   'delayed'),
    (v_ef1_id, ph_ids[1], 'Lead Photog',     '13:30', NULL,                              'confirmed',   'on_track'),
    (v_ef1_id, ph_ids[2], 'Candid Team',     '13:30', NULL,                              'confirmed',   'on_track'),
    (v_ef1_id, dc_ids[1], 'Floral + Mandap #1','09:00','6hr build-out',                 'confirmed',   'on_track'),
    (v_ef1_id, dc_ids[2], 'Floral + Mandap #2','09:00','6hr build-out',                 'confirmed',   'on_track'),
    (v_ef1_id, tr_ids[1], 'Guest Shuttle',   NULL,    '3x Tempo Traveller, airport pickups','no_response','pending');

  RAISE NOTICE 'Seeded event file 1: Malabar Hill Wedding (id=%)', v_ef1_id;

  -- ── EVENT FILE 2: Infosys Product Launch ────────────────────────────────
  INSERT INTO event_files (client_id, event_name, event_date, call_time, city, venue, brief, status)
  VALUES (
    v_client_id, 'DEMO: Infosys Product Launch', '2026-05-08', '09:30',
    'Bengaluru', 'Infosys Mysore Campus — Aud 1',
    '{"scale":"corporate","guest_count":600,"theme":"AI Futurism","budget_tier":"enterprise","livestream":true}',
    'confirmed'
  ) RETURNING id INTO v_ef2_id;

  INSERT INTO event_file_vendors (event_file_id, vendor_profile_id, role, call_time_override, notes, confirmation_status, checkin_status) VALUES
    (v_ef2_id, av_ids[3], 'Broadcast AV #1', '05:30', '4K multi-cam, IMAG',            'confirmed', 'on_track'),
    (v_ef2_id, av_ids[4], 'Broadcast AV #2', '05:30', '4K multi-cam, IMAG',            'confirmed', 'on_track'),
    (v_ef2_id, ph_ids[3], 'Event Coverage #1','09:30', NULL,                            'confirmed', 'on_track'),
    (v_ef2_id, ph_ids[4], 'Event Coverage #2','09:30', NULL,                            'confirmed', 'on_track'),
    (v_ef2_id, dc_ids[3], 'Stage Design #1', '01:30', 'LED backdrop + truss',           'confirmed', 'on_track'),
    (v_ef2_id, dc_ids[4], 'Stage Design #2', '01:30', 'LED backdrop + truss',           'confirmed', 'on_track'),
    (v_ef2_id, a_ids[8],  'Entertainment',   '09:30', 'Post-keynote slot',              'confirmed', 'on_track'),
    (v_ef2_id, li_ids[1], 'PPL + IPRS',      NULL,    'Music clearance',                'confirmed', 'pending'),
    (v_ef2_id, tr_ids[2], 'VIP Transfer',    NULL,    '2x sedan, board-level',          'confirmed', 'on_track');

  RAISE NOTICE 'Seeded event file 2: Infosys Product Launch (id=%)', v_ef2_id;

  -- ── EVENT FILE 3: Sunburn Goa Weekend ───────────────────────────────────
  INSERT INTO event_files (client_id, event_name, event_date, call_time, city, venue, brief, status)
  VALUES (
    v_client_id, 'DEMO: Sunburn Goa Weekend', '2026-10-25', '14:00',
    'Goa', 'Vagator Hilltop — Main Stage',
    '{"scale":"festival","guest_count":18000,"theme":"Sunset to Sunrise","days":2,"budget_tier":"festival"}',
    'confirmed'
  ) RETURNING id INTO v_ef3_id;

  INSERT INTO event_file_vendors (event_file_id, vendor_profile_id, role, call_time_override, notes, confirmation_status, checkin_status) VALUES
    (v_ef3_id, a_ids[9],  'Headliner #1',     '11:00', NULL,                            'confirmed', 'on_track'),
    (v_ef3_id, a_ids[10], 'Headliner #2',     '11:00', NULL,                            'confirmed', 'on_track'),
    (v_ef3_id, a_ids[11], 'Headliner #3',     '11:00', NULL,                            'confirmed', 'on_track'),
    (v_ef3_id, a_ids[12], 'Support Act #1',   '12:00', NULL,                            'confirmed', 'on_track'),
    (v_ef3_id, a_ids[13], 'Support Act #2',   '12:00', NULL,                            'confirmed', 'on_track'),
    (v_ef3_id, a_ids[14], 'Support Act #3',   '12:00', NULL,                            'confirmed', 'on_track'),
    (v_ef3_id, a_ids[15], 'Support Act #4',   '12:00', NULL,                            'confirmed', 'on_track'),
    (v_ef3_id, av_ids[5], 'Main Stage Rig #1','02:00', 'Line array, intelligent lighting','confirmed','delayed'),
    (v_ef3_id, av_ids[6], 'Main Stage Rig #2','02:00', 'Line array, intelligent lighting','confirmed','delayed'),
    (v_ef3_id, ph_ids[5], 'Festival Crew #1', '14:00', NULL,                            'confirmed', 'on_track'),
    (v_ef3_id, ph_ids[6], 'Festival Crew #2', '14:00', NULL,                            'confirmed', 'on_track'),
    (v_ef3_id, dc_ids[5], 'Scenic + SFX #1',  '02:00','Pyro + CO2, confetti cannons',  'confirmed', 'on_track'),
    (v_ef3_id, dc_ids[6], 'Scenic + SFX #2',  '02:00','Pyro + CO2, confetti cannons',  'confirmed', 'on_track'),
    (v_ef3_id, li_ids[2], 'Performance Rights',NULL,   NULL,                            'confirmed', 'pending'),
    (v_ef3_id, pr_ids[1], 'Ticketing',         NULL,  'BookMyShow integration',         'confirmed', 'on_track'),
    (v_ef3_id, tr_ids[3], 'Artist Transfer #1',NULL,  'GOI airport → Vagator',          'confirmed', 'help'),
    (v_ef3_id, tr_ids[4], 'Artist Transfer #2',NULL,  'GOI airport → Vagator',          'confirmed', 'help');

  RAISE NOTICE 'Seeded event file 3: Sunburn Goa Weekend (id=%)', v_ef3_id;
  RAISE NOTICE 'DONE. All 3 DEMO event files seeded with status chips.';
END $$;
