import { db } from '../../infrastructure/database.js';

export class PriceIntelligenceService {
  async getFairPriceRange(params: { genre?: string; city?: string; event_type?: string }) {
    let query = db('price_intelligence').select('*');

    if (params.genre) query = query.where('primary_genre', params.genre);
    if (params.city) query = query.where('event_city', 'ilike', `%${params.city}%`);
    if (params.event_type) query = query.where('event_type', params.event_type);

    const results = await query.limit(20);

    return results.map((row: Record<string, unknown>) => ({
      event_type: row.event_type,
      city: row.event_city,
      genre: row.primary_genre,
      sample_size: Number(row.sample_size),
      is_sufficient: Number(row.sample_size) >= 5,
      fair_price_range: {
        p25_paise: Number(row.p25_paise),
        median_paise: Number(row.median_paise),
        p75_paise: Number(row.p75_paise),
      },
      avg_paise: Number(row.avg_paise),
      min_paise: Number(row.min_paise),
      max_paise: Number(row.max_paise),
    }));
  }

  async getCityComparison(genre: string, eventType: string) {
    return db('price_intelligence')
      .where({ primary_genre: genre, event_type: eventType })
      .select('event_city as city', 'median_paise', 'p25_paise', 'p75_paise', 'sample_size')
      .orderBy('median_paise', 'asc');
  }

  async refreshStats() {
    try {
      await db.raw('REFRESH MATERIALIZED VIEW CONCURRENTLY price_intelligence');
    } catch {
      // If CONCURRENTLY fails (no unique index populated yet), try without
      await db.raw('REFRESH MATERIALIZED VIEW price_intelligence');
    }
  }
}

export const priceIntelligenceService = new PriceIntelligenceService();
