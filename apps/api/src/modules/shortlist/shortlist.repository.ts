import { db } from '../../infrastructure/database.js';

export class ShortlistRepository {
  async create(userId: string, name: string) {
    const [shortlist] = await db('shortlists')
      .insert({
        user_id: userId,
        name,
      })
      .returning('*');
    return shortlist;
  }

  async findByUser(userId: string) {
    return db('shortlists')
      .where({ user_id: userId, deleted_at: null })
      .orderBy('created_at', 'desc');
  }

  async findById(id: string) {
    return db('shortlists')
      .where({ id, deleted_at: null })
      .first();
  }

  async addArtist(shortlistId: string, artistId: string, notes?: string) {
    const existing = await db('shortlist_artists')
      .where({ shortlist_id: shortlistId, artist_id: artistId })
      .first();

    if (existing) return existing;

    const [entry] = await db('shortlist_artists')
      .insert({
        shortlist_id: shortlistId,
        artist_id: artistId,
        notes: notes ?? null,
      })
      .returning('*');
    return entry;
  }

  async removeArtist(shortlistId: string, artistId: string) {
    return db('shortlist_artists')
      .where({ shortlist_id: shortlistId, artist_id: artistId })
      .delete();
  }

  async getArtists(shortlistId: string) {
    return db('shortlist_artists as sa')
      .join('artist_profiles as ap', 'ap.id', 'sa.artist_id')
      .where({ 'sa.shortlist_id': shortlistId, 'ap.deleted_at': null })
      .select(
        'ap.id',
        'ap.stage_name',
        'ap.bio',
        'ap.genres',
        'ap.base_city',
        'ap.trust_score',
        'ap.total_bookings',
        'ap.pricing',
        'ap.is_verified',
        'ap.profile_completion_pct',
        'sa.notes',
        'sa.created_at as added_at',
      )
      .orderBy('sa.created_at', 'desc');
  }

  async deleteShortlist(id: string) {
    const [deleted] = await db('shortlists')
      .where({ id })
      .update({ deleted_at: new Date() })
      .returning('*');
    return deleted;
  }
}

export const shortlistRepository = new ShortlistRepository();
