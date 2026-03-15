import { artistRepository } from './artist.repository.js';
import type { CreateArtistProfileData, UpdateArtistProfileData } from './artist.repository.js';
import { db } from '../../infrastructure/database.js';

/** Postgres text[]/enum[] columns sometimes return as "{a,b}" strings instead of arrays */
function normalizeArrayFields<T extends Record<string, unknown>>(profile: T): T {
  for (const key of ['genres', 'languages', 'event_types'] as const) {
    const val = (profile as Record<string, unknown>)[key];
    if (typeof val === 'string' && val.startsWith('{') && val.endsWith('}')) {
      (profile as Record<string, unknown>)[key] = val.slice(1, -1).split(',').filter(Boolean);
    }
  }
  return profile;
}

export class ArtistService {
  async createProfile(userId: string, data: Omit<CreateArtistProfileData, 'user_id'>) {
    // Check if profile already exists
    const existing = await artistRepository.findByUserId(userId);
    if (existing) {
      throw new ArtistError('PROFILE_EXISTS', 'Artist profile already exists', 409);
    }

    return artistRepository.create({ ...data, user_id: userId });
  }

  async getOwnProfile(userId: string) {
    const profile = await artistRepository.findByUserId(userId);
    if (!profile) {
      throw new ArtistError('PROFILE_NOT_FOUND', 'Artist profile not found', 404);
    }

    // Include media items
    const media = await db('media_items')
      .where({ artist_id: profile.id, deleted_at: null })
      .orderBy('sort_order', 'asc');

    return { ...normalizeArrayFields(profile), media };
  }

  async getPublicProfile(artistId: string) {
    const profile = await artistRepository.findPublicById(artistId);
    if (!profile) {
      throw new ArtistError('PROFILE_NOT_FOUND', 'Artist not found', 404);
    }

    // Include published media
    const media = await db('media_items')
      .where({ artist_id: artistId, deleted_at: null, transcode_status: 'completed' })
      .orderBy('sort_order', 'asc');

    // Include published reviews
    const reviews = await db('reviews')
      .join('users', 'users.id', 'reviews.reviewer_id')
      .where({ reviewee_id: profile.id, is_published: true, 'reviews.deleted_at': null })
      .select('reviews.overall_rating', 'reviews.dimensions', 'reviews.comment', 'reviews.created_at')
      .orderBy('reviews.created_at', 'desc')
      .limit(10);

    return { ...normalizeArrayFields(profile), media, reviews };
  }

  async updateProfile(userId: string, data: UpdateArtistProfileData) {
    const existing = await artistRepository.findByUserId(userId);
    if (!existing) {
      throw new ArtistError('PROFILE_NOT_FOUND', 'Artist profile not found', 404);
    }

    // Validate pricing: max_price >= min_price
    if (data.pricing) {
      for (const p of data.pricing) {
        const pricing = p as { min_price: number; max_price: number };
        if (pricing.max_price < pricing.min_price) {
          throw new ArtistError('INVALID_PRICING', 'max_price must be >= min_price', 400);
        }
      }
    }

    // Validate duration
    if (data.performance_duration_min !== undefined && data.performance_duration_max !== undefined) {
      if (data.performance_duration_max < data.performance_duration_min) {
        throw new ArtistError('INVALID_DURATION', 'max duration must be >= min duration', 400);
      }
    }

    return artistRepository.update(userId, data);
  }

  async listArtists(params: { page: number; per_page: number; city?: string; genre?: string }) {
    const result = await artistRepository.list(params);
    return {
      ...result,
      data: result.data.map((p: Record<string, unknown>) => normalizeArrayFields(p)),
    };
  }
}

export class ArtistError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'ArtistError';
  }
}

export const artistService = new ArtistService();
