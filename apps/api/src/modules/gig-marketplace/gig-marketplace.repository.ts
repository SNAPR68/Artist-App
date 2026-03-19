import { db } from '../../infrastructure/database.js';

// ─── Interfaces ────────────────────────────────────────────────

export interface CreateGigPostData {
  posted_by: string;
  workspace_id?: string;
  title: string;
  description: string;
  event_type: string;
  event_date: string;
  event_city: string;
  genres_needed: string[];
  budget_min_paise: number;
  budget_max_paise: number;
  guest_count?: number;
  duration_hours?: number;
  requirements?: string;
  expires_at?: string;
}

export interface UpdateGigPostData {
  title?: string;
  description?: string;
  event_type?: string;
  event_date?: string;
  event_city?: string;
  genres_needed?: string[];
  budget_min_paise?: number;
  budget_max_paise?: number;
  guest_count?: number;
  duration_hours?: number;
  requirements?: string;
  status?: string;
  booking_id?: string;
  expires_at?: string;
}

export interface GigPostFilters {
  city?: string;
  event_type?: string;
  genre?: string;
  status?: string;
  budget_min?: number;
  budget_max?: number;
  page?: number;
  per_page?: number;
}

export interface CreateGigApplicationData {
  cover_note?: string;
  proposed_amount_paise?: number;
}

// ─── Repository ────────────────────────────────────────────────

export class GigMarketplaceRepository {

  // ─── Gig Posts ─────────────────────────────────────────────

  async createPost(data: CreateGigPostData) {
    const [post] = await db('gig_posts')
      .insert({
        posted_by: data.posted_by,
        workspace_id: data.workspace_id ?? null,
        title: data.title,
        description: data.description,
        event_type: data.event_type,
        event_date: data.event_date,
        event_city: data.event_city,
        genres_needed: JSON.stringify(data.genres_needed),
        budget_min_paise: data.budget_min_paise,
        budget_max_paise: data.budget_max_paise,
        guest_count: data.guest_count ?? null,
        duration_hours: data.duration_hours ?? null,
        requirements: data.requirements ?? null,
        expires_at: data.expires_at ?? null,
        status: 'open',
        application_count: 0,
      })
      .returning('*');
    return post;
  }

  async getPost(id: string) {
    return db('gig_posts as gp')
      .leftJoin('users as u', 'u.id', 'gp.posted_by')
      .where({ 'gp.id': id })
      .select(
        'gp.*',
        'u.full_name as poster_name',
        'u.phone as poster_phone',
      )
      .first();
  }

  async getPosts(filters: GigPostFilters) {
    const page = filters.page ?? 1;
    const perPage = filters.per_page ?? 20;

    let query = db('gig_posts as gp')
      .leftJoin('users as u', 'u.id', 'gp.posted_by');

    if (filters.status) {
      query = query.where('gp.status', filters.status);
    } else {
      query = query.where('gp.status', 'open');
    }

    if (filters.city) {
      query = query.whereRaw('LOWER(gp.event_city) = LOWER(?)', [filters.city]);
    }

    if (filters.event_type) {
      query = query.where('gp.event_type', filters.event_type);
    }

    if (filters.genre) {
      // Check if ANY of genres_needed matches the filter genre using jsonb ? operator
      query = query.whereRaw('gp.genres_needed \\? ?', [filters.genre]);
    }

    if (filters.budget_min !== undefined) {
      query = query.where('gp.budget_max_paise', '>=', filters.budget_min);
    }

    if (filters.budget_max !== undefined) {
      query = query.where('gp.budget_min_paise', '<=', filters.budget_max);
    }

    const total = await query.clone().count('gp.id as count').first();

    const posts = await query.clone()
      .select(
        'gp.*',
        'u.full_name as poster_name',
      )
      .orderBy('gp.created_at', 'desc')
      .limit(perPage)
      .offset((page - 1) * perPage);

    return {
      posts,
      pagination: {
        total: Number(total?.count ?? 0),
        page,
        per_page: perPage,
        total_pages: Math.ceil(Number(total?.count ?? 0) / perPage),
      },
    };
  }

  async getPostsByUser(userId: string) {
    return db('gig_posts')
      .where({ posted_by: userId })
      .orderBy('created_at', 'desc');
  }

