import { seasonalDemandRepository } from './seasonal-demand.repository.js';
import type { CurveFilters, AlertFilters } from './seasonal-demand.repository.js';
import { db } from '../../infrastructure/database.js';
import {
  SEASONAL_DEMAND_LOOKBACK_MONTHS,
  SEASONAL_PEAK_THRESHOLD,
  SEASONAL_DEMAND_LOOKAHEAD_MONTHS,
} from '@artist-booking/shared';

// ─── Error Class ─────────────────────────────────────────────

export class SeasonalDemandError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode: number = 400) {
    super(message);
    this.name = 'SeasonalDemandError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// ─── Types ───────────────────────────────────────────────────

interface AvailabilityUrgencySignal {
  event_type: string;
  city: string;
  event_date: string;
  total_matching_artists: number;
  available_artists: number;
  urgency_level: 'critical' | 'limited' | 'moderate' | 'comfortable';
  urgency_text: string;
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ─── Service ─────────────────────────────────────────────────

export class SeasonalDemandService {
  // ─── Curve Computation (batch/cron) ──────────────────────

  /**
   * Compute seasonal demand curves from historical demand signals.
   * Designed to run as a periodic cron job.
   */
  async computeAllCurves(): Promise<number> {
    // 1. Query demand signals grouped by (city, genre, event_type, month)
    const signals = await seasonalDemandRepository.getDemandSignalsByMonth(
      SEASONAL_DEMAND_LOOKBACK_MONTHS,
    );

    if (signals.length === 0) return 0;

    let curveCount = 0;
    const now = new Date();

    for (const signal of signals) {
      // 2. Metrics are already averaged from the repository query
      const avgFillRate = signal.avg_fill_rate;
      const avgBookingCount = signal.avg_booking_count;
      const avgInquiryCount = signal.avg_inquiry_count;

      // 3. Classify demand level
      let demandLevel: string;
      if (avgFillRate >= SEASONAL_PEAK_THRESHOLD) {
        demandLevel = 'peak';
      } else if (avgFillRate >= 0.6) {
        demandLevel = 'high';
      } else if (avgFillRate >= 0.4) {
        demandLevel = 'moderate';
      } else {
        demandLevel = 'low';
      }

      // 4. Compute YoY trend if data exists for both years
      let yoyTrend: number | null = null;
      const yoyData = await seasonalDemandRepository.getYoyComparison(
        signal.city,
        signal.genre,
        signal.event_type,
        signal.month,
      );

      if (yoyData && yoyData.last_year_avg > 0) {
        yoyTrend = ((yoyData.this_year_avg - yoyData.last_year_avg) / yoyData.last_year_avg) * 100;
        yoyTrend = Math.round(yoyTrend * 100) / 100; // round to 2 decimals
      }

      // 5. Upsert curve
      await seasonalDemandRepository.upsertCurve({
        city: signal.city,
        genre: signal.genre,
        event_type: signal.event_type,
        month: signal.month,
        demand_level: demandLevel,
        avg_fill_rate: avgFillRate,
        avg_booking_count: avgBookingCount,
        avg_inquiry_count: avgInquiryCount,
        yoy_trend: yoyTrend,
        computed_at: now,
      });

      curveCount++;
    }

    return curveCount;
  }

  // ─── Alert Generation (batch/cron) ───────────────────────

  /**
   * Generate seasonal alerts for artists and clients.
   * Designed to run as a periodic cron job.
   */
  async generateAlertsBatch(): Promise<number> {
    let alertCount = 0;

    // ── Artist Alerts ────────────────────────────────────
    alertCount += await this.generateArtistAlerts();

    // ── Client Alerts ────────────────────────────────────
    alertCount += await this.generateClientAlerts();

    // Clean expired alerts
    await seasonalDemandRepository.cleanExpiredAlerts();

    return alertCount;
  }

