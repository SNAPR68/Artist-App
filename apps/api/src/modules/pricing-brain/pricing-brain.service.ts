import { pricingBrainRepository } from './pricing-brain.repository.js';
import { db } from '../../infrastructure/database.js';
import { PRICING_TIER_PERCENTILES } from '@artist-booking/shared';

function determineTier(percentile: number): string {
  if (percentile >= PRICING_TIER_PERCENTILES.LUXURY.min) return 'luxury';
  if (percentile >= PRICING_TIER_PERCENTILES.PREMIUM.min) return 'premium';
  if (percentile >= PRICING_TIER_PERCENTILES.MID_RANGE.min) return 'mid_range';
  return 'budget';
}

export class PricingBrainService {
  /**
   * Compute market position for a single artist across all their segments.
   */
  async computeMarketPosition(artistId: string): Promise<number> {
    // Get artist's completed bookings grouped by segment
    const artistSegments = await db('bookings as b')
      .join('artist_profiles as ap', 'ap.id', 'b.artist_id')
      .where('b.artist_id', artistId)
      .whereIn('b.state', ['completed', 'settled'])
      .whereNotNull('b.final_amount_paise')
      .select(
        'b.event_type',
        'b.event_city as city',
        db.raw('ap.genres[1] as genre'),
        db.raw('AVG(b.final_amount_paise)::bigint as artist_avg_paise'),
        db.raw('COUNT(*)::int as sample_size'),
      )
      .groupBy('b.event_type', 'b.event_city', db.raw('ap.genres[1]'));

    let count = 0;
    for (const seg of artistSegments) {
      // Get market data for this segment from price_intelligence_v2
      const market = await db('price_intelligence_v2')
        .where({
          event_type: seg.event_type,
          event_city: seg.city,
          primary_genre: seg.genre,
        })
        .first();

      if (!market || Number(market.sample_size) < 3) continue;

      // Compute percentile rank: what % of the market is this artist above
      const allPrices = await db('bookings')
        .where('event_type', seg.event_type)
        .where('event_city', seg.city)
        .whereIn('state', ['completed', 'settled'])
        .whereNotNull('final_amount_paise')
        .select('final_amount_paise')
        .orderBy('final_amount_paise');

      const artistAvg = Number(seg.artist_avg_paise);
      const belowCount = allPrices.filter((p: Record<string, unknown>) =>
        Number(p.final_amount_paise) <= artistAvg,
      ).length;
      const percentile = allPrices.length > 0
        ? Math.round((belowCount / allPrices.length) * 100)
        : 50;

      const marketMedian = Number(market.median_paise);
      const priceVsMarket = marketMedian > 0
        ? Math.round(((artistAvg - marketMedian) / marketMedian) * 100)
        : 0;

      await pricingBrainRepository.upsertMarketPosition({
        artist_id: artistId,
        genre: seg.genre,
        city: seg.city,
        event_type: seg.event_type,
        pricing_tier: determineTier(percentile),
        percentile_rank: percentile,
        market_median_paise: marketMedian,
        artist_avg_paise: artistAvg,
        price_vs_market_pct: priceVsMarket,
        sample_size: Number(seg.sample_size),
        market_sample_size: Number(market.sample_size),
      });
      count++;
    }

    return count;
  }

