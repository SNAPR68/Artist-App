import { artistIntelligenceRepository } from './artist-intelligence.repository.js';
import { db } from '../../infrastructure/database.js';

/**
 * CRITICAL DESIGN CONSTRAINT:
 * Never expose rankings, percentiles, or decline signals to artists.
 * Frame everything as "opportunity".
 */

interface GigOpportunity {
  city: string;
  genre: string | null;
  event_type: string | null;
  date_range: { start: string; end: string };
  demand_level: string;
  opportunity_score: number;
  rationale: string;
}

interface EarningsFilters {
  period_type?: string;
  start_date?: string;
  end_date?: string;
}

export class ArtistIntelligenceService {
  // ─── Earnings Snapshots ─────────────────────────────────────

  /**
   * Compute monthly earnings snapshots for the last 12 months.
   */
  async computeEarningsSnapshots(artistId: string): Promise<number> {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Get artist profile for genre/city to look up market averages
    const artist = await db('artist_profiles').where({ id: artistId }).first();
    if (!artist) return 0;

    // Query completed bookings grouped by month
    const monthlyBookings = await db('bookings')
      .where('artist_id', artistId)
      .whereIn('state', ['completed', 'settled'])
      .where('created_at', '>=', twelveMonthsAgo.toISOString())
      .select(
        db.raw("date_trunc('month', event_date)::date as month_start"),
        db.raw('COUNT(*)::int as total_bookings'),
        db.raw("COUNT(*) FILTER (WHERE state IN ('completed', 'settled'))::int as completed_bookings"),
        db.raw('COALESCE(SUM(final_amount_paise), 0)::bigint as total_revenue_paise'),
        db.raw('COALESCE(AVG(final_amount_paise), 0)::bigint as avg_booking_paise'),
      )
      .groupBy(db.raw("date_trunc('month', event_date)::date"))
      .orderBy('month_start', 'desc');

    let count = 0;

    for (const month of monthlyBookings) {
      const monthStart = new Date(month.month_start);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(monthEnd.getDate() - 1);

      // Revenue breakdown by event type
      const byEventType = await db('bookings')
        .where('artist_id', artistId)
        .whereIn('state', ['completed', 'settled'])
        .whereRaw("date_trunc('month', event_date)::date = ?", [month.month_start])
        .select(
          'event_type',
          db.raw('COUNT(*)::int as count'),
          db.raw('COALESCE(SUM(final_amount_paise), 0)::bigint as revenue_paise'),
        )
        .groupBy('event_type');

      const revenueByEventType: Record<string, { count: number; revenue_paise: number }> = {};
      for (const row of byEventType) {
        revenueByEventType[row.event_type] = {
          count: Number(row.count),
          revenue_paise: Number(row.revenue_paise),
        };
      }

      // Revenue breakdown by city
      const byCity = await db('bookings')
        .where('artist_id', artistId)
        .whereIn('state', ['completed', 'settled'])
        .whereRaw("date_trunc('month', event_date)::date = ?", [month.month_start])
        .select(
          'event_city',
          db.raw('COUNT(*)::int as count'),
          db.raw('COALESCE(SUM(final_amount_paise), 0)::bigint as revenue_paise'),
        )
        .groupBy('event_city');

      const revenueByCity: Record<string, { count: number; revenue_paise: number }> = {};
      for (const row of byCity) {
        revenueByCity[row.event_city] = {
          count: Number(row.count),
          revenue_paise: Number(row.revenue_paise),
        };
      }

      // Get anonymized market average from price_intelligence_v2
      let marketAvgPaise: number | null = null;
      const primaryGenre = Array.isArray(artist.genres) ? artist.genres[0] : null;
      if (primaryGenre && artist.base_city) {
        const market = await db('price_intelligence_v2')
          .where({ primary_genre: primaryGenre, event_city: artist.base_city })
          .avg('median_paise as avg_median')
          .first();
        if (market?.avg_median) {
          marketAvgPaise = Math.round(Number(market.avg_median));
        }
      }

      await artistIntelligenceRepository.upsertEarningsSnapshot({
        artist_id: artistId,
        period_type: 'monthly',
        period_start: monthStart.toISOString().split('T')[0],
        period_end: monthEnd.toISOString().split('T')[0],
        total_bookings: Number(month.total_bookings),
        completed_bookings: Number(month.completed_bookings),
        total_revenue_paise: Number(month.total_revenue_paise),
        avg_booking_paise: Number(month.avg_booking_paise),
        revenue_by_event_type: revenueByEventType,
        revenue_by_city: revenueByCity,
        market_avg_paise: marketAvgPaise,
      });

      count++;
    }

    return count;
  }

