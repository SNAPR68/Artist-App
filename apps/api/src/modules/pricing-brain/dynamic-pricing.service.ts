import { dynamicPricingRepository } from './dynamic-pricing.repository.js';
import { db } from '../../infrastructure/database.js';
import { DYNAMIC_PRICING_MAX_SURGE_PCT, DYNAMIC_PRICE_LOOKAHEAD_DAYS } from '@artist-booking/shared';

interface DynamicPriceResult {
  base_min_paise: number;
  base_max_paise: number;
  adjusted_min_paise: number;
  adjusted_max_paise: number;
  fair_price_min_paise: number | null;
  fair_price_max_paise: number | null;
  demand_level: string;
  adjustments_applied: { rule_type: string; description: string; pct_change: number }[];
}

interface SurgeIndicator {
  city: string;
  event_date: string;
  event_type: string | null;
  demand_level: string;
  indicator_text: string;
}

interface ElasticityReport {
  by_demand_level: { demand_level: string; total: number; booked: number; conversion_rate: number }[];
  by_surge_bucket: { bucket: string; total: number; booked: number; conversion_rate: number }[];
}

const SURGE_INDICATOR_TEXT: Record<string, string> = {
  low: 'Available dates',
  moderate: 'Moderate demand',
  high: 'High demand — book early!',
  peak: 'Peak demand — limited availability!',
};

function classifySurgeBucket(surgePct: number): string {
  if (surgePct <= 0) return '0%';
  if (surgePct <= 10) return '1-10%';
  if (surgePct <= 20) return '11-20%';
  return '21-50%';
}

export class DynamicPricingService {
  // ─── Core Computation ───────────────────────────────────────

