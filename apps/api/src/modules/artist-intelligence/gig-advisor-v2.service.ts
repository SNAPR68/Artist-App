import { db } from '../../infrastructure/database.js';
import { GIG_TRAVEL_COST_TIERS_PAISE, GIG_ADVISOR_MAX_CONCURRENT } from '@artist-booking/shared';

/**
 * CRITICAL DESIGN CONSTRAINT:
 * Never expose decline signals to artists.
 * Frame everything as opportunity — positive language only.
 */

// ─── Types ───────────────────────────────────────────────────

interface GigExpectedValue {
  booking_id: string;
  event_type: string;
  event_city: string;
  event_date: string;
  client_name: string | null;
  amount_paise: number;
  travel_cost_paise: number;
  net_revenue_paise: number;
  conversion_probability: number;
  expected_value_paise: number;
  career_value_bonus: number;
  client_quality_score: number;
  final_expected_value_paise: number;
  recommendation: 'accept' | 'hold' | null;
  reasoning: string;
}

interface GigAdvisorV2Recommendation {
  inquiries: GigExpectedValue[];
  summary: string;
}

// ─── Major City Distance Lookup ──────────────────────────────

type DistanceTier = 'SAME_CITY' | 'UNDER_200KM' | 'UNDER_500KM' | 'OVER_500KM';

/**
 * Simple lookup for major Indian city pairs.
 * Key format: sorted alphabetically, joined with '|'.
 * Value: distance tier.
 */
const CITY_DISTANCE_LOOKUP: Record<string, DistanceTier> = {
  // Same-region / nearby pairs (UNDER_200KM)
  'mumbai|pune': 'UNDER_200KM',
  'delhi|noida': 'UNDER_200KM',
  'delhi|gurgaon': 'UNDER_200KM',
  'delhi|gurugram': 'UNDER_200KM',
  'delhi|faridabad': 'UNDER_200KM',
  'bangalore|mysore': 'UNDER_200KM',
  'bangalore|mysuru': 'UNDER_200KM',
  'chennai|pondicherry': 'UNDER_200KM',
  'chennai|puducherry': 'UNDER_200KM',
  'kolkata|howrah': 'UNDER_200KM',
  'ahmedabad|gandhinagar': 'UNDER_200KM',
  'hyderabad|secunderabad': 'UNDER_200KM',
  'chandigarh|mohali': 'UNDER_200KM',
  'jaipur|ajmer': 'UNDER_200KM',

  // Medium-distance pairs (UNDER_500KM)
  'mumbai|ahmedabad': 'UNDER_500KM',
  'mumbai|goa': 'UNDER_500KM',
  'mumbai|nashik': 'UNDER_200KM',
  'mumbai|surat': 'UNDER_500KM',
  'delhi|jaipur': 'UNDER_500KM',
  'delhi|chandigarh': 'UNDER_500KM',
  'delhi|agra': 'UNDER_200KM',
  'delhi|lucknow': 'UNDER_500KM',
  'bangalore|chennai': 'UNDER_500KM',
  'bangalore|hyderabad': 'UNDER_500KM',
  'kolkata|bhubaneswar': 'UNDER_500KM',
  'pune|goa': 'UNDER_500KM',
  'hyderabad|chennai': 'UNDER_500KM',
  'ahmedabad|surat': 'UNDER_500KM',
  'jaipur|udaipur': 'UNDER_500KM',
  'lucknow|varanasi': 'UNDER_500KM',

  // Long-distance pairs (OVER_500KM)
  'delhi|mumbai': 'OVER_500KM',
  'delhi|bangalore': 'OVER_500KM',
  'delhi|chennai': 'OVER_500KM',
  'delhi|kolkata': 'OVER_500KM',
  'delhi|hyderabad': 'OVER_500KM',
  'delhi|goa': 'OVER_500KM',
  'mumbai|kolkata': 'OVER_500KM',
  'mumbai|delhi': 'OVER_500KM',
  'mumbai|bangalore': 'OVER_500KM',
  'mumbai|chennai': 'OVER_500KM',
  'bangalore|kolkata': 'OVER_500KM',
  'bangalore|delhi': 'OVER_500KM',
  'chennai|kolkata': 'OVER_500KM',
  'chennai|delhi': 'OVER_500KM',
  'hyderabad|kolkata': 'OVER_500KM',
  'hyderabad|delhi': 'OVER_500KM',
  'kolkata|mumbai': 'OVER_500KM',
};

// ─── State/Region groupings for fallback distance estimation ─

