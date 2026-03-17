import { calendarIntelligenceRepository } from './calendar-intelligence.repository.js';
import { db } from '../../infrastructure/database.js';
import { DEMAND_THRESHOLDS, CALENDAR_INTELLIGENCE_LOOKAHEAD_DAYS } from '@artist-booking/shared';

export class CalendarIntelligenceService {
  /**
   * Aggregate demand signals from bookings and failure events.
   * Run as a cron job every 6 hours.
   */
  async aggregateDemandSignals(): Promise<number> {
    const today = new Date();
    const lookahead = new Date(today);
    lookahead.setDate(lookahead.getDate() + CALENDAR_INTELLIGENCE_LOOKAHEAD_DAYS);

    // Get booking counts per date/city/event_type
    const bookingSignals = await db('bookings')
      .select('event_city as city', 'event_date as signal_date', 'event_type')
      .count('* as booking_count')
      .where('event_date', '>=', today.toISOString().split('T')[0])
      .where('event_date', '<=', lookahead.toISOString().split('T')[0])
      .whereNotIn('state', ['cancelled', 'expired'])
      .groupBy('event_city', 'event_date', 'event_type');

    // Get inquiry counts (bookings in inquiry/shortlisted state)
    const inquirySignals = await db('bookings')
      .select('event_city as city', 'event_date as signal_date', 'event_type')
      .count('* as inquiry_count')
      .where('event_date', '>=', today.toISOString().split('T')[0])
      .whereIn('state', ['inquiry', 'shortlisted', 'quoted', 'negotiating'])
      .groupBy('event_city', 'event_date', 'event_type');

    // Get available artists per city/date
    const availableArtists = await db('availability_calendar as ac')
      .join('artist_profiles as ap', 'ac.artist_id', 'ap.id')
      .select('ap.base_city as city', 'ac.date as signal_date')
      .count('DISTINCT ac.artist_id as available_count')
      .where('ac.status', 'available')
      .where('ac.date', '>=', today.toISOString().split('T')[0])
      .where('ac.date', '<=', lookahead.toISOString().split('T')[0])
      .groupBy('ap.base_city', 'ac.date');

    // Build a map of signals
    const signalMap = new Map<string, Record<string, unknown>>();

    for (const b of bookingSignals) {
      const key = `${b.signal_date}|${b.city}|${b.event_type}`;
      signalMap.set(key, {
        signal_date: b.signal_date,
        city: b.city,
        genre: null,
        event_type: b.event_type,
        booking_count: Number(b.booking_count),
        inquiry_count: 0,
        search_count: 0,
        available_artist_count: 0,
        fill_rate: 0,
        demand_level: 'low',
      });
    }

    for (const i of inquirySignals) {
      const key = `${i.signal_date}|${i.city}|${i.event_type}`;
      const existing = signalMap.get(key) || {
        signal_date: i.signal_date,
        city: i.city,
        genre: null,
        event_type: i.event_type,
        booking_count: 0,
        search_count: 0,
        available_artist_count: 0,
        fill_rate: 0,
        demand_level: 'low',
      };
      (existing as Record<string, unknown>).inquiry_count = Number(i.inquiry_count);
      signalMap.set(key, existing);
    }

    // Enrich with availability data
    const availMap = new Map<string, number>();
    for (const a of availableArtists) {
      availMap.set(`${a.signal_date}|${a.city}`, Number(a.available_count));
    }

    let upsertCount = 0;
    for (const [, signal] of signalMap) {
      const s = signal as Record<string, unknown>;
      const availKey = `${s.signal_date}|${s.city}`;
      const available = availMap.get(availKey) || 0;
      s.available_artist_count = available;

      // Compute fill rate and demand level
      const totalDemand = (s.booking_count as number) + (s.inquiry_count as number);
      s.fill_rate = available > 0 ? Math.min(totalDemand / available, 1) : (totalDemand > 0 ? 1 : 0);

      const fr = s.fill_rate as number;
      if (fr >= DEMAND_THRESHOLDS.PEAK) s.demand_level = 'peak';
      else if (fr >= DEMAND_THRESHOLDS.HIGH) s.demand_level = 'high';
      else if (fr >= DEMAND_THRESHOLDS.MODERATE) s.demand_level = 'moderate';
      else s.demand_level = 'low';

      await calendarIntelligenceRepository.upsertDemandSignal(s as {
        signal_date: string; city: string; genre: string | null; event_type: string | null;
        search_count: number; inquiry_count: number; booking_count: number;
        available_artist_count: number; fill_rate: number; demand_level: string;
      });
      upsertCount++;
    }

    return upsertCount;
  }

  /**
   * Generate personalized alerts for artists. Run as cron batch.
   */
  async generateAlertsBatch(): Promise<number> {
    const artists = await db('artist_profiles')
      .select('id', 'base_city', 'genres', 'event_types')
      .where('deleted_at', null);

    let alertCount = 0;
    for (const artist of artists) {
      alertCount += await this.generateArtistAlerts(artist);
    }

    // Clean expired
    await calendarIntelligenceRepository.cleanExpiredAlerts();

    return alertCount;
  }

  private async generateArtistAlerts(artist: Record<string, unknown>): Promise<number> {
    const artistId = artist.id as string;
    const city = artist.base_city as string;

    // Find high-demand dates in artist's city
    const highDemand = await db('demand_signals')
      .where('city', 'ilike', `%${city}%`)
      .whereIn('demand_level', ['high', 'peak'])
      .where('signal_date', '>=', new Date().toISOString().split('T')[0])
      .orderBy('fill_rate', 'desc')
      .limit(5);

    let count = 0;
    for (const signal of highDemand) {
      // Check if artist is available on that date
      const availability = await db('availability_calendar')
        .where({ artist_id: artistId, date: signal.signal_date, status: 'available' })
        .first();

      if (availability) {
        await calendarIntelligenceRepository.createAlert({
          artist_id: artistId,
          alert_type: 'high_demand_date',
          title: `High Demand on ${signal.signal_date}`,
          message: `${signal.city} has ${signal.demand_level} demand for ${signal.event_type || 'events'} on ${signal.signal_date}. You're available — consider marketing this date!`,
          metadata: { signal_date: signal.signal_date, city: signal.city, demand_level: signal.demand_level, fill_rate: signal.fill_rate },
          expires_at: signal.signal_date,
        });
        count++;
      }
    }

    return count;
  }

  async getDemandForecast(filters: {
    city?: string; genre?: string; event_type?: string;
    start_date?: string; end_date?: string;
  }) {
    return calendarIntelligenceRepository.getDemandForecast(filters);
  }

  async getArtistAlerts(artistId: string, filters: {
    alert_type?: string; is_read?: boolean; page: number; per_page: number;
  }) {
    return calendarIntelligenceRepository.getAlerts(artistId, filters);
  }

  async markAlertRead(alertId: string, artistId: string) {
    return calendarIntelligenceRepository.markAlertRead(alertId, artistId);
  }

  async getDemandHeatmap() {
    return calendarIntelligenceRepository.getDemandHeatmap();
  }
}

export const calendarIntelligenceService = new CalendarIntelligenceService();