  // ─── Career Metrics ─────────────────────────────────────────

  /**
   * Compute comprehensive career metrics for an artist.
   */
  async computeCareerMetrics(artistId: string): Promise<void> {
    const artist = await db('artist_profiles').where({ id: artistId }).first();
    if (!artist) return;

    // Trust score history: from earnings snapshots for last 12 months
    // Since we don't store historical trust scores, use current for all periods.
    // Over time as cron runs monthly, snapshots will capture the progression.
    const snapshots = await artistIntelligenceRepository.getEarningsSnapshots(artistId, 'monthly');
    const trustScoreHistory = snapshots.map((s: Record<string, unknown>) => ({
      date: s.period_start,
      score: Number(artist.trust_score),
    }));

    // Price progression: avg_booking_paise per month
    const priceProgression = snapshots.map((s: Record<string, unknown>) => ({
      date: s.period_start,
      avg_booking_paise: Number(s.avg_booking_paise),
    }));

    // Booking velocity
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);
    const oneYearAgo = new Date(now.getTime() - 365 * 86400000);
    const twoYearsAgo = new Date(now.getTime() - 730 * 86400000);

    const [last30d]: any[] = await db('bookings')
      .where('artist_id', artistId)
      .whereIn('state', ['completed', 'settled', 'confirmed', 'in_progress'])
      .where('created_at', '>=', thirtyDaysAgo.toISOString())
      .count('* as count');

    const [last90d]: any[] = await db('bookings')
      .where('artist_id', artistId)
      .whereIn('state', ['completed', 'settled', 'confirmed', 'in_progress'])
      .where('created_at', '>=', ninetyDaysAgo.toISOString())
      .count('* as count');

    const [currentYear]: any[] = await db('bookings')
      .where('artist_id', artistId)
      .whereIn('state', ['completed', 'settled'])
      .where('created_at', '>=', oneYearAgo.toISOString())
      .count('* as count');

    const [previousYear]: any[] = await db('bookings')
      .where('artist_id', artistId)
      .whereIn('state', ['completed', 'settled'])
      .where('created_at', '>=', twoYearsAgo.toISOString())
      .where('created_at', '<', oneYearAgo.toISOString())
      .count('* as count');

    const currentYearCount = Number(currentYear.count);
    const previousYearCount = Number(previousYear.count);
    const yoyChange = previousYearCount > 0
      ? Math.round(((currentYearCount - previousYearCount) / previousYearCount) * 100)
      : currentYearCount > 0 ? 100 : 0;

    const bookingVelocity = {
      last_30d: Number(last30d.count),
      last_90d: Number(last90d.count),
      current_year: currentYearCount,
      previous_year: previousYearCount,
      yoy_change_pct: yoyChange,
    };

    // Top cities by completed bookings
    const topCities = await db('bookings')
      .where('artist_id', artistId)
      .whereIn('state', ['completed', 'settled'])
      .select(
        'event_city as city',
        db.raw('COUNT(*)::int as booking_count'),
        db.raw('COALESCE(SUM(final_amount_paise), 0)::bigint as total_revenue_paise'),
      )
      .groupBy('event_city')
      .orderBy('booking_count', 'desc')
      .limit(5);

    // Top event types
    const topEventTypes = await db('bookings')
      .where('artist_id', artistId)
      .whereIn('state', ['completed', 'settled'])
      .select(
        'event_type',
        db.raw('COUNT(*)::int as booking_count'),
        db.raw('COALESCE(SUM(final_amount_paise), 0)::bigint as total_revenue_paise'),
      )
      .groupBy('event_type')
      .orderBy('booking_count', 'desc')
      .limit(5);