const REGION_MAP: Record<string, string> = {
  // North
  delhi: 'north', noida: 'north', gurgaon: 'north', gurugram: 'north',
  faridabad: 'north', chandigarh: 'north', mohali: 'north',
  lucknow: 'north', varanasi: 'north', agra: 'north',
  jaipur: 'north', udaipur: 'north', jodhpur: 'north', ajmer: 'north',
  // West
  mumbai: 'west', pune: 'west', nashik: 'west', goa: 'west',
  ahmedabad: 'west', surat: 'west', gandhinagar: 'west', vadodara: 'west',
  // South
  bangalore: 'south', bengaluru: 'south', chennai: 'south',
  hyderabad: 'south', secunderabad: 'south',
  mysore: 'south', mysuru: 'south', kochi: 'south', cochin: 'south',
  thiruvananthapuram: 'south', coimbatore: 'south',
  pondicherry: 'south', puducherry: 'south', visakhapatnam: 'south',
  // East
  kolkata: 'east', howrah: 'east', bhubaneswar: 'east',
  patna: 'east', ranchi: 'east', guwahati: 'east',
  // Central
  indore: 'central', bhopal: 'central', nagpur: 'central', raipur: 'central',
};

// ─── Service ─────────────────────────────────────────────────

export class GigAdvisorV2Service {

  // ─── Expected Value Calculation ────────────────────────────

  async analyzeInquiry(artistId: string, bookingId: string): Promise<GigExpectedValue> {
    // 1. Load booking and verify ownership + state
    const booking = await db('bookings')
      .where({ id: bookingId, artist_id: artistId })
      .whereIn('state', ['inquiry', 'quoted', 'negotiating'])
      .first();

    if (!booking) {
      throw new Error('Booking not found or not in an analyzable state');
    }

    // 2. Load artist profile
    const artist = await db('artist_profiles').where({ id: artistId }).first();
    if (!artist) {
      throw new Error('Artist profile not found');
    }

    // 3. Determine amount (paise)
    let amountPaise = Number(
      booking.final_amount_paise
      || booking.quoted_amount_paise
      || booking.agreed_amount
      || 0,
    );

    if (amountPaise === 0) {
      // Use midpoint of artist's pricing for this event_type
      const pricing = await db('artist_pricing')
        .where({ artist_id: artistId, event_type: booking.event_type })
        .first();

      if (pricing && pricing.min_price_paise && pricing.max_price_paise) {
        amountPaise = Math.round(
          (Number(pricing.min_price_paise) + Number(pricing.max_price_paise)) / 2,
        );
      } else {
        // Fallback: use artist's base price if available
        const anyPricing = await db('artist_pricing')
          .where({ artist_id: artistId })
          .first();
        if (anyPricing) {
          amountPaise = Math.round(
            (Number(anyPricing.min_price_paise || 0) + Number(anyPricing.max_price_paise || 0)) / 2,
          );
        }
      }
    }

    // 4. Estimate travel cost
    const travelCostPaise = this.estimateTravelCost(
      artist.base_city || '',
      booking.event_city || '',
    );

    // 5. Net revenue
    const netRevenuePaise = amountPaise - travelCostPaise;

    // 6. Conversion probability
    const conversionProbability = await this.getConversionRate(artistId, booking.event_type);

    // 7. Expected value
    const expectedValuePaise = Math.round(conversionProbability * netRevenuePaise);

    // 8. Career value bonus (0 to 0.2)
    let careerValueBonus = 0;

    // Check if new city
    const careerMetrics = await db('career_metrics').where({ artist_id: artistId }).first();
    if (careerMetrics?.top_cities) {
      const topCities = typeof careerMetrics.top_cities === 'string'
        ? JSON.parse(careerMetrics.top_cities)
        : careerMetrics.top_cities;
      const knownCities = (topCities as Array<{ city: string }>).map(c => c.city?.toLowerCase());
      if (booking.event_city && !knownCities.includes(booking.event_city.toLowerCase())) {
        careerValueBonus += 0.1;
      }
    } else {
      // No career metrics = every city is new
      careerValueBonus += 0.1;
    }

    // Check if new event_type
    if (careerMetrics?.top_event_types) {
      const topTypes = typeof careerMetrics.top_event_types === 'string'
        ? JSON.parse(careerMetrics.top_event_types)
        : careerMetrics.top_event_types;
      const knownTypes = (topTypes as Array<{ event_type: string }>).map(e => e.event_type?.toLowerCase());
      if (booking.event_type && !knownTypes.includes(booking.event_type.toLowerCase())) {
        careerValueBonus += 0.05;
      }
    } else {
      careerValueBonus += 0.05;
    }

    // Check if client is high-profile (event_company with 10+ bookings)
    if (booking.client_id) {
      const [clientBookingCount]: any[] = await db('bookings')
        .where('client_id', booking.client_id)
        .whereIn('state', ['completed', 'settled'])
        .count('* as count');
      if (Number(clientBookingCount.count) >= 10) {
        careerValueBonus += 0.05;
      }
    }

    // 9. Client quality score (0-1)
    const clientQualityScore = booking.client_id
      ? await this.getClientQualityScore(booking.client_id)
      : 0.5;

    // 10. Final EV = expected_value * (1 + career_value_bonus)
    const finalExpectedValuePaise = Math.round(expectedValuePaise * (1 + careerValueBonus));

    // 11. Generate reasoning (opportunity-framed)
    const probabilityPct = Math.round(conversionProbability * 100);
    const netDisplay = Math.round(netRevenuePaise / 100);
    let reasoning = `This ${booking.event_type || 'gig'} in ${booking.event_city || 'the requested city'} has strong potential — ${probabilityPct}% likelihood of booking, netting approximately ₹${netDisplay.toLocaleString('en-IN')}.`;

    if (careerValueBonus >= 0.1) {
      const isNewCity = careerValueBonus >= 0.1;
      if (isNewCity && booking.event_city) {
        reasoning += ` Plus, this would be your first gig in ${booking.event_city} — great for expanding your reach!`;
      }
    }

    if (clientQualityScore >= 0.7) {
      reasoning += ' The client has an excellent track record with artists.';
    }

    // Load client name for display
    let clientName: string | null = null;
    if (booking.client_id) {
      const client = await db('users').where({ id: booking.client_id }).first();
      clientName = client?.full_name || null;
    }

    return {
      booking_id: bookingId,
      event_type: booking.event_type || '',
      event_city: booking.event_city || '',
      event_date: booking.event_date || '',
      client_name: clientName,
      amount_paise: amountPaise,
      travel_cost_paise: travelCostPaise,
      net_revenue_paise: netRevenuePaise,
      conversion_probability: Math.round(conversionProbability * 100) / 100,
      expected_value_paise: expectedValuePaise,
      career_value_bonus: Math.round(careerValueBonus * 100) / 100,
      client_quality_score: Math.round(clientQualityScore * 100) / 100,
      final_expected_value_paise: finalExpectedValuePaise,
      recommendation: null, // Set by compareInquiries
      reasoning,
    };
  }

