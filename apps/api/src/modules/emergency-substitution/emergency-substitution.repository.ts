import { db } from '../../infrastructure/database.js';

// ─── Types ────────────────────────────────────────────────────

export interface CreateRequestData {
  original_booking_id: string;
  requested_by: string;
  cancelled_artist_id: string;
  event_date: string;
  event_city: string;
  event_type: string;
  genres: string[];
  urgency_level: string;
  status: string;
  expires_at: Date;
  budget_paise: number;
}

export interface CreateCandidateData {
  request_id: string;
  artist_id: string;
  similarity_score: number;
  score_breakdown: Record<string, number>;
  response: string;
}

export interface AvailableArtist {
  id: string;
  stage_name: string;
  genres: string[];
  base_city: string;
  pricing: unknown;
  trust_score: number;
  event_types: string[];
  is_reliable_backup: boolean;
  backup_premium_pct: number;
  location_lat: number | null;
  location_lng: number | null;
}

// ─── Repository ───────────────────────────────────────────────

export class EmergencySubstitutionRepository {
  // ─── Substitution Requests ──────────────────────────────────

  async createRequest(data: CreateRequestData) {
    const [row] = await db('substitution_requests').insert(data).returning('*');
    return row;
  }

  async getRequest(id: string) {
    return db('substitution_requests').where({ id }).first();
  }

  async getRequestsByUser(userId: string) {
    return db('substitution_requests')
      .where({ requested_by: userId })
      .orderBy('created_at', 'desc');
  }

  async getRequestsByArtist(artistId: string) {
    return db('substitution_requests')
      .where('accepted_artist_id', artistId)
      .orWhereIn('id', function () {
        this.select('request_id')
          .from('substitution_candidates')
          .where('artist_id', artistId);
      })
      .orderBy('created_at', 'desc');
  }

  async updateRequest(id: string, data: Record<string, unknown>) {
    const [row] = await db('substitution_requests')
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning('*');
    return row;
  }

  async getExpiredRequests() {
    return db('substitution_requests')
      .whereIn('status', ['pending', 'matching', 'notified'])
      .where('expires_at', '<', db.fn.now());
  }

  // ─── Substitution Candidates ────────────────────────────────

  async createCandidates(requestId: string, candidates: Omit<CreateCandidateData, 'request_id'>[]) {
    const rows = candidates.map((c) => ({
      request_id: requestId,
      artist_id: c.artist_id,
      similarity_score: c.similarity_score,
      score_breakdown: JSON.stringify(c.score_breakdown),
      response: c.response,
    }));
    return db('substitution_candidates').insert(rows).returning('*');
  }

  async getCandidates(requestId: string) {
    return db('substitution_candidates as sc')
      .join('artist_profiles as ap', 'ap.id', 'sc.artist_id')
      .where('sc.request_id', requestId)
      .select(
        'sc.*',
        'ap.stage_name',
        'ap.genres',
        'ap.trust_score',
      )
      .orderBy('sc.similarity_score', 'desc');
  }

  async getCandidate(candidateId: string) {
    return db('substitution_candidates').where({ id: candidateId }).first();
  }

  async updateCandidate(candidateId: string, data: Record<string, unknown>) {
    const [row] = await db('substitution_candidates')
      .where({ id: candidateId })
      .update(data)
      .returning('*');
    return row;
  }

  async getUnrespondedCandidates(requestId: string) {
    return db('substitution_candidates')
      .where({ request_id: requestId, response: 'pending' });
  }

  async expireUnrespondedForRequest(requestId: string) {
    return db('substitution_candidates')
      .where({ request_id: requestId, response: 'pending' })
      .update({ response: 'expired' });
  }

  // ─── Artist Availability ────────────────────────────────────

  async getAvailableArtists(
    eventDate: string,
    _eventCity: string,
    genres: string[],
    excludeArtistIds: string[],
  ): Promise<AvailableArtist[]> {
    const query = db('artist_profiles as ap')
      .leftJoin('availability_calendar as ac', function () {
        this.on('ac.artist_id', 'ap.id')
          .andOn('ac.date', db.raw('?', [eventDate]));
      })
      .whereNull('ap.deleted_at')
      .where(function () {
        this.whereNull('ac.status').orWhere('ac.status', 'available');
      })
      .whereRaw('ap.genres && ?::text[]', [`{${genres.join(',')}}`])
      .select(
        'ap.id',
        'ap.stage_name',
        'ap.genres',
        'ap.base_city',
        'ap.pricing',
        'ap.trust_score',
        'ap.event_types',
        'ap.is_reliable_backup',
        'ap.backup_premium_pct',
        'ap.location_lat',
        'ap.location_lng',
      );

    if (excludeArtistIds.length > 0) {
      query.whereNotIn('ap.id', excludeArtistIds);
    }

    return query;
  }

  // ─── Backup Preferences ─────────────────────────────────────

  async updateBackupPreferences(artistId: string, isReliable: boolean, premiumPct: number) {
    const [row] = await db('artist_profiles')
      .where({ id: artistId })
      .update({
        is_reliable_backup: isReliable,
        backup_premium_pct: premiumPct,
        updated_at: db.fn.now(),
      })
      .returning(['id', 'is_reliable_backup', 'backup_premium_pct']);
    return row;
  }

  async getBackupPreferences(artistId: string) {
    return db('artist_profiles')
      .where({ id: artistId })
      .select('is_reliable_backup', 'backup_premium_pct')
      .first();
  }
}

export const emergencySubstitutionRepository = new EmergencySubstitutionRepository();