  async computeDynamicPrice(
    artistId: string,
    eventType: string,
    city: string,
    eventDate: string,
  ): Promise<DynamicPriceResult> {
    // 1. Check cache first
    const cached = await dynamicPricingRepository.getCachedPrice(artistId, eventType, city, eventDate);
    if (cached) {
      return {
        base_min_paise: Number(cached.base_min_paise),
        base_max_paise: Number(cached.base_max_paise),
        adjusted_min_paise: Number(cached.adjusted_min_paise),
        adjusted_max_paise: Number(cached.adjusted_max_paise),
        fair_price_min_paise: cached.fair_price_min_paise ? Number(cached.fair_price_min_paise) : null,
        fair_price_max_paise: cached.fair_price_max_paise ? Number(cached.fair_price_max_paise) : null,
        demand_level: cached.demand_level,
        adjustments_applied: typeof cached.adjustments_applied === 'string'
          ? JSON.parse(cached.adjustments_applied)
          : cached.adjustments_applied || [],
      };
    }

    // 2. Get artist's base pricing from pricing jsonb array
    const artist = await db('artist_profiles').where({ id: artistId }).first();
    if (!artist) {
      throw new Error('Artist profile not found');
    }

    const pricingEntries = artist.pricing || [];
    let matchedEntry = pricingEntries.find(
      (p: Record<string, unknown>) => p.event_type === eventType,
    );
    if (!matchedEntry && pricingEntries.length > 0) {
      matchedEntry = pricingEntries[0];
    }
    if (!matchedEntry) {
      throw new Error('No pricing configured for this artist');
    }

    const baseMin = Number(matchedEntry.min_price);
    const baseMax = Number(matchedEntry.max_price);

    // 3. Get demand signal for this date/city
    const demandSignal = await db('demand_signals')
      .where({ city })
      .where('signal_date', eventDate)
      .first();

    const demandLevel = demandSignal?.demand_level || 'moderate';

    // 4. Get artist's active rules
    const rules = await dynamicPricingRepository.getArtistRules(artistId);

    // 5. Apply matching rules in order
    let adjustedMin = baseMin;
    let adjustedMax = baseMax;
    const adjustmentsApplied: { rule_type: string; description: string; pct_change: number }[] = [];

    const eventDateObj = new Date(eventDate);
    const eventMonth = eventDateObj.getMonth() + 1; // 1-indexed
    const daysBeforeEvent = Math.ceil(
      (eventDateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    for (const rule of rules) {
      const conditions = typeof rule.conditions === 'string'
        ? JSON.parse(rule.conditions)
        : rule.conditions;
      const action = typeof rule.action === 'string'
        ? JSON.parse(rule.action)
        : rule.action;

      // Check event_type filter on rule
      const ruleEventTypes = typeof rule.event_types === 'string'
        ? JSON.parse(rule.event_types)
        : rule.event_types;
      if (ruleEventTypes && ruleEventTypes.length > 0 && !ruleEventTypes.includes(eventType)) {
        continue;
      }

      // Check city filter on rule
      const ruleCities = typeof rule.cities === 'string'
        ? JSON.parse(rule.cities)
        : rule.cities;
      if (ruleCities && ruleCities.length > 0) {
        const cityMatch = ruleCities.some(
          (c: string) => c.toLowerCase() === city.toLowerCase(),
        );
        if (!cityMatch) continue;
      }

      let matches = false;
      let description = '';

      switch (rule.rule_type) {
        case 'demand_surge': {
          const demandLevels = conditions.demand_level || conditions.demand_levels || [];
          if (Array.isArray(demandLevels) && demandLevels.includes(demandLevel)) {
            matches = true;
            description = `Demand surge rule triggered (demand: ${demandLevel})`;
          }
          break;
        }

        case 'last_minute_discount': {
          const maxDays = conditions.days_before?.max ?? conditions.max_days_before ?? 7;
          if (daysBeforeEvent >= 0 && daysBeforeEvent <= maxDays) {
            matches = true;
            description = `Last-minute discount (${daysBeforeEvent} days before event)`;
          }
          break;
        }

        case 'seasonal': {
          const months = conditions.months || [];
          if (Array.isArray(months) && months.includes(eventMonth)) {
            matches = true;
            description = `Seasonal rule (month ${eventMonth})`;
          }
          break;
        }

        case 'repeat_client':
          // Skip in auto-compute — needs client context
          break;

        default:
          break;
      }

      if (!matches) continue;

      // Apply action
      const maxAdjPct = rule.max_adjustment_pct
        ? Number(rule.max_adjustment_pct)
        : DYNAMIC_PRICING_MAX_SURGE_PCT;
      const minFloor = rule.min_price_paise ? Number(rule.min_price_paise) : 0;
      let pctChange = 0;

      if (action.type === 'percentage_increase') {
        const value = Number(action.value);
        const cappedValue = Math.min(value, maxAdjPct);
        const multiplier = 1 + cappedValue / 100;
        adjustedMin = Math.round(adjustedMin * multiplier);
        adjustedMax = Math.round(adjustedMax * multiplier);
        pctChange = cappedValue;
      } else if (action.type === 'percentage_decrease') {
        const value = Number(action.value);
        const cappedValue = Math.min(value, maxAdjPct);
        const multiplier = 1 - cappedValue / 100;
        adjustedMin = Math.round(adjustedMin * multiplier);
        adjustedMax = Math.round(adjustedMax * multiplier);
        pctChange = -cappedValue;
      } else if (action.type === 'fixed_increase_paise') {
        const value = Number(action.value);
        adjustedMin += value;
        adjustedMax += value;
        pctChange = baseMin > 0 ? Math.round((value / baseMin) * 100) : 0;
      }

      // Enforce floor
      if (minFloor > 0) {
        adjustedMin = Math.max(adjustedMin, minFloor);
        adjustedMax = Math.max(adjustedMax, adjustedMin);
      }

      // Cap total adjustment relative to base
      const totalSurgePct = baseMin > 0
        ? Math.round(((adjustedMin - baseMin) / baseMin) * 100)
        : 0;
      if (totalSurgePct > DYNAMIC_PRICING_MAX_SURGE_PCT) {
        const capMultiplier = 1 + DYNAMIC_PRICING_MAX_SURGE_PCT / 100;
        adjustedMin = Math.round(baseMin * capMultiplier);
        adjustedMax = Math.round(baseMax * capMultiplier);
      }

      adjustmentsApplied.push({ rule_type: rule.rule_type, description, pct_change: pctChange });
    }

    // 6. Get fair price from price_intelligence_v2
    const genre = artist.genres?.[0] || null;
    let fairPriceMin: number | null = null;
    let fairPriceMax: number | null = null;

    if (genre) {
      const marketData = await db('price_intelligence_v2')
        .where({
          event_type: eventType,
          event_city: city,
          primary_genre: genre,
        })
        .first();

      if (marketData) {
        fairPriceMin = marketData.p25_paise ? Number(marketData.p25_paise) : null;
        fairPriceMax = marketData.p75_paise ? Number(marketData.p75_paise) : null;
      }
    }

    // 7. Build result
    const result: DynamicPriceResult = {
      base_min_paise: baseMin,
      base_max_paise: baseMax,
      adjusted_min_paise: adjustedMin,
      adjusted_max_paise: adjustedMax,
      fair_price_min_paise: fairPriceMin,
      fair_price_max_paise: fairPriceMax,
      demand_level: demandLevel,
      adjustments_applied: adjustmentsApplied,
    };

    // 8. Cache the result (expires in 6 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 6);

    await dynamicPricingRepository.upsertPriceCache({
      artist_id: artistId,
      event_type: eventType,
      city,
      event_date: eventDate,
      base_min_paise: baseMin,
      base_max_paise: baseMax,
      adjusted_min_paise: adjustedMin,
      adjusted_max_paise: adjustedMax,
      demand_level: demandLevel,
      adjustments_applied: adjustmentsApplied,
      expires_at: expiresAt,
    });

    // 9. Return result
    return result;
  }

  // ─── Surge Indicator ────────────────────────────────────────

  async getSurgeIndicator(
    city: string,
    eventDate: string,
    eventType?: string,
  ): Promise<SurgeIndicator> {
    let query = db('demand_signals')
      .where({ city })
      .where('signal_date', eventDate);

    if (eventType) {
      query = query.where('event_type', eventType);
    }

    const signal = await query.first();

    const demandLevel = signal?.demand_level || 'low';

    return {
      city,
      event_date: eventDate,
      event_type: eventType || null,
      demand_level: demandLevel,
      indicator_text: SURGE_INDICATOR_TEXT[demandLevel] || SURGE_INDICATOR_TEXT.low,
    };
  }

  // ─── Booking Outcome Recording ──────────────────────────────

  async recordBookingOutcome(bookingId: string): Promise<void> {
    const booking = await db('bookings').where({ id: bookingId }).first();
    if (!booking) return;

    // Map booking state to outcome
    let outcome: string;
    const terminalBooked = ['confirmed', 'pre_event', 'event_day', 'completed', 'settled'];
    if (terminalBooked.includes(booking.state)) {
      outcome = 'booked';
    } else if (booking.state === 'cancelled') {
      outcome = 'declined';
    } else if (booking.state === 'expired') {
      outcome = 'expired';
    } else {
      return; // Non-terminal state, skip
    }

    // Check if surge was applied via cache
    const cached = await dynamicPricingRepository.getCachedPrice(
      booking.artist_id,
      booking.event_type,
      booking.event_city,
      booking.event_date ? new Date(booking.event_date).toISOString().split('T')[0] : '',
    );

    const basePrice = cached ? Number(cached.base_min_paise) : 0;
    const quotedPrice = Number(booking.final_amount_paise || booking.agreed_amount || 0);
    const surgePct = basePrice > 0
      ? Math.round(((quotedPrice - basePrice) / basePrice) * 100)
      : 0;

    await dynamicPricingRepository.logElasticity({
      artist_id: booking.artist_id,
      booking_id: bookingId,
      event_type: booking.event_type,
      city: booking.event_city,
      event_date: booking.event_date
        ? new Date(booking.event_date).toISOString().split('T')[0]
        : '',
      base_price_paise: basePrice,
      quoted_price_paise: quotedPrice,
      surge_pct: Math.max(surgePct, 0),
      demand_level: cached?.demand_level || 'moderate',
      outcome,
    });
  }

  // ─── Elasticity Report ──────────────────────────────────────

  async computeElasticityReport(artistId: string): Promise<ElasticityReport> {
    const data = await dynamicPricingRepository.getElasticityData(artistId);

    // Group by demand level
    const byDemandMap = new Map<string, { total: number; booked: number }>();
    // Group by surge bucket
    const bySurgeMap = new Map<string, { total: number; booked: number }>();

    for (const entry of data) {
      const level = entry.demand_level || 'moderate';
      const bucket = classifySurgeBucket(Number(entry.surge_pct));
      const isBooked = entry.outcome === 'booked';

      // Demand level grouping
      if (!byDemandMap.has(level)) {
        byDemandMap.set(level, { total: 0, booked: 0 });
      }
      const demandGroup = byDemandMap.get(level)!;
      demandGroup.total++;
      if (isBooked) demandGroup.booked++;

      // Surge bucket grouping
      if (!bySurgeMap.has(bucket)) {
        bySurgeMap.set(bucket, { total: 0, booked: 0 });
      }
      const surgeGroup = bySurgeMap.get(bucket)!;
      surgeGroup.total++;
      if (isBooked) surgeGroup.booked++;
    }

    const byDemandLevel = Array.from(byDemandMap.entries()).map(([demand_level, stats]) => ({
      demand_level,
      total: stats.total,
      booked: stats.booked,
      conversion_rate: stats.total > 0 ? Math.round((stats.booked / stats.total) * 100) / 100 : 0,
    }));

    const bySurgeBucket = Array.from(bySurgeMap.entries()).map(([bucket, stats]) => ({
      bucket,
      total: stats.total,
      booked: stats.booked,
      conversion_rate: stats.total > 0 ? Math.round((stats.booked / stats.total) * 100) / 100 : 0,
    }));

    return { by_demand_level: byDemandLevel, by_surge_bucket: bySurgeBucket };
  }

  // ─── Artist Rule Management ─────────────────────────────────

  async getArtistRules(userId: string) {
    const profile = await db('artist_profiles').where({ user_id: userId }).first();
    if (!profile) return [];
    return dynamicPricingRepository.getAllRules(profile.id);
  }

  async createRule(userId: string, data: Record<string, unknown>) {
    const profile = await db('artist_profiles').where({ user_id: userId }).first();
    if (!profile) {
      throw new Error('Artist profile not found');
    }
    return dynamicPricingRepository.createRule({
      artist_id: profile.id,
      rule_type: data.rule_type as string,
      conditions: data.conditions as Record<string, unknown>,
      action: data.action as Record<string, unknown>,
      max_adjustment_pct: data.max_adjustment_pct as number | undefined,
      min_price_paise: data.min_price_paise as number | undefined,
      event_types: data.event_types as string[] | undefined,
      cities: data.cities as string[] | undefined,
    });
  }

  async updateRule(userId: string, ruleId: string, data: Record<string, unknown>) {
    const profile = await db('artist_profiles').where({ user_id: userId }).first();
    if (!profile) {
      throw new Error('Artist profile not found');
    }
    const rule = await dynamicPricingRepository.getRuleById(ruleId);
    if (!rule || rule.artist_id !== profile.id) {
      throw new Error('Rule not found or does not belong to this artist');
    }
    return dynamicPricingRepository.updateRule(ruleId, data);
  }

  async deleteRule(userId: string, ruleId: string) {
    const profile = await db('artist_profiles').where({ user_id: userId }).first();
    if (!profile) {
      throw new Error('Artist profile not found');
    }
    const rule = await dynamicPricingRepository.getRuleById(ruleId);
    if (!rule || rule.artist_id !== profile.id) {
      throw new Error('Rule not found or does not belong to this artist');
    }
    return dynamicPricingRepository.deleteRule(ruleId);
  }

  // ─── Public Dynamic Price Accessor ──────────────────────────

  async getDynamicPrice(
    artistId: string,
    eventType: string,
    city: string,
    eventDate: string,
  ): Promise<DynamicPriceResult> {
    return this.computeDynamicPrice(artistId, eventType, city, eventDate);
  }

  // ─── Batch Computation (Cron) ───────────────────────────────

  async batchComputeDynamicPrices(): Promise<number> {
    const artistIds = await dynamicPricingRepository.getArtistsWithActiveRules();
    let count = 0;

    for (const artistId of artistIds) {
      try {
        const artist = await db('artist_profiles').where({ id: artistId }).first();
        if (!artist) continue;

        const pricingEntries = (artist.pricing || []) as Record<string, unknown>[];
        if (pricingEntries.length === 0) continue;

        // Collect unique event_types and cities from pricing entries
        const eventTypes: string[] = [
          ...new Set(pricingEntries.map((p) => String(p.event_type))),
        ];

        // Get cities from artist's completed bookings
        const cityRows = await db('bookings')
          .where({ artist_id: artistId })
          .whereIn('state', ['completed', 'settled', 'confirmed'])
          .distinct('event_city')
          .select('event_city');
        const cities = cityRows.map((r: Record<string, unknown>) => r.event_city as string).filter(Boolean);

        if (cities.length === 0) continue;

        // Compute for next DYNAMIC_PRICE_LOOKAHEAD_DAYS days
        const today = new Date();
        for (let dayOffset = 0; dayOffset < DYNAMIC_PRICE_LOOKAHEAD_DAYS; dayOffset++) {
          const targetDate = new Date(today);
          targetDate.setDate(targetDate.getDate() + dayOffset);
          const dateStr = targetDate.toISOString().split('T')[0];

          for (const eventType of eventTypes) {
            for (const cityName of cities) {
              try {
                await this.computeDynamicPrice(artistId as string, eventType, cityName, dateStr);
                count++;
              } catch (err) {
                console.error(
                  `[DYNAMIC_PRICING] Failed to compute price for artist=${artistId} type=${eventType} city=${cityName} date=${dateStr}:`,
                  err,
                );
              }
            }
          }
        }
      } catch (err) {
        console.error(`[DYNAMIC_PRICING] Failed batch for artist=${artistId}:`, err);
      }
    }

    // Clean expired cache entries
    const cleaned = await dynamicPricingRepository.cleanExpiredCache();
    console.log(`[DYNAMIC_PRICING] Batch complete: ${count} prices computed, ${cleaned} expired cache entries cleaned`);

    return count;
  }
}

export const dynamicPricingService = new DynamicPricingService();