  // ─── Comparison Matrix ─────────────────────────────────────

  async compareInquiries(
    artistId: string,
    bookingIds?: string[],
  ): Promise<GigAdvisorV2Recommendation> {
    // 1. Determine which bookings to compare
    let ids = bookingIds;

    if (!ids || ids.length === 0) {
      const activeInquiries = await db('bookings')
        .where({ artist_id: artistId })
        .whereIn('state', ['inquiry', 'quoted', 'negotiating'])
        .orderBy('created_at', 'desc')
        .limit(GIG_ADVISOR_MAX_CONCURRENT)
        .select('id');

      ids = activeInquiries.map((b: { id: string }) => b.id);
    }

    if (ids.length === 0) {
      return {
        inquiries: [],
        summary: 'You have no active inquiries at the moment. When new opportunities come in, we\'ll help you evaluate them!',
      };
    }

    // 2. Analyze each inquiry
    const inquiries: GigExpectedValue[] = [];
    for (const id of ids) {
      try {
        const analysis = await this.analyzeInquiry(artistId, id);
        inquiries.push(analysis);
      } catch {
        // Skip bookings that can't be analyzed (wrong state, etc.)
        continue;
      }
    }

    if (inquiries.length === 0) {
      return {
        inquiries: [],
        summary: 'No analyzable inquiries found. We\'ll be ready when new opportunities arrive!',
      };
    }

    // 3. Sort by final_expected_value descending
    inquiries.sort((a, b) => b.final_expected_value_paise - a.final_expected_value_paise);

    // 4. Assign recommendations — opportunity-framed, never "decline"
    const topEV = inquiries[0].final_expected_value_paise;

    if (inquiries.length === 1) {
      inquiries[0].recommendation = inquiries[0].final_expected_value_paise > 0 ? 'accept' : 'hold';
    } else {
      for (let i = 0; i < inquiries.length; i++) {
        if (i === 0) {
          inquiries[i].recommendation = 'accept';
        } else if (topEV > 0 && inquiries[i].final_expected_value_paise < topEV * 0.3) {
          // Low EV relative to top — frame as hold, not decline
          inquiries[i].recommendation = 'hold';
        } else {
          inquiries[i].recommendation = 'hold';
        }
      }
    }

    // 5. Store comparison
    try {
      await db('gig_comparisons').insert({
        artist_id: artistId,
        booking_ids: JSON.stringify(ids),
        comparison_result: JSON.stringify(inquiries),
        created_at: new Date().toISOString(),
      });
    } catch {
      // Non-critical — log and continue if table doesn't exist yet
      console.warn('[GIG_ADVISOR_V2] Could not store comparison — table may not exist yet');
    }

    // 6. Generate summary — always positive framing
    const top = inquiries[0];
    const topEvDisplay = Math.round(top.final_expected_value_paise / 100);
    let summary: string;

    if (inquiries.length === 1) {
      summary = `You have 1 active inquiry. The ${top.event_type || 'gig'} in ${top.event_city || 'the requested city'} has an expected value of ₹${topEvDisplay.toLocaleString('en-IN')}. ${top.recommendation === 'accept' ? 'This looks like a great opportunity!' : 'Consider reviewing the details before deciding.'}`;
    } else {
      summary = `You have ${inquiries.length} active inquiries. The ${top.event_type || 'gig'} in ${top.event_city || 'the requested city'} offers the highest expected value at ₹${topEvDisplay.toLocaleString('en-IN')}. We recommend prioritizing it and holding the others while you decide.`;
    }

    return { inquiries, summary };
  }

