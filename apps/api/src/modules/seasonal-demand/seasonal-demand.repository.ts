import { db } from '../../infrastructure/database.js';

// ─── Interfaces ──────────────────────────────────────────────

export interface DemandSignalGroup {
  city: string;
  genre: string | null;
  event_type: string | null;
  month: number;
  avg_fill_rate: number;
  avg_booking_count: number;
  avg_inquiry_count: number;
  sample_months: number;
}

export interface UpsertCurveData {
  city: string;
  genre: string | null;
  event_type: string | null;
  month: number;
  demand_level: string;
  avg_fill_rate: number;
  avg_booking_count: number;
  avg_inquiry_count: number;
  yoy_trend: number | null;
  computed_at: Date;
}

export interface CurveFilters {
  city?: string;
  genre?: string;
  event_type?: string;
}

export interface CreateAlertData {
  user_id: string;
  alert_type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  expires_at: string;
}

export interface AlertFilters {
  is_read?: boolean;
  limit?: number;
}

// ─── Repository ──────────────────────────────────────────────

export class SeasonalDemandRepository {
  // ─── Demand Signal Queries ───────────────────────────────

  /**
   * Query demand_signals grouped by city, genre, event_type and month.
   * Returns averaged metrics over the lookback window.
   */
  async getDemandSignalsByMonth(lookbackMonths: number): Promise<DemandSignalGroup[]> {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - lookbackMonths);

    const rows = await db('demand_signals')
      .select(
        'city',
        'genre',
        'event_type',
        db.raw('EXTRACT(MONTH FROM signal_date)::int as month'),
      )
      .avg('fill_rate as avg_fill_rate')
      .avg('booking_count as avg_booking_count')
      .avg('inquiry_count as avg_inquiry_count')
      .count('* as sample_months')
      .where('signal_date', '>=', cutoff.toISOString().split('T')[0])
      .groupBy('city', 'genre', 'event_type', db.raw('EXTRACT(MONTH FROM signal_date)'))
      .orderBy('city')
      .orderBy(db.raw('EXTRACT(MONTH FROM signal_date)') as any);

