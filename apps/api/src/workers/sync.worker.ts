/**
 * PG → OpenSearch sync worker
 *
 * Polls artist_profiles for recently updated records and syncs them
 * into the OpenSearch artists_v1 index. Runs on a 5-second interval.
 *
 * In production, this would run as a separate ECS task.
 * For dev, it can be started via `tsx src/workers/sync.worker.ts`.
 */

import { db } from '../infrastructure/database.js';
import { opensearch, ARTIST_INDEX, ensureIndex } from '../modules/search/search.index.js';

let lastSyncAt = new Date(0);

async function syncArtists() {
  const updatedProfiles = await db('artist_profiles as ap')
    .join('users as u', 'u.id', 'ap.user_id')
    .where('ap.updated_at', '>', lastSyncAt)
    .where({ 'ap.deleted_at': null, 'u.is_active': true })
    .select(
      'ap.id',
      'ap.user_id',
      'ap.stage_name',
      'ap.bio',
      'ap.genres',
      'ap.languages',
      'ap.base_city',
      'ap.travel_radius_km',
      'ap.event_types',
      'ap.performance_duration_min',
      'ap.performance_duration_max',
      'ap.pricing',
      'ap.trust_score',
      'ap.total_bookings',
      'ap.acceptance_rate',
      'ap.avg_response_time_hours',
      'ap.is_verified',
      'ap.profile_completion_pct',
      'ap.location_lat',
      'ap.location_lng',
      'ap.created_at',
      'ap.updated_at',
    );

  if (updatedProfiles.length === 0) return;

  // Fetch media counts and first thumbnail for each artist
  const artistIds = updatedProfiles.map((p: { id: string }) => p.id);
  const mediaCounts = await db('media_items')
    .whereIn('artist_id', artistIds)
    .where({ deleted_at: null })
    .groupBy('artist_id')
    .select('artist_id')
    .count('id as count');

  const thumbnails = await db('media_items')
    .whereIn('artist_id', artistIds)
    .where({ deleted_at: null, media_type: 'image' })
    .orderBy('sort_order', 'asc')
    .select('artist_id', 'thumbnail_url', 'original_url')
    .groupBy('artist_id', 'thumbnail_url', 'original_url', 'sort_order');

  const mediaCountMap = new Map(mediaCounts.map((m: any) => [m.artist_id, Number(m.count)]));
  const thumbnailMap = new Map(thumbnails.map((t: { artist_id: string; thumbnail_url: string; original_url: string }) => [t.artist_id, t.thumbnail_url ?? t.original_url]));

  // Bulk index
  const bulkBody = updatedProfiles.flatMap((profile: Record<string, unknown>) => {
    const pricing = typeof profile.pricing === 'string' ? JSON.parse(profile.pricing as string) : profile.pricing;

    const doc = {
      id: profile.id,
      user_id: profile.user_id,
      stage_name: profile.stage_name,
      bio: profile.bio,
      genres: profile.genres,
      languages: profile.languages,
      base_city: profile.base_city,
      travel_radius_km: profile.travel_radius_km,
      event_types: profile.event_types,
      performance_duration_min: profile.performance_duration_min,
      performance_duration_max: profile.performance_duration_max,
      pricing: Array.isArray(pricing) ? pricing : [],
      trust_score: profile.trust_score ?? 0,
      total_bookings: profile.total_bookings ?? 0,
      acceptance_rate: profile.acceptance_rate ?? 0,
      avg_response_time_hours: profile.avg_response_time_hours ?? null,
      is_verified: profile.is_verified ?? false,
      profile_completion_pct: profile.profile_completion_pct ?? 0,
      location: profile.location_lat && profile.location_lng
        ? { lat: profile.location_lat, lon: profile.location_lng }
        : null,
      media_count: mediaCountMap.get(profile.id as string) ?? 0,
      thumbnail_url: thumbnailMap.get(profile.id as string) ?? null,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };

    return [
      { index: { _index: ARTIST_INDEX, _id: profile.id } },
      doc,
    ];
  });

  const bulkResult = await opensearch.bulk({ body: bulkBody });

  if (bulkResult.body.errors) {
    const errors = bulkResult.body.items.filter((i: { index?: { error?: unknown } }) => i.index?.error);
    console.error(`Sync errors: ${errors.length}`, errors.slice(0, 3));
  }

  lastSyncAt = new Date();
  console.info(`Synced ${updatedProfiles.length} artist(s) to OpenSearch`);
}

async function startSyncLoop() {
  console.info('Starting PG → OpenSearch sync worker...');
  await ensureIndex();

  // Initial full sync
  lastSyncAt = new Date(0);
  await syncArtists();

  // Poll every 5 seconds
  setInterval(async () => {
    try {
      await syncArtists();
    } catch (err) {
      console.error('Sync error:', err);
    }
  }, 5000);
}

startSyncLoop().catch((err) => {
  console.error('Failed to start sync worker:', err);
  process.exit(1);
});