  // ─── Helper: Travel Cost Estimation ────────────────────────

  estimateTravelCost(fromCity: string, toCity: string): number {
    const from = fromCity.toLowerCase().trim();
    const to = toCity.toLowerCase().trim();

    // Same city
    if (from === to) {
      return GIG_TRAVEL_COST_TIERS_PAISE.SAME_CITY;
    }

    // Check direct lookup (sorted key)
    const pair = [from, to].sort().join('|');
    const directTier = CITY_DISTANCE_LOOKUP[pair];
    if (directTier) {
      return GIG_TRAVEL_COST_TIERS_PAISE[directTier];
    }

    // Also check unsorted (some entries are deliberately duplicated for long-distance)
    const unsortedPair = `${from}|${to}`;
    const unsortedTier = CITY_DISTANCE_LOOKUP[unsortedPair];
    if (unsortedTier) {
      return GIG_TRAVEL_COST_TIERS_PAISE[unsortedTier];
    }

    // Region-based fallback
    const fromRegion = REGION_MAP[from];
    const toRegion = REGION_MAP[to];

    if (fromRegion && toRegion) {
      if (fromRegion === toRegion) {
        return GIG_TRAVEL_COST_TIERS_PAISE.UNDER_200KM;
      }
      // Adjacent regions
      const adjacentPairs = new Set([
        'north|west', 'west|north',
        'north|central', 'central|north',
        'west|central', 'central|west',
        'south|central', 'central|south',
        'east|central', 'central|east',
      ]);
      if (adjacentPairs.has(`${fromRegion}|${toRegion}`)) {
        return GIG_TRAVEL_COST_TIERS_PAISE.UNDER_500KM;
      }
      // Distant regions
      return GIG_TRAVEL_COST_TIERS_PAISE.OVER_500KM;
    }

    // Default for unknown cities
    return GIG_TRAVEL_COST_TIERS_PAISE.UNDER_500KM;
  }

  // ─── Helper: Conversion Rate ───────────────────────────────

  async getConversionRate(artistId: string, eventType: string | null): Promise<number> {
    if (!eventType) return 0.5;

    const [stats]: any[] = await db('bookings')
      .where({ artist_id: artistId, event_type: eventType })
      .select(
        db.raw('COUNT(*)::int as total_count'),
        db.raw("COUNT(*) FILTER (WHERE state IN ('completed', 'settled'))::int as completed_count"),
      );

    const total = Number(stats?.total_count || 0);
    const completed = Number(stats?.completed_count || 0);

    if (total === 0) return 0.5; // No history, default

    const rate = completed / total;
    // Clamp to 0.1 - 0.9
    return Math.min(0.9, Math.max(0.1, Math.round(rate * 100) / 100));
  }

  // ─── Helper: Client Quality Score ──────────────────────────

  async getClientQualityScore(clientId: string): Promise<number> {
    // Get the user_id for the client
    const client = await db('users').where({ id: clientId }).first();
    if (!client) return 0.5;

    // Reviews where reviewer_role='artist' and reviewee is the client
    const reviewStats: any = await db('reviews')
      .where({ reviewee_id: clientId, reviewer_role: 'artist' })
      .select(
        db.raw('AVG(overall_rating) as avg_rating'),
        db.raw('COUNT(*)::int as review_count'),
      )
      .first();

    if (!reviewStats || Number(reviewStats.review_count) === 0) {
      return 0.5; // No reviews, default
    }

    // Normalize: avg_rating is 1-5, convert to 0-1
    const avgRating = Number(reviewStats.avg_rating || 0);
    return Math.min(1, Math.max(0, Math.round(((avgRating - 1) / 4) * 100) / 100));
  }
}

export const gigAdvisorV2Service = new GigAdvisorV2Service();
