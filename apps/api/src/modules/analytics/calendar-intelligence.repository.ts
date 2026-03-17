import { db } from '../../infrastructure/database.js';

export class CalendarIntelligenceRepository {
  // ─── Demand Signals ───────────────────────────────────────
  async upsertDemandSignal(data: {
    signal_date: string;
    city: string;
    genre: string | null;
    event_type: string | null;
    search_count: number;
    inquiry_count: number;
    booking_count: number;
    available_artist_count: number;
    fill_rate: number;
    demand_level: string;
  }) {
    const existing = await db('demand_signals')
      .where({ signal_date: data.signal_date, city: data.city })
      .where(function () {
        if (data.genre) this.where('genre', data.genre);
        else this.whereNull('genre');
      })
      .where(function () {
        if (data.event_type) this.where('event_type', data.event_type);
        else this.whereNull('event_type');
      })
      .first();

    if (existing) {
      const [row] = await db('demand_signals')
        .where({ id: existing.id })
        .update({ ...data, updated_at: new Date() })
        .returning('*');
      return row;
    }

    const [row] = await db('demand_signals').insert(data).returning('*');
    return row;
  }

  async getDemandForecast(filters: {
    city?: string;
    genre?: string;
    event_type?: string;
    start_date?: string;
    end_date?: string;
  }) {
    let query = db('demand_signals').select('*');

    if (filters.city) query = query.where('city', 'ilike', `%${filters.city}%`);
    if (filters.genre) query = query.where('genre', filters.genre);
    if (filters.event_type) query = query.where('event_type', filters.event_type);
    if (filters.start_date) query = query.where('signal_date', '>=', filters.start_date);
    if (filters.end_date) query = query.where('signal_date', '<=', filters.end_date);

    return query.orderBy('signal_date').limit(500);
  }

  async getDemandHeatmap() {
    return db('demand_signals')
      .select('city', 'signal_date')
      .sum('search_count as total_searches')
      .sum('inquiry_count as total_inquiries')
      .sum('booking_count as total_bookings')
      .avg('fill_rate as avg_fill_rate')
      .groupBy('city', 'signal_date')
      .orderBy('signal_date')
      .limit(1000);
  }

  // ─── Alerts ───────────────────────────────────────────────
  async createAlert(data: {
    artist_id: string;
    alert_type: string;
    title: string;
    message: string;
    metadata: Record<string, unknown>;
    expires_at?: string;
  }) {
    const [row] = await db('calendar_intelligence_alerts').insert(data).returning('*');
    return row;
  }

  async getAlerts(artistId: string, filters: {
    alert_type?: string;
    is_read?: boolean;
    page: number;
    per_page: number;
  }) {
    let query = db('calendar_intelligence_alerts')
      .where({ artist_id: artistId })
      .where(function () {
        this.whereNull('expires_at').orWhere('expires_at', '>', new Date());
      });

    if (filters.alert_type) query = query.where('alert_type', filters.alert_type);
    if (filters.is_read !== undefined) query = query.where('is_read', filters.is_read);

    const offset = (filters.page - 1) * filters.per_page;
    const [countResult] = await query.clone().count('* as total');
    const total = Number(countResult.total);

    const rows = await query.orderBy('created_at', 'desc').limit(filters.per_page).offset(offset);

    return {
      data: rows,
      meta: { page: filters.page, per_page: filters.per_page, total, total_pages: Math.ceil(total / filters.per_page) },
    };
  }

  async markAlertRead(alertId: string, artistId: string) {
    const [row] = await db('calendar_intelligence_alerts')
      .where({ id: alertId, artist_id: artistId })
      .update({ is_read: true })
      .returning('*');
    return row;
  }

  async cleanExpiredAlerts() {
    return db('calendar_intelligence_alerts')
      .where('expires_at', '<', new Date())
      .del();
  }
}

export const calendarIntelligenceRepository = new CalendarIntelligenceRepository();