    // Rebook rate: distinct clients who booked 2+ times / total distinct clients
    const clientStats = await db('bookings')
      .where('artist_id', artistId)
      .whereIn('state', ['completed', 'settled'])
      .select(
        'client_id',
        db.raw('COUNT(*)::int as booking_count'),
      )
      .groupBy('client_id');

    const totalClients = clientStats.length;
    const repeatClients = clientStats.filter((c: Record<string, unknown>) => Number(c.booking_count) >= 2).length;
    const rebookRate = totalClients > 0
      ? Math.round((repeatClients / totalClients) * 100) / 100
      : 0;

    // Avg crowd energy: mode of crowd_energy from event_context_data
    let avgCrowdEnergy: string | null = null;
    const crowdEnergyResult = await db('event_context_data as ecd')
      .join('bookings as b', 'b.id', 'ecd.booking_id')
      .where('b.artist_id', artistId)
      .whereNotNull('ecd.crowd_energy')
      .select('ecd.crowd_energy')
      .groupBy('ecd.crowd_energy')
      .count('* as cnt')
      .orderBy('cnt', 'desc')
      .first();

    if (crowdEnergyResult) {
      avgCrowdEnergy = crowdEnergyResult.crowd_energy as string;
    }

    // Demand alignment: available dates in next 90 days overlapping with high/peak demand
    let demandAlignment: number | null = null;
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 86400000);

    const availableDates = await db('availability_calendar')
      .where('artist_id', artistId)
      .where('status', 'available')
      .where('date', '>=', now.toISOString().split('T')[0])
      .where('date', '<=', ninetyDaysFromNow.toISOString().split('T')[0])
      .select('date');

    if (availableDates.length > 0) {
      const primaryGenre = Array.isArray(artist.genres) ? artist.genres[0] : null;
      const dateStrings = availableDates.map((d: Record<string, unknown>) => d.date as string);

      let demandQuery = db('demand_signals')
        .whereIn('demand_level', ['high', 'peak'])
        .whereIn('signal_date', dateStrings);

      if (artist.base_city) {
        demandQuery = demandQuery.where('city', artist.base_city);
      }
      if (primaryGenre) {
        demandQuery = demandQuery.where(function () {
          this.where('genre', primaryGenre).orWhereNull('genre');
        });
      }

      const matchingDemand = await demandQuery.select('signal_date').groupBy('signal_date');
      demandAlignment = Math.round((matchingDemand.length / availableDates.length) * 100) / 100;
    }

    // Gig advisor
    const gigAdvisor = await this.generateGigAdvisor(artistId);

    await artistIntelligenceRepository.upsertCareerMetrics(artistId, {
      trust_score_history: trustScoreHistory,
      price_progression: priceProgression,
      booking_velocity: bookingVelocity,
      top_cities: topCities.map((c: Record<string, unknown>) => ({
        city: c.city,
        booking_count: Number(c.booking_count),
        total_revenue_paise: Number(c.total_revenue_paise),
      })),
      top_event_types: topEventTypes.map((e: Record<string, unknown>) => ({
        event_type: e.event_type,
        booking_count: Number(e.booking_count),
        total_revenue_paise: Number(e.total_revenue_paise),
      })),
      rebook_rate: rebookRate,
      avg_crowd_energy: avgCrowdEnergy,
      demand_alignment: demandAlignment,
      gig_advisor: gigAdvisor as unknown as Record<string, unknown>[],
    });
  }

  // ─── Gig Advisor ────────────────────────────────────────────

  /**
   * Generate opportunity-framed gig recommendations for the next 90 days.
   */
  async generateGigAdvisor(artistId: string): Promise<GigOpportunity[]> {
    const artist = await db('artist_profiles').where({ id: artistId }).first();
    if (!artist) return [];

    const primaryGenre = Array.isArray(artist.genres) ? artist.genres[0] : null;
    const artistGenres = Array.isArray(artist.genres) ? artist.genres : [];
    const baseCity = artist.base_city;

    const now = new Date();
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 86400000);

    // Query high/peak demand signals for next 90 days
    const demandSignals = await db('demand_signals')
      .whereIn('demand_level', ['high', 'peak'])
      .where('signal_date', '>=', now.toISOString().split('T')[0])
      .where('signal_date', '<=', ninetyDaysFromNow.toISOString().split('T')[0])
      .orderBy('signal_date');

    const opportunities: GigOpportunity[] = [];

    for (const signal of demandSignals) {
      let opportunityScore = 0;

      // Base score from demand level
      if (signal.demand_level === 'peak') {
        opportunityScore = 1.0;
      } else if (signal.demand_level === 'high') {
        opportunityScore = 0.7;
      }

      // Genre match bonus
      const signalGenre = signal.genre as string | null;
      const genreMatch = signalGenre && artistGenres.includes(signalGenre);
      if (genreMatch) {
        opportunityScore += 0.2;
      }

      // Same city bonus
      const sameCity = baseCity && signal.city === baseCity;
      if (sameCity) {
        opportunityScore += 0.1;
      }

      // Only include if there's some relevance (genre or city match)
      if (!genreMatch && !sameCity) continue;

      // Build positive rationale
      const genreLabel = signalGenre || primaryGenre || 'live entertainment';
      const demandLabel = signal.demand_level === 'peak' ? 'Strong' : 'Growing';
      const signalDate = new Date(signal.signal_date);
      const dateStr = signalDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

      let rationale = `${demandLabel} demand for ${genreLabel} in ${signal.city} around ${dateStr}.`;
      if (sameCity) {
        rationale += ' Great opportunity in your home city!';
      } else {
        rationale += ' A chance to expand your reach!';
      }

      opportunities.push({
        city: signal.city,
        genre: signalGenre,
        event_type: signal.event_type,
        date_range: {
          start: signal.signal_date,
          end: signal.signal_date,
        },
        demand_level: signal.demand_level,
        opportunity_score: Math.round(opportunityScore * 100) / 100,
        rationale,
      });
    }

    // Return top 5 by opportunity score
    return opportunities
      .sort((a, b) => b.opportunity_score - a.opportunity_score)
      .slice(0, 5);
  }

  // ─── Public API Methods ─────────────────────────────────────

  /**
   * Get career trajectory for the authenticated artist.
   */
  async getCareerTrajectory(userId: string) {
    const artist = await db('artist_profiles').where({ user_id: userId }).first();
    if (!artist) return null;

    const careerMetrics = await artistIntelligenceRepository.getCareerMetrics(artist.id);

    const [totalBookings]: any[] = await db('bookings')
      .where('artist_id', artist.id)
      .whereIn('state', ['completed', 'settled'])
      .count('* as count');

    return {
      artist_id: artist.id,
      trust_score: Number(artist.trust_score),
      total_bookings: Number(totalBookings.count),
      career_metrics: careerMetrics || null,
    };
  }

  /**
   * Get earnings analytics with optional filters.
   */
  async getEarningsAnalytics(userId: string, filters: EarningsFilters) {
    const artist = await db('artist_profiles').where({ user_id: userId }).first();
    if (!artist) return null;

    const periodType = filters.period_type || 'monthly';
    const snapshots = await artistIntelligenceRepository.getEarningsSnapshots(
      artist.id,
      periodType,
      filters.start_date,
      filters.end_date,
    );

    // Compute summary
    const totalRevenue = snapshots.reduce(
      (sum: number, s: Record<string, unknown>) => sum + Number(s.total_revenue_paise), 0,
    );
    const totalBookings = snapshots.reduce(
      (sum: number, s: Record<string, unknown>) => sum + Number(s.total_bookings), 0,
    );

    return {
      artist_id: artist.id,
      period_type: periodType,
      snapshots,
      summary: {
        total_revenue_paise: totalRevenue,
        total_bookings: totalBookings,
        avg_booking_paise: totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0,
        periods_count: snapshots.length,
      },
    };
  }

  /**
   * Get reputation insights — never expose decline signals.
   * Frame everything as "opportunity to grow".
   */
  async getReputationInsights(userId: string) {
    const artist = await db('artist_profiles').where({ user_id: userId }).first();
    if (!artist) return null;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Reviews for last 6 months
    const reviewStats: any = await db('reviews')
      .where('reviewee_id', artist.user_id)
      .where('created_at', '>=', sixMonthsAgo.toISOString())
      .select(
        db.raw('COALESCE(AVG(overall_rating), 0) as avg_rating'),
        db.raw('COUNT(*)::int as review_count'),
      )
      .first();

    // Review trend: compare first half vs second half of 6-month window
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const [olderHalf] = await db('reviews')
      .where('reviewee_id', artist.user_id)
      .where('created_at', '>=', sixMonthsAgo.toISOString())
      .where('created_at', '<', threeMonthsAgo.toISOString())
      .avg('overall_rating as avg_rating');

    const [recentHalf] = await db('reviews')
      .where('reviewee_id', artist.user_id)
      .where('created_at', '>=', threeMonthsAgo.toISOString())
      .avg('overall_rating as avg_rating');

    const olderAvg = Number(olderHalf?.avg_rating || 0);
    const recentAvg = Number(recentHalf?.avg_rating || 0);

    // CRITICAL: Never expose "declining" — frame as opportunity
    let trend: string;
    if (recentAvg > olderAvg + 0.1) {
      trend = 'improving';
    } else if (recentAvg < olderAvg - 0.1) {
      trend = 'opportunity to grow';
    } else {
      trend = 'stable';
    }

    // Get rebook rate and crowd energy from career metrics
    const careerMetrics = await artistIntelligenceRepository.getCareerMetrics(artist.id);

    // Avg crowd energy from event context data
    const crowdEnergyResult = await db('event_context_data as ecd')
      .join('bookings as b', 'b.id', 'ecd.booking_id')
      .where('b.artist_id', artist.id)
      .whereNotNull('ecd.crowd_energy')
      .select('ecd.crowd_energy')
      .groupBy('ecd.crowd_energy')
      .count('* as cnt')
      .orderBy('cnt', 'desc')
      .first();

    return {
      artist_id: artist.id,
      trust_score: Number(artist.trust_score),
      reviews: {
        avg_rating: Math.round(Number(reviewStats?.avg_rating || 0) * 100) / 100,
        review_count: Number(reviewStats?.review_count || 0),
        trend,
      },
      rebook_rate: careerMetrics ? Number(careerMetrics.rebook_rate) : null,
      avg_crowd_energy: crowdEnergyResult?.crowd_energy || careerMetrics?.avg_crowd_energy || null,
    };
  }

  /**
   * Get combined intelligence summary for the artist dashboard.
   */
  async getSummary(userId: string) {
    const artist = await db('artist_profiles').where({ user_id: userId }).first();
    if (!artist) return null;

    const careerMetrics = await artistIntelligenceRepository.getCareerMetrics(artist.id);

    // Latest earnings snapshot
    const [latestSnapshot] = await artistIntelligenceRepository.getEarningsSnapshots(
      artist.id,
      'monthly',
    );

    // Top 3 gig advisor recommendations
    let topOpportunities: GigOpportunity[] = [];
    if (careerMetrics?.gig_advisor) {
      const advisor = typeof careerMetrics.gig_advisor === 'string'
        ? JSON.parse(careerMetrics.gig_advisor)
        : careerMetrics.gig_advisor;
      topOpportunities = (advisor as GigOpportunity[]).slice(0, 3);
    }

    return {
      artist_id: artist.id,
      trust_score: Number(artist.trust_score),
      career_metrics: careerMetrics || null,
      latest_earnings: latestSnapshot || null,
      top_opportunities: topOpportunities,
    };
  }

  // ─── Batch Processing ───────────────────────────────────────

  /**
   * Compute intelligence for all active, verified artists.
   * Designed to run as a cron job.
   */
  async batchComputeAll(): Promise<number> {
    const artists = await artistIntelligenceRepository.getActiveArtistIds();
    let processed = 0;

    for (const artist of artists) {
      try {
        await this.computeEarningsSnapshots(artist.id);
        await this.computeCareerMetrics(artist.id);
        processed++;
      } catch (err) {
        console.error(`[ARTIST_INTELLIGENCE] Failed to compute for ${artist.id}:`, err);
      }
    }

    return processed;
  }
}

export const artistIntelligenceService = new ArtistIntelligenceService();
