import { Client } from '@opensearch-project/opensearch';
import { config } from '../../config/index.js';

export const opensearch = new Client({
  node: config.OPENSEARCH_URL,
});

export const ARTIST_INDEX = 'artists_v1';

export const ARTIST_INDEX_MAPPING = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    analysis: {
      analyzer: {
        artist_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'asciifolding'],
        },
      },
    },
  },
  mappings: {
    properties: {
      // Identity
      id: { type: 'keyword' },
      user_id: { type: 'keyword' },
      stage_name: { type: 'text', analyzer: 'artist_analyzer', fields: { keyword: { type: 'keyword' } } },
      bio: { type: 'text', analyzer: 'artist_analyzer' },

      // Categories
      genres: { type: 'keyword' },
      languages: { type: 'keyword' },
      event_types: { type: 'keyword' },

      // Location
      base_city: { type: 'text', fields: { keyword: { type: 'keyword' } } },
      location: { type: 'geo_point' },
      travel_radius_km: { type: 'integer' },

      // Performance
      performance_duration_min: { type: 'integer' },
      performance_duration_max: { type: 'integer' },

      // Pricing (nested for accurate filtering)
      pricing: {
        type: 'nested',
        properties: {
          event_type: { type: 'keyword' },
          city_tier: { type: 'keyword' },
          min_price: { type: 'long' },
          max_price: { type: 'long' },
        },
      },

      // Trust & metrics
      trust_score: { type: 'float' },
      total_bookings: { type: 'integer' },
      acceptance_rate: { type: 'float' },
      avg_response_time_hours: { type: 'float' },
      is_verified: { type: 'boolean' },
      profile_completion_pct: { type: 'integer' },

      // Media summary
      media_count: { type: 'integer' },
      thumbnail_url: { type: 'keyword', index: false },

      // Timestamps
      created_at: { type: 'date' },
      updated_at: { type: 'date' },
    },
  },
};

export async function ensureIndex() {
  const exists = await opensearch.indices.exists({ index: ARTIST_INDEX });
  if (!exists.body) {
    await opensearch.indices.create({
      index: ARTIST_INDEX,
      body: ARTIST_INDEX_MAPPING,
    });
  }
}
