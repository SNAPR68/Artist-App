import { db } from '../../infrastructure/database.js';

export class ArtistIntelligenceRepository {
  // ─── Earnings Snapshots ─────────────────────────────────────

  async upsertEarningsSnapshot(data: {
    artist_id: string;
    period_type: string;
    period_start: string;
    period_end: string;
    total_bookings: number;
    completed_bookings: number;
    total_revenue_paise: number;
    avg_booking_paise: number;
    revenue_by_event_type: Record<string, unknown>;
    revenue_by_city: Record<string, unknown>;
    market_avg_paise: number | null;
  }) {
    const [row] = await db('artist_earnings_snapshots')
      .insert({
        ...data,
        revenue_by_event_type: JSON.stringify(data.revenue_by_event_type),
        revenue_by_city: JSON.stringify(data.revenue_by_city),
      })
      .onConflict(['artist_id', 'period_type', 'period_start'])
      .merge({
        period_end: data.period_end,
        total_bookings: data.total_bookings,
        completed_bookings: data.completed_bookings,
        total_revenue_paise: data.total_revenue_paise,
        avg_booking_paise: data.avg_booking_paise,
        revenue_by_event_type: JSON.stringify(data.revenue_by_event_type),
        revenue_by_city: JSON.stringify(data.revenue_by_city),
        market_avg_paise: data.market_avg_paise,
        updated_at: new Date(),
      })
      .returning('*');
    return row;
  }

  async getEarningsSnapshots(
    artistId: string,
    periodType: string,
    startDate?: string,
    endDate?: string,
  ) {
    let query = db('artist_earnings_snapshots')
      .where({ artist_id: artistId, period_type: periodType });

    if (startDate) query = query.where('period_start', '>=', startDate);
    if (endDate) query = query.where('period_start', '<=', endDate);

    return query.orderBy('period_start', 'desc');
  }

  // ─── Career Metrics ─────────────────────────────────────────

  async upsertCareerMetrics(artistId: string, data: {
    trust_score_history: Record<string, unknown>[];
    price_progression: Record<string, unknown>[];
    booking_velocity: Record<string, unknown>;
    top_cities: Record<string, unknown>[];
    top_event_types: Record<string, unknown>[];
    rebook_rate: number;
    avg_crowd_energy: string | null;
    demand_alignment: number | null;
    gig_advisor: Record<string, unknown>[];
  }) {
    const now = new Date();
    const [row] = await db('artist_career_metrics')
      .insert({
        artist_id: artistId,
        trust_score_history: JSON.stringify(data.trust_score_history),
        price_progression: JSON.stringify(data.price_progression),
        booking_velocity: JSON.stringify(data.booking_velocity),
        top_cities: JSON.stringify(data.top_cities),
        top_event_types: JSON.stringify(data.top_event_types),
        rebook_rate: data.rebook_rate,
        avg_crowd_energy: data.avg_crowd_energy,
        demand_alignment: data.demand_alignment,
        gig_advisor: JSON.stringify(data.gig_advisor),
        computed_at: now,
        updated_at: now,
      })
      .onConflict('artist_id')
      .merge({
        trust_score_history: JSON.stringify(data.trust_score_history),
        price_progression: JSON.stringify(data.price_progression),
        booking_velocity: JSON.stringify(data.booking_velocity),
        top_cities: JSON.stringify(data.top_cities),
        top_event_types: JSON.stringify(data.top_event_types),
        rebook_rate: data.rebook_rate,
        avg_crowd_energy: data.avg_crowd_energy,
        demand_alignment: data.demand_alignment,
        gig_advisor: JSON.stringify(data.gig_advisor),
        computed_at: now,
        updated_at: now,
      })
      .returning('*');
    return row;
  }

  async getCareerMetrics(artistId: string) {
    return db('artist_career_metrics')
      .where({ artist_id: artistId })
      .first();
  }

  // ─── Active Artists ─────────────────────────────────────────

  async getActiveArtistIds(): Promise<{ id: string }[]> {
    return db('artist_profiles')
      .select('id')
      .whereNull('deleted_at')
      .where('is_verified', true)
      .orderBy('trust_score', 'desc');
  }
}

export const artistIntelligenceRepository = new ArtistIntelligenceRepository();
