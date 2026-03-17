import { db } from '../../infrastructure/database.js';

export class PricingBrainRepository {
  // ─── Market Positions ─────────────────────────────────────
  async upsertMarketPosition(data: {
    artist_id: string;
    genre: string;
    city: string;
    event_type: string;
    pricing_tier: string;
    percentile_rank: number;
    market_median_paise: number;
    artist_avg_paise: number;
    price_vs_market_pct: number;
    sample_size: number;
    market_sample_size: number;
  }) {
    const existing = await db('artist_market_positions')
      .where({
        artist_id: data.artist_id,
        genre: data.genre,
        city: data.city,
        event_type: data.event_type,
      })
      .first();

    if (existing) {
      const [row] = await db('artist_market_positions')
        .where({ id: existing.id })
        .update({ ...data, last_computed_at: new Date(), updated_at: new Date() })
        .returning('*');
      return row;
    }

    const [row] = await db('artist_market_positions').insert(data).returning('*');
    return row;
  }

  async getPositions(artistId: string, filters?: { event_type?: string; city?: string; genre?: string }) {
    let query = db('artist_market_positions').where({ artist_id: artistId });
    if (filters?.event_type) query = query.where('event_type', filters.event_type);
    if (filters?.city) query = query.where('city', 'ilike', `%${filters.city}%`);
    if (filters?.genre) query = query.where('genre', filters.genre);
    return query.orderBy('percentile_rank', 'desc');
  }

  // ─── Recommendations ──────────────────────────────────────
  async createRecommendation(data: Record<string, unknown>) {
    const [row] = await db('pricing_recommendations').insert(data).returning('*');
    return row;
  }

  async getActiveRecommendations(artistId: string) {
    return db('pricing_recommendations')
      .where({ artist_id: artistId, is_dismissed: false })
      .where('expires_at', '>', new Date())
      .orderBy('confidence', 'desc');
  }

  async dismissRecommendation(id: string, artistId: string) {
    const [row] = await db('pricing_recommendations')
      .where({ id, artist_id: artistId })
      .update({ is_dismissed: true })
      .returning('*');
    return row;
  }

  async cleanExpiredRecommendations() {
    return db('pricing_recommendations')
      .where('expires_at', '<', new Date())
      .del();
  }
}

export const pricingBrainRepository = new PricingBrainRepository();