  private async generateArtistAlerts(): Promise<number> {
    const artists = await db('artist_profiles')
      .select('id', 'user_id', 'base_city', 'genres', 'event_types')
      .where('deleted_at', null);

    let count = 0;
    const currentMonth = new Date().getMonth() + 1; // 1-indexed

    for (const artist of artists) {
      const userId = artist.user_id as string;
      const city = artist.base_city as string;
      const genres: string[] = Array.isArray(artist.genres)
        ? artist.genres
        : typeof artist.genres === 'string'
          ? JSON.parse(artist.genres)
          : [];
      // event_types parsed if needed for future matching
      void artist.event_types;

      // Check next LOOKAHEAD months
      for (let offset = 0; offset < SEASONAL_DEMAND_LOOKAHEAD_MONTHS; offset++) {
        const targetMonth = ((currentMonth - 1 + offset) % 12) + 1;
        const monthName = MONTH_NAMES[targetMonth];

        // Get curves for this artist's city and genres
        const curves = await db('seasonal_demand_curves')
          .where('city', 'ilike', city)
          .where('month', targetMonth)
          .where(function () {
            if (genres.length > 0) {
              this.whereIn('genre', genres).orWhereNull('genre');
            }
          });

        for (const curve of curves) {
          const demandLevel = curve.demand_level as string;
          const genre = (curve.genre as string) || 'live entertainment';
          const eventType = (curve.event_type as string) || 'events';
          const expiresAt = this.getMonthEndDate(targetMonth);

          if (demandLevel === 'peak') {
            // PEAK_APPROACHING — opportunity framing
            await seasonalDemandRepository.createAlert({
              user_id: userId,
              alert_type: 'PEAK_APPROACHING',
              title: `Peak Season Approaching in ${city}`,
              message: `Wedding season in ${city} peaks in ${monthName}! Your genre is in high demand — great time to market yourself.`,
              metadata: {
                city,
                month: targetMonth,
                month_name: monthName,
                genre,
                demand_level: demandLevel,
                avg_fill_rate: curve.avg_fill_rate,
              },
              expires_at: expiresAt,
            });
            count++;
          } else if (demandLevel === 'low') {
            // VALLEY_APPROACHING — constructive advice
            await seasonalDemandRepository.createAlert({
              user_id: userId,
              alert_type: 'VALLEY_APPROACHING',
              title: `Quieter Period Ahead in ${city}`,
              message: `${monthName} is typically quieter for ${genre} in ${city}. Consider expanding to corporate events or nearby cities.`,
              metadata: {
                city,
                month: targetMonth,
                month_name: monthName,
                genre,
                demand_level: demandLevel,
                avg_fill_rate: curve.avg_fill_rate,
              },
              expires_at: expiresAt,
            });
            count++;
          }

          // PRICE_OPPORTUNITY — high demand but artist has few bookings
          if (demandLevel === 'high' || demandLevel === 'peak') {
            const upcomingBookings = await db('bookings')
              .where('artist_id', artist.id)
              .whereRaw('EXTRACT(MONTH FROM event_date) = ?', [targetMonth])
              .whereNotIn('state', ['cancelled', 'expired'])
              .count('* as count')
              .first();

            const bookingCount = Number(upcomingBookings?.count) || 0;

            if (bookingCount < 2) {
              await seasonalDemandRepository.createAlert({
                user_id: userId,
                alert_type: 'PRICE_OPPORTUNITY',
                title: `Pricing Opportunity for ${eventType}`,
                message: `High demand for ${eventType} in ${city} next month. Consider adjusting your pricing to capture this opportunity.`,
                metadata: {
                  city,
                  month: targetMonth,
                  month_name: monthName,
                  event_type: eventType,
                  demand_level: demandLevel,
                  current_bookings: bookingCount,
                },
                expires_at: expiresAt,
              });
              count++;
            }
          }
        }
      }
    }

    return count;
  }

  private async generateClientAlerts(): Promise<number> {
    let count = 0;

    // Get upcoming bookings for clients/event companies in peak months
    const upcomingBookings = await db('bookings as b')
      .join('users as u', 'u.id', 'b.client_id')
      .select(
        'b.id as booking_id',
        'b.client_id',
        'u.id as user_id',
        'b.event_city',
        'b.event_type',
        'b.event_date',
      )
      .whereNotIn('b.state', ['cancelled', 'expired', 'completed', 'settled'])
      .where('b.event_date', '>=', new Date().toISOString().split('T')[0]);

    for (const booking of upcomingBookings) {
      const eventMonth = new Date(booking.event_date as string).getMonth() + 1;
      const city = booking.event_city as string;
      const eventType = booking.event_type as string;

      // Check if this month is peak for the city
      const curve = await db('seasonal_demand_curves')
        .where('city', 'ilike', city)
        .where('month', eventMonth)
        .whereIn('demand_level', ['peak', 'high'])
        .first();

      if (!curve) continue;

      // Check availability is low
      const totalArtists = await seasonalDemandRepository.getMatchingArtistCount(
        eventType,
        city,
      );
      const availableArtists = await seasonalDemandRepository.getAvailableArtistCount(
        eventType,
        city,
        booking.event_date as string,
      );

      if (totalArtists > 0 && availableArtists < totalArtists * 0.5) {
        const monthName = MONTH_NAMES[eventMonth];
        const expiresAt = booking.event_date as string;

        await seasonalDemandRepository.createAlert({
          user_id: booking.user_id as string,
          alert_type: 'BOOKING_WINDOW_CLOSING',
          title: `Limited Availability for ${monthName} in ${city}`,
          message: `${monthName} is peak wedding season in ${city}. Only ${availableArtists} of ${totalArtists} matching artists are still available for your date.`,
          metadata: {
            city,
            month: eventMonth,
            month_name: monthName,
            event_type: eventType,
            event_date: booking.event_date,
            booking_id: booking.booking_id,
            available_artists: availableArtists,
            total_artists: totalArtists,
          },
          expires_at: expiresAt,
        });
        count++;
      }
    }

    return count;
  }