  async updatePost(id: string, data: UpdateGigPostData) {
    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.event_type !== undefined) updateData.event_type = data.event_type;
    if (data.event_date !== undefined) updateData.event_date = data.event_date;
    if (data.event_city !== undefined) updateData.event_city = data.event_city;
    if (data.genres_needed !== undefined) updateData.genres_needed = JSON.stringify(data.genres_needed);
    if (data.budget_min_paise !== undefined) updateData.budget_min_paise = data.budget_min_paise;
    if (data.budget_max_paise !== undefined) updateData.budget_max_paise = data.budget_max_paise;
    if (data.guest_count !== undefined) updateData.guest_count = data.guest_count;
    if (data.duration_hours !== undefined) updateData.duration_hours = data.duration_hours;
    if (data.requirements !== undefined) updateData.requirements = data.requirements;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.booking_id !== undefined) updateData.booking_id = data.booking_id;
    if (data.expires_at !== undefined) updateData.expires_at = data.expires_at;

    const [updated] = await db('gig_posts')
      .where({ id })
      .update(updateData)
      .returning('*');
    return updated;
  }

  async deletePost(id: string) {
    const [updated] = await db('gig_posts')
      .where({ id })
      .update({ status: 'cancelled', updated_at: new Date() })
      .returning('*');
    return updated;
  }

  // ─── Gig Applications ─────────────────────────────────────

  async createApplication(gigPostId: string, artistId: string, data: CreateGigApplicationData) {
    const [application] = await db('gig_applications')
      .insert({
        gig_post_id: gigPostId,
        artist_id: artistId,
        cover_note: data.cover_note ?? null,
        proposed_amount_paise: data.proposed_amount_paise ?? null,
        status: 'pending',
      })
      .returning('*');

    // Increment application_count on the post
    await db('gig_posts')
      .where({ id: gigPostId })
      .increment('application_count', 1);

    return application;
  }

  async getApplications(gigPostId: string) {
    return db('gig_applications as ga')
      .join('artist_profiles as ap', 'ap.id', 'ga.artist_id')
      .where({ 'ga.gig_post_id': gigPostId })
      .select(
        'ga.*',
        'ap.stage_name',
        'ap.genres',
        'ap.trust_score',
        'ap.base_city',
        'ap.base_price_paise',
        'ap.profile_image_url',
      )
      .orderBy('ga.created_at', 'asc');
  }

  async getApplicationsByArtist(artistId: string) {
    return db('gig_applications as ga')
      .join('gig_posts as gp', 'gp.id', 'ga.gig_post_id')
      .leftJoin('users as u', 'u.id', 'gp.posted_by')
      .where({ 'ga.artist_id': artistId })
      .select(
        'ga.*',
        'gp.title as gig_title',
        'gp.event_type',
        'gp.event_date',
        'gp.event_city',
        'gp.budget_min_paise as gig_budget_min_paise',
        'gp.budget_max_paise as gig_budget_max_paise',
        'gp.status as gig_status',
        'u.full_name as poster_name',
      )
      .orderBy('ga.created_at', 'desc');
  }

  async getApplication(id: string) {
    return db('gig_applications')
      .where({ id })
      .first();
  }

  async updateApplicationStatus(id: string, status: string) {
    const [updated] = await db('gig_applications')
      .where({ id })
      .update({
        status,
        responded_at: new Date(),
      })
      .returning('*');
    return updated;
  }

  async getPostsForArtist(artistId: string, filters: GigPostFilters) {
    const page = filters.page ?? 1;
    const perPage = filters.per_page ?? 20;

    // Get artist's genres
    const artist = await db('artist_profiles')
      .where({ id: artistId })
      .select('genres')
      .first();

    if (!artist) return { posts: [], pagination: { total: 0, page, per_page: perPage, total_pages: 0 } };

    const artistGenres: string[] = Array.isArray(artist.genres) ? artist.genres : [];

    if (artistGenres.length === 0) {
      return { posts: [], pagination: { total: 0, page, per_page: perPage, total_pages: 0 } };
    }

    // Find open posts where genres_needed overlaps with artist's genres
    let query = db('gig_posts as gp')
      .leftJoin('users as u', 'u.id', 'gp.posted_by')
      .where('gp.status', 'open')
      .where('gp.event_date', '>=', db.raw('CURRENT_DATE'))
      .whereRaw(
        'gp.genres_needed \\?| ?',
        [artistGenres],
      );

    if (filters.city) {
      query = query.whereRaw('LOWER(gp.event_city) = LOWER(?)', [filters.city]);
    }

    const total = await query.clone().count('gp.id as count').first();

    // Compute relevance as genre overlap count
    const posts = await query.clone()
      .select(
        'gp.*',
        'u.full_name as poster_name',
        db.raw(`(
          SELECT COUNT(*)::int FROM jsonb_array_elements_text(gp.genres_needed) g
          WHERE g = ANY(?)
        ) as genre_match_count`, [artistGenres]),
        db.raw(`jsonb_array_length(gp.genres_needed) as total_genres_needed`),
      )
      .orderByRaw(`(
        SELECT COUNT(*)::int FROM jsonb_array_elements_text(gp.genres_needed) g
        WHERE g = ANY(?)
      ) DESC`, [artistGenres])
      .orderBy('gp.created_at', 'desc')
      .limit(perPage)
      .offset((page - 1) * perPage);

    return {
      posts,
      pagination: {
        total: Number(total?.count ?? 0),
        page,
        per_page: perPage,
        total_pages: Math.ceil(Number(total?.count ?? 0) / perPage),
      },
    };
  }

  async expireOldPosts() {
    const expired = await db('gig_posts')
      .where('status', 'open')
      .where(function () {
        this.where('expires_at', '<', new Date())
          .orWhere('event_date', '<', db.raw('CURRENT_DATE'));
      })
      .update({ status: 'expired', updated_at: new Date() });

    return expired;
  }
}

export const gigMarketplaceRepository = new GigMarketplaceRepository();
