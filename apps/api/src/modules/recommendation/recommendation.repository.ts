import { db } from '../../infrastructure/database.js';

export interface UpsertScoreData {
  source_type: string;
  source_id: string;
  target_artist_id: string;
  recommendation_type: string;
  score: number;
  context?: Record<string, unknown>;
  expires_at: Date;
  rising_star?: boolean;
}

export interface UpsertCollaborativeSignalData {
  artist_a_id: string;
  artist_b_id: string;
  signal_type: string;
  strength: number;
  occurrence_count: number;
  last_occurred_at: Date;
  computed_at: Date;
}

export interface RecordFeedbackData {
  recommendation_score_id: string;
  user_id: string;
  feedback_type: string;
  metadata?: Record<string, unknown>;
}

export interface RecommendationFilters {
  source_type?: string;
  source_id?: string;
  target_artist_id?: string;
  recommendation_type?: string;
  limit?: number;
}

export class RecommendationRepository {
  /**
   * Upsert a recommendation score.
   * No unique constraint exists, so delete existing match first then insert.
   */
  async upsertScore(data: UpsertScoreData) {
    await db('recommendation_scores')
      .where({
        source_type: data.source_type,
        source_id: data.source_id,
        target_artist_id: data.target_artist_id,
        recommendation_type: data.recommendation_type,
      })
      .del();

    const [row] = await db('recommendation_scores')
      .insert({
        source_type: data.source_type,
        source_id: data.source_id,
        target_artist_id: data.target_artist_id,
        recommendation_type: data.recommendation_type,
        score: data.score,
        context: data.context ? JSON.stringify(data.context) : '{}',
        expires_at: data.expires_at,
        rising_star: data.rising_star ?? false,
      })
      .returning('*');

    return row;
  }

  /**
   * Get recommendations with filters, excluding expired.
   */
  async getRecommendations(filters: RecommendationFilters) {
    let query = db('recommendation_scores')
      .where('expires_at', '>', new Date())
      .orderBy('score', 'desc')
      .limit(filters.limit ?? 10);

    if (filters.source_type) {
      query = query.where('source_type', filters.source_type);
    }
    if (filters.source_id) {
      query = query.where('source_id', filters.source_id);
    }
    if (filters.target_artist_id) {
      query = query.where('target_artist_id', filters.target_artist_id);
    }
    if (filters.recommendation_type) {
      query = query.where('recommendation_type', filters.recommendation_type);
    }

    return query;
  }

  /**
   * Get recommendations for a client context (event type, city, budget).
   */
  async getRecommendationsForClient(
    recommendationType: string,
    context: { event_type?: string; city?: string; budget_min?: number; budget_max?: number },
    limit: number = 10,
  ) {
    let query = db('recommendation_scores')
      .where('recommendation_type', recommendationType)
      .where('expires_at', '>', new Date())
      .orderBy('score', 'desc')
      .limit(limit);

    if (recommendationType === 'popular_for_event') {
      if (context.city) {
        query = query.whereRaw("context->>'city' = ?", [context.city]);
      }
      if (context.event_type) {
        query = query.whereRaw("context->>'event_type' = ?", [context.event_type]);
      }
    }

    return query;
  }

  /**
   * Get recommendations for an artist (source_type='artist', source_id=artistId).
   */
  async getRecommendationsForArtist(
    artistId: string,
    recommendationType: string,
    limit: number = 10,
  ) {
    return db('recommendation_scores')
      .where({
        source_type: 'artist',
        source_id: artistId,
        recommendation_type: recommendationType,
      })
      .where('expires_at', '>', new Date())
      .orderBy('score', 'desc')
      .limit(limit);
  }

  /**
   * Upsert a collaborative signal between two artists.
   */
  async upsertCollaborativeSignal(data: UpsertCollaborativeSignalData) {
    const [row] = await db('collaborative_signals')
      .insert({
        artist_a_id: data.artist_a_id,
        artist_b_id: data.artist_b_id,
        signal_type: data.signal_type,
        strength: data.strength,
        occurrence_count: data.occurrence_count,
        last_occurred_at: data.last_occurred_at,
        computed_at: data.computed_at,
      })
      .onConflict(['artist_a_id', 'artist_b_id', 'signal_type'])
      .merge({
        strength: data.strength,
        occurrence_count: data.occurrence_count,
        last_occurred_at: data.last_occurred_at,
        computed_at: data.computed_at,
      })
      .returning('*');

    return row;
  }

  /**
   * Get artists commonly paired with the given artist.
   * Returns the OTHER artist id from each signal.
   */
  async getCollaborativeArtists(artistId: string, limit: number = 10) {
    const rows = await db('collaborative_signals')
      .where('artist_a_id', artistId)
      .orWhere('artist_b_id', artistId)
      .orderBy('strength', 'desc')
      .limit(limit);

    return rows.map((row: Record<string, unknown>) => ({
      ...row,
      paired_artist_id: row.artist_a_id === artistId ? row.artist_b_id : row.artist_a_id,
    }));
  }

  /**
   * Record user feedback on a recommendation.
   */
  async recordFeedback(data: RecordFeedbackData) {
    const [row] = await db('recommendation_feedback')
      .insert({
        recommendation_score_id: data.recommendation_score_id,
        user_id: data.user_id,
        feedback_type: data.feedback_type,
        metadata: data.metadata ? JSON.stringify(data.metadata) : '{}',
      })
      .returning('*');

    return row;
  }

  /**
   * Clean expired recommendation scores. Returns count of deleted rows.
   */
  async cleanExpired(): Promise<number> {
    const count = await db('recommendation_scores')
      .where('expires_at', '<', new Date())
      .del();

    return count;
  }

  /**
   * Get a recommendation score by its ID.
   */
  async getScoreById(id: string) {
    return db('recommendation_scores')
      .where({ id })
      .first();
  }
}

export const recommendationRepository = new RecommendationRepository();
