import { db } from '../../infrastructure/database.js';

export interface CreateArtistProfileData {
  user_id: string;
  stage_name: string;
  bio?: string;
  genres: string[];
  languages: string[];
  base_city: string;
  travel_radius_km: number;
  event_types: string[];
  performance_duration_min: number;
  performance_duration_max: number;
  pricing: unknown[];
  location?: { lat: number; lng: number };
}

export interface UpdateArtistProfileData extends Partial<Omit<CreateArtistProfileData, 'user_id'>> {}

export class ArtistRepository {
  async create(data: CreateArtistProfileData) {
    const [profile] = await db('artist_profiles')
      .insert({
        user_id: data.user_id,
        stage_name: data.stage_name,
        bio: data.bio ?? null,
        genres: data.genres,
        languages: data.languages,
        base_city: data.base_city,
        travel_radius_km: data.travel_radius_km,
        event_types: data.event_types,
        performance_duration_min: data.performance_duration_min,
        performance_duration_max: data.performance_duration_max,
        pricing: JSON.stringify(data.pricing),
        location_lat: data.location?.lat ?? null,
        location_lng: data.location?.lng ?? null,
        profile_completion_pct: this.calculateCompletion(data),
      })
      .returning('*');
    return profile;
  }

  async findByUserId(userId: string) {
    return db('artist_profiles')
      .where({ user_id: userId, deleted_at: null })
      .first();
  }

  async findById(id: string) {
    return db('artist_profiles')
      .where({ id, deleted_at: null })
      .first();
  }

  async findPublicById(id: string) {
    return db('artist_profiles as ap')
      .join('users as u', 'u.id', 'ap.user_id')
      .where({ 'ap.id': id, 'ap.deleted_at': null, 'u.is_active': true })
      .select(
        'ap.id',
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
      )
      .first();
  }

  async update(userId: string, data: UpdateArtistProfileData) {
    const updateData: Record<string, unknown> = {};

    if (data.stage_name !== undefined) updateData.stage_name = data.stage_name;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.genres !== undefined) updateData.genres = data.genres;
    if (data.languages !== undefined) updateData.languages = data.languages;
    if (data.base_city !== undefined) updateData.base_city = data.base_city;
    if (data.travel_radius_km !== undefined) updateData.travel_radius_km = data.travel_radius_km;
    if (data.event_types !== undefined) updateData.event_types = data.event_types;
    if (data.performance_duration_min !== undefined) updateData.performance_duration_min = data.performance_duration_min;
    if (data.performance_duration_max !== undefined) updateData.performance_duration_max = data.performance_duration_max;
    if (data.pricing !== undefined) updateData.pricing = JSON.stringify(data.pricing);
    if (data.location !== undefined) {
      updateData.location_lat = data.location.lat;
      updateData.location_lng = data.location.lng;
    }

    // Recalculate completion if relevant fields changed
    const existing = await this.findByUserId(userId);
    if (existing) {
      const merged = { ...existing, ...updateData };
      updateData.profile_completion_pct = this.calculateCompletionFromProfile(merged);
    }

    const [updated] = await db('artist_profiles')
      .where({ user_id: userId, deleted_at: null })
      .update(updateData)
      .returning('*');

    return updated;
  }

  async list(params: { page: number; per_page: number; city?: string; genre?: string }) {
    let query = db('artist_profiles')
      .where({ deleted_at: null })
      .orderBy('trust_score', 'desc');

    if (params.city) {
      query = query.where('base_city', 'ilike', `%${params.city}%`);
    }
    if (params.genre) {
      query = query.whereRaw('? = ANY(genres)', [params.genre]);
    }

    const total = await query.clone().clearOrder().count('id as count').first();
    const profiles = await query
      .offset((params.page - 1) * params.per_page)
      .limit(params.per_page);

    return {
      data: profiles,
      total: Number(total?.count ?? 0),
    };
  }

  private calculateCompletion(data: CreateArtistProfileData): number {
    let score = 0;
    if (data.stage_name) score += 15;
    if (data.bio) score += 15;
    if (data.genres.length > 0) score += 15;
    if (data.base_city) score += 10;
    if (data.event_types.length > 0) score += 10;
    if (data.pricing.length > 0) score += 20;
    if (data.languages.length > 0) score += 5;
    if (data.location) score += 5;
    // Media (5%) added when media is uploaded
    return Math.min(score, 100);
  }

  private calculateCompletionFromProfile(profile: Record<string, unknown>): number {
    let score = 0;
    if (profile.stage_name) score += 15;
    if (profile.bio) score += 15;
    const genres = profile.genres as string[] | undefined;
    if (genres && genres.length > 0) score += 15;
    if (profile.base_city) score += 10;
    const eventTypes = profile.event_types as string[] | undefined;
    if (eventTypes && eventTypes.length > 0) score += 10;
    if (profile.pricing) score += 20;
    const languages = profile.languages as string[] | undefined;
    if (languages && languages.length > 0) score += 5;
    if (profile.location_lat) score += 5;
    return Math.min(score, 100);
  }
}

export const artistRepository = new ArtistRepository();
