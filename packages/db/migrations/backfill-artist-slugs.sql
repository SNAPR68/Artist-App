-- Backfill artist_profiles.slug from stage_name.
-- Run once in Supabase SQL Editor. Idempotent: only touches NULL slugs.
-- Uniqueness handled by appending short id suffix on collision.

UPDATE artist_profiles
SET slug = base_slug || '-' || substr(id::text, 1, 6)
FROM (
  SELECT
    id,
    regexp_replace(
      regexp_replace(lower(stage_name), '[^a-z0-9]+', '-', 'g'),
      '(^-|-$)', '', 'g'
    ) AS base_slug
  FROM artist_profiles
  WHERE slug IS NULL
) src
WHERE artist_profiles.id = src.id
  AND artist_profiles.slug IS NULL
  AND src.base_slug <> '';

-- Verify
SELECT id, stage_name, slug FROM artist_profiles WHERE slug IS NOT NULL LIMIT 5;
SELECT COUNT(*) AS null_slugs FROM artist_profiles WHERE slug IS NULL;