  /**
   * Generate pricing recommendations for a single artist.
   */
  async generatePricingRecommendations(artistId: string): Promise<number> {
    const positions = await pricingBrainRepository.getPositions(artistId);
    const artist = await db('artist_profiles').where({ id: artistId }).first();
    if (!artist) return 0;

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    let count = 0;
    for (const pos of positions) {
      const percentile = Number(pos.percentile_rank);
      const priceVsMarket = Number(pos.price_vs_market_pct);

      // Get current pricing from artist's pricing matrix
      const currentPricing = (artist.pricing || []).find(
        (p: Record<string, unknown>) => p.event_type === pos.event_type,
      );
      if (!currentPricing) continue;

      const currentMin = Number(currentPricing.min_price);
      const currentMax = Number(currentPricing.max_price);
      const marketMedian = Number(pos.market_median_paise);

      let rationale = '';
      let recommendedMin = currentMin;
      let recommendedMax = currentMax;
      let confidence = 0.5;

      // Underpriced: below p25 but high trust
      if (percentile < 25 && Number(artist.trust_score) >= 70) {
        const bump = Math.round(marketMedian * 0.15);
        recommendedMin = currentMin + bump;
        recommendedMax = currentMax + bump;
        rationale = `You're priced in the bottom 25% for ${pos.event_type} in ${pos.city}, but your trust score (${artist.trust_score}) is strong. Consider raising your rates by ~15%.`;
        confidence = Math.min(Number(pos.sample_size) / 10, 0.9);
      }
      // Overpriced: above p75 with low booking rate
      else if (percentile > 75 && Number(artist.acceptance_rate) < 50) {
        const reduction = Math.round(marketMedian * 0.10);
        recommendedMin = Math.max(currentMin - reduction, marketMedian);
        recommendedMax = Math.max(currentMax - reduction, currentMin);
        rationale = `Your pricing is in the top 25% for ${pos.event_type} in ${pos.city}, but your booking acceptance rate (${artist.acceptance_rate}%) suggests demand may be lower. A ~10% adjustment could increase bookings.`;
        confidence = Math.min(Number(pos.sample_size) / 10, 0.85);
      }
      else {
        continue; // No recommendation needed
      }

      await pricingBrainRepository.createRecommendation({
        artist_id: artistId,
        event_type: pos.event_type,
        city: pos.city,
        recommended_min_paise: recommendedMin,
        recommended_max_paise: recommendedMax,
        current_min_paise: currentMin,
        current_max_paise: currentMax,
        rationale,
        factors: JSON.stringify({
          percentile_rank: percentile,
          price_vs_market_pct: priceVsMarket,
          trust_score: Number(artist.trust_score),
          acceptance_rate: Number(artist.acceptance_rate),
        }),
        confidence,
        expires_at: thirtyDaysFromNow,
      });
      count++;
    }

    return count;
  }

  /**
   * Batch compute all artists' market positions. Run as cron.
   */
  async batchComputePositions(): Promise<number> {
    // Refresh the materialized view first
    try {
      await db.raw('REFRESH MATERIALIZED VIEW CONCURRENTLY price_intelligence_v2');
    } catch {
      await db.raw('REFRESH MATERIALIZED VIEW price_intelligence_v2');
    }

    const artists = await db('artist_profiles')
      .select('id')
      .where('deleted_at', null);

    let total = 0;
    for (const artist of artists) {
      try {
        total += await this.computeMarketPosition(artist.id);
      } catch (err) {
        console.error(`[PRICING_BRAIN] Failed to compute position for ${artist.id}:`, err);
      }
    }

    return total;
  }

  /**
   * Batch generate recommendations. Run as cron after positions.
   */
  async batchGenerateRecommendations(): Promise<number> {
    // Clean expired first
    await pricingBrainRepository.cleanExpiredRecommendations();

    const artists = await db('artist_profiles')
      .select('id')
      .where('deleted_at', null);

    let total = 0;
    for (const artist of artists) {
      try {
        total += await this.generatePricingRecommendations(artist.id);
      } catch (err) {
        console.error(`[PRICING_BRAIN] Failed to generate recs for ${artist.id}:`, err);
      }
    }

    return total;
  }

  /**
   * Get artist's pricing dashboard.
   */
  async getArtistDashboard(userId: string) {
    const profile = await db('artist_profiles').where({ user_id: userId }).first();
    if (!profile) return null;

    const positions = await pricingBrainRepository.getPositions(profile.id);
    const recommendations = await pricingBrainRepository.getActiveRecommendations(profile.id);

    return {
      artist_id: profile.id,
      positions,
      recommendations,
      summary: {
        total_segments: positions.length,
        avg_percentile: positions.length > 0
          ? Math.round(positions.reduce((sum: number, p: Record<string, unknown>) => sum + Number(p.percentile_rank), 0) / positions.length)
          : null,
        active_recommendations: recommendations.length,
      },
    };
  }

  async getPositionDetails(userId: string, filters?: { event_type?: string; city?: string; genre?: string }) {
    const profile = await db('artist_profiles').where({ user_id: userId }).first();
    if (!profile) return [];
    return pricingBrainRepository.getPositions(profile.id, filters);
  }

  async getRecommendations(userId: string) {
    const profile = await db('artist_profiles').where({ user_id: userId }).first();
    if (!profile) return [];
    return pricingBrainRepository.getActiveRecommendations(profile.id);
  }

  async dismissRecommendation(userId: string, recommendationId: string) {
    const profile = await db('artist_profiles').where({ user_id: userId }).first();
    if (!profile) return null;
    return pricingBrainRepository.dismissRecommendation(recommendationId, profile.id);
  }
}

export const pricingBrainService = new PricingBrainService();