  // ─── Public Methods ──────────────────────────────────────

  /**
   * Get demand curves with optional filters.
   */
  async getDemandCurves(filters?: CurveFilters) {
    const curves = await seasonalDemandRepository.getCurves(filters);
    return curves;
  }

  /**
   * Get all monthly curves for a specific city.
   */
  async getCityCurves(city: string) {
    const curves = await seasonalDemandRepository.getCurvesByCity(city);

    if (curves.length === 0) {
      throw new SeasonalDemandError(
        'CURVES_NOT_FOUND',
        `No seasonal demand curves found for city: ${city}`,
        404,
      );
    }

    return curves;
  }

  /**
   * Get alerts for a user with optional filters.
   */
  async getAlerts(userId: string, filters?: AlertFilters) {
    return seasonalDemandRepository.getAlertsForUser(userId, filters);
  }

  /**
   * Mark an alert as read. Verifies the alert belongs to the user.
   */
  async markAlertRead(alertId: string, userId: string) {
    // Verify ownership
    const alert = await db('seasonal_alerts')
      .where({ id: alertId, user_id: userId })
      .first();

    if (!alert) {
      throw new SeasonalDemandError(
        'ALERT_NOT_FOUND',
        'Alert not found or does not belong to this user',
        404,
      );
    }

    return seasonalDemandRepository.markAlertRead(alertId);
  }

  /**
   * Compute availability urgency for a specific event request.
   * Returns urgency signal with human-readable text.
   */
  async getAvailabilityUrgency(
    eventType: string,
    city: string,
    eventDate: string,
  ): Promise<AvailabilityUrgencySignal> {
    // 1. Get total matching artists
    const totalMatching = await seasonalDemandRepository.getMatchingArtistCount(eventType, city);

    // 2. Get available artists for the date
    const available = await seasonalDemandRepository.getAvailableArtistCount(
      eventType,
      city,
      eventDate,
    );

    // 3. Generate urgency text and level
    let urgencyLevel: AvailabilityUrgencySignal['urgency_level'];
    let urgencyText: string;

    if (totalMatching === 0) {
      urgencyLevel = 'critical';
      urgencyText = `No matching artists found for ${eventType} in ${city}.`;
    } else if (available < 5) {
      urgencyLevel = 'critical';
      urgencyText = `Only ${available} matching artists available!`;
    } else if (available < totalMatching * 0.3) {
      urgencyLevel = 'limited';
      urgencyText = `Limited availability \u2014 ${available} of ${totalMatching} artists available`;
    } else if (available < totalMatching * 0.5) {
      urgencyLevel = 'moderate';
      urgencyText = `Moderate availability \u2014 ${available} of ${totalMatching} artists available`;
    } else {
      urgencyLevel = 'comfortable';
      urgencyText = `Good availability \u2014 ${available} of ${totalMatching} artists available`;
    }

    return {
      event_type: eventType,
      city,
      event_date: eventDate,
      total_matching_artists: totalMatching,
      available_artists: available,
      urgency_level: urgencyLevel,
      urgency_text: urgencyText,
    };
  }

  // ─── Helpers ─────────────────────────────────────────────

  /**
   * Get the last day of a given month (current or next year) as an ISO date string.
   */
  private getMonthEndDate(month: number): string {
    const now = new Date();
    let year = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // If the month has already passed, use next year
    if (month < currentMonth) {
      year += 1;
    }

    // Day 0 of next month = last day of target month
    const lastDay = new Date(year, month, 0);
    return lastDay.toISOString().split('T')[0];
  }
}

export const seasonalDemandService = new SeasonalDemandService();