    return rows.map((r: Record<string, unknown>) => ({
      city: r.city as string,
      genre: (r.genre as string) || null,
      event_type: (r.event_type as string) || null,
      month: Number(r.month),
      avg_fill_rate: Number(r.avg_fill_rate) || 0,
      avg_booking_count: Number(r.avg_booking_count) || 0,
      avg_inquiry_count: Number(r.avg_inquiry_count) || 0,
      sample_months: Number(r.sample_months) || 0,
    }));
  }

  /**
   * Compare this year's month average vs last year's for YoY trend.
   * Returns { this_year_avg, last_year_avg } or null if insufficient data.
   */
  async getYoyComparison(
    city: string,
    genre: string | null,
    eventType: string | null,
    month: number,
  ): Promise<{ this_year_avg: number; last_year_avg: number } | null> {
    const thisYear = new Date().getFullYear();
    const lastYear = thisYear - 1;

    const build = (year: number) => {
      let q = db('demand_signals')
        .avg('fill_rate as avg_fill_rate')
        .where('city', 'ilike', city)
        .whereRaw('EXTRACT(MONTH FROM signal_date) = ?', [month])
        .whereRaw('EXTRACT(YEAR FROM signal_date) = ?', [year]);
      if (genre) q = q.where('genre', genre);
      if (eventType) q = q.where('event_type', eventType);
      return q.first();
    };

    const [thisYearRow, lastYearRow] = await Promise.all([build(thisYear), build(lastYear)]);

    const thisAvg = Number(thisYearRow?.avg_fill_rate) || 0;
    const lastAvg = Number(lastYearRow?.avg_fill_rate) || 0;

    if (lastAvg === 0 && thisAvg === 0) return null;

    return { this_year_avg: thisAvg, last_year_avg: lastAvg };
  }

  // ─── Seasonal Curves CRUD ────────────────────────────────

  async upsertCurve(data: UpsertCurveData) {
    const [row] = await db('seasonal_demand_curves')
      .insert({
        city: data.city,
        genre: data.genre,
        event_type: data.event_type,
        month: data.month,
        demand_level: data.demand_level,
        avg_fill_rate: data.avg_fill_rate,
        avg_booking_count: data.avg_booking_count,
        avg_inquiry_count: data.avg_inquiry_count,
        yoy_trend: data.yoy_trend,
        computed_at: data.computed_at,
      })
      .onConflict(['city', 'genre', 'event_type', 'month'])
      .merge({
        demand_level: data.demand_level,
        avg_fill_rate: data.avg_fill_rate,
        avg_booking_count: data.avg_booking_count,
        avg_inquiry_count: data.avg_inquiry_count,
        yoy_trend: data.yoy_trend,
        computed_at: data.computed_at,
      })
      .returning('*');

    return row;
  }

  async getCurves(filters?: CurveFilters) {
    let query = db('seasonal_demand_curves').orderBy('month');

    if (filters?.city) query = query.where('city', 'ilike', filters.city);
    if (filters?.genre) query = query.where('genre', filters.genre);
    if (filters?.event_type) query = query.where('event_type', filters.event_type);

    return query;
  }

  async getCurvesByCity(city: string) {
    return db('seasonal_demand_curves')
      .where('city', 'ilike', city)
      .orderBy('month');
  }

  // ─── Seasonal Alerts CRUD ────────────────────────────────

  async createAlert(data: CreateAlertData) {
    const [row] = await db('seasonal_alerts')
      .insert({
        user_id: data.user_id,
        alert_type: data.alert_type,
        title: data.title,
        message: data.message,
        metadata: JSON.stringify(data.metadata),
        is_read: false,
        expires_at: data.expires_at,
      })
      .returning('*');

    return row;
  }

  async getAlertsForUser(userId: string, filters?: AlertFilters) {
    let query = db('seasonal_alerts')
      .where('user_id', userId)
      .orderBy('created_at', 'desc');

    if (filters?.is_read !== undefined) {
      query = query.where('is_read', filters.is_read);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    return query;
  }

  async markAlertRead(alertId: string) {
    const [row] = await db('seasonal_alerts')
      .where('id', alertId)
      .update({ is_read: true })
      .returning('*');

    return row;
  }

  async cleanExpiredAlerts(): Promise<number> {
    return db('seasonal_alerts')
      .where('expires_at', '<', new Date())
      .del();
  }

  // ─── Availability Urgency ────────────────────────────────

  /**
   * Count artist_profiles matching event_type and base_city.
   */
  async getMatchingArtistCount(
    eventType: string,
    city: string,
    genres?: string[],
  ): Promise<number> {
    let query = db('artist_profiles')
      .where('base_city', 'ilike', city)
      .whereRaw('event_types @> ?', [JSON.stringify([eventType])])
      .where('deleted_at', null);

    if (genres && genres.length > 0) {
      query = query.whereRaw('genres && ?', [JSON.stringify(genres)]);
    }

    const [{ count }] = await query.count('* as count');
    return Number(count);
  }

  /**
   * Same as getMatchingArtistCount but also require availability on the given date.
   */
  async getAvailableArtistCount(
    eventType: string,
    city: string,
    eventDate: string,
  ): Promise<number> {
    const [{ count }] = await db('artist_profiles as ap')
      .join('availability_calendar as ac', 'ac.artist_id', 'ap.id')
      .where('ap.base_city', 'ilike', city)
      .whereRaw('ap.event_types @> ?', [JSON.stringify([eventType])])
      .where('ap.deleted_at', null)
      .where('ac.date', eventDate)
      .where('ac.status', 'available')
      .countDistinct('ap.id as count');

    return Number(count);
  }
}

export const seasonalDemandRepository = new SeasonalDemandRepository();
