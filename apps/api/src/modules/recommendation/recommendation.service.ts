import {
  RECOMMENDATION_WEIGHTS,
  RECOMMENDATION_EXPIRY_DAYS,
  RISING_STAR_MAX_BOOKINGS,
  RISING_STAR_MIN_TRUST,
} from '@artist-booking/shared';
import { db } from '../../infrastructure/database.js';
import { recommendationRepository } from './recommendation.repository.js';

// ─── Helpers ──────────────────────────────────────────────────

function jaccard(a: string[], b: string[]): number {
  if (!a || !b || a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function avgPrice(pricing: unknown): number {
  if (!Array.isArray(pricing)) return 0;
  const prices = pricing
    .map((p: Record<string, unknown>) => Number(p.base_price_paise ?? p.price ?? 0))
    .filter((p) => p > 0);
  if (prices.length === 0) return 0;
  return prices.reduce((sum, p) => sum + p, 0) / prices.length;
}

function parsePricing(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
}

function expiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + RECOMMENDATION_EXPIRY_DAYS);
  return d;
}

function crowdEnergyScore(energy: string): number {
  switch (energy) {
    case 'electric': return 1.0;
    case 'high': return 0.75;
    case 'moderate': return 0.5;
    case 'low': return 0.25;
    default: return 0.5;
  }
}

// ─── Service ──────────────────────────────────────────────────

export class RecommendationService {
  /**
   * Compute similar artist recommendations for a given artist.
   */
  async computeSimilarArtists(artistId: string): Promise<number> {
    const sourceArtist = await db('artist_profiles')
      .where({ id: artistId, deleted_at: null })
      .first();

    if (!sourceArtist) {
      throw new RecommendationError('ARTIST_NOT_FOUND', 'Source artist not found', 404);
    }

    const candidates = await db('artist_profiles')
      .where('deleted_at', null)
      .whereNot('id', artistId)
      .orderBy('trust_score', 'desc')
      .limit(200);

    const sourcePricing = parsePricing(sourceArtist.pricing);
    const sourceAvgPrice = avgPrice(sourcePricing);
    const sourceGenres: string[] = sourceArtist.genres ?? [];
    const sourceEventTypes: string[] = sourceArtist.event_types ?? [];

    // Fetch vibe tags for source artist
    const sourceVibes = await db('event_context_data')
      .where('artist_id', artistId)
      .select('vibe_tags');
    const sourceVibeTags: string[] = sourceVibes.flatMap(
      (r: Record<string, unknown>) => (r.vibe_tags as string[]) ?? [],
    );

    const weights = RECOMMENDATION_WEIGHTS.SIMILAR_ARTIST;
    const scored: Array<{ artistId: string; score: number }> = [];

    for (const candidate of candidates) {
      const candidatePricing = parsePricing(candidate.pricing);
      const candidateAvgPrice = avgPrice(candidatePricing);
      const candidateGenres: string[] = candidate.genres ?? [];
      const candidateEventTypes: string[] = candidate.event_types ?? [];

      // Genre similarity
      const genreScore = jaccard(sourceGenres, candidateGenres);

      // Price fit
      const maxPrice = Math.max(candidateAvgPrice, sourceAvgPrice, 1);
      const priceFit = 1 - Math.abs(candidateAvgPrice - sourceAvgPrice) / maxPrice;

      // Event type similarity
      const eventTypeScore = jaccard(sourceEventTypes, candidateEventTypes);

      // Vibe similarity
      let vibeScore = 0.5;
      const candidateVibes = await db('event_context_data')
        .where('artist_id', candidate.id)
        .select('vibe_tags');
      const candidateVibeTags: string[] = candidateVibes.flatMap(
        (r: Record<string, unknown>) => (r.vibe_tags as string[]) ?? [],
      );
      if (sourceVibeTags.length > 0 && candidateVibeTags.length > 0) {
        vibeScore = jaccard(sourceVibeTags, candidateVibeTags);
      }

      // City match
      const cityScore = candidate.base_city === sourceArtist.base_city ? 1.0 : 0.3;

      const totalScore =
        weights.GENRE * genreScore +
        weights.PRICE_FIT * priceFit +
        weights.EVENT_TYPE * eventTypeScore +
        weights.VIBE * vibeScore +
        weights.CITY * cityScore;

      scored.push({ artistId: candidate.id, score: totalScore });
    }

    // Sort and take top 20
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 20);

    const expires = expiresAt();
    let count = 0;

    for (const entry of top) {
      await recommendationRepository.upsertScore({
        source_type: 'artist',
        source_id: artistId,
        target_artist_id: entry.artistId,
        recommendation_type: 'similar_artist',
        score: Math.round(entry.score * 1000) / 1000,
        context: { computed_from: artistId },
        expires_at: expires,
      });
      count++;
    }

    return count;
  }

  /**
   * Compute popular artist recommendations for a given event type and city.
   */
  async computePopularForEvent(eventType: string, city: string): Promise<number> {
    // Get artists who have completed bookings for this event_type in/near this city
    const artists = await db('bookings as b')
      .join('artist_profiles as ap', 'ap.id', 'b.artist_id')
      .where('b.event_type', eventType)
      .where('b.event_city', 'ilike', `%${city}%`)
      .where('b.state', 'completed')
      .where('ap.deleted_at', null)
      .groupBy('ap.id')
      .select(
        'ap.id',
        'ap.stage_name',
        'ap.trust_score',
        'ap.total_bookings',
        'ap.pricing',
        'ap.genres',
        'ap.base_city',
        'ap.rebook_rate',
        db.raw('count(b.id)::integer as bookings_for_type'),
      );

    // Get median price for rising star detection
    const allPrices = artists
      .map((a: Record<string, unknown>) => avgPrice(parsePricing(a.pricing)))
      .filter((p: number) => p > 0)
      .sort((a: number, b: number) => a - b);
    const medianPrice = allPrices.length > 0
      ? allPrices[Math.floor(allPrices.length / 2)]
      : 0;

    const weights = RECOMMENDATION_WEIGHTS.POPULAR_FOR_EVENT;
    const scored: Array<{ artistId: string; score: number; risingStar: boolean }> = [];

    for (const artist of artists) {
      const trustScore = Math.min((artist.trust_score ?? 0) / 5.0, 1.0);
      const bookingCount = Math.min((artist.bookings_for_type ?? 0) / 20, 1.0);

      // Get average review rating
      const reviewAvg = await db('reviews')
        .where('artist_id', artist.id)
        .avg('overall_rating as avg_rating')
        .first();
      const avgReview = Math.min(((reviewAvg?.avg_rating as number) ?? 0) / 5.0, 1.0);

      const priceFit = 1.0; // No budget filter in batch mode
      const rebookRate = Math.min(Number(artist.rebook_rate ?? 0), 1.0);

      const totalScore =
        weights.TRUST * trustScore +
        weights.BOOKING_COUNT * bookingCount +
        weights.AVG_REVIEW * avgReview +
        weights.PRICE_FIT * priceFit +
        weights.REBOOK * rebookRate;

      // Rising star detection
      const artistPrice = avgPrice(parsePricing(artist.pricing));
      const isRisingStar =
        (artist.trust_score ?? 0) >= RISING_STAR_MIN_TRUST &&
        (artist.total_bookings ?? 0) < RISING_STAR_MAX_BOOKINGS &&
        artistPrice < medianPrice;

      scored.push({ artistId: artist.id, score: totalScore, risingStar: isRisingStar });
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 20);

    const expires = expiresAt();
    let count = 0;

    for (const entry of top) {
      // Store as popular_for_event
      await recommendationRepository.upsertScore({
        source_type: 'event',
        source_id: `${eventType}:${city}`,
        target_artist_id: entry.artistId,
        recommendation_type: 'popular_for_event',
        score: Math.round(entry.score * 1000) / 1000,
        context: { event_type: eventType, city, rising_star: entry.risingStar },
        expires_at: expires,
      });
      count++;

      // Also store rising stars separately
      if (entry.risingStar) {
        await recommendationRepository.upsertScore({
          source_type: 'event',
          source_id: `${eventType}:${city}`,
          target_artist_id: entry.artistId,
          recommendation_type: 'rising_star',
          score: Math.round(entry.score * 1000) / 1000,
          context: { event_type: eventType, city, rising_star: true },
          expires_at: expires,
        });
      }
    }

    return count;
  }

  /**
   * Compute event/opportunity recommendations for an artist.
   */
  async computeEventsForArtist(artistId: string): Promise<number> {
    const artist = await db('artist_profiles')
      .where({ id: artistId, deleted_at: null })
      .first();

    if (!artist) {
      throw new RecommendationError('ARTIST_NOT_FOUND', 'Artist not found', 404);
    }

    const artistGenres: string[] = artist.genres ?? [];
    const artistPricing = parsePricing(artist.pricing);
    const artistAvgPrice = avgPrice(artistPricing);

    // Query demand signals for next 90 days with high/peak demand
    const lookAhead = new Date();
    lookAhead.setDate(lookAhead.getDate() + 90);

    const signals = await db('demand_signals')
      .where('demand_level', 'in', ['high', 'peak'])
      .where('signal_date', '>=', new Date())
      .where('signal_date', '<=', lookAhead)
      .limit(100);

    const weights = RECOMMENDATION_WEIGHTS.EVENTS_FOR_ARTIST;
    const scored: Array<{ signalId: string; score: number; context: Record<string, unknown> }> = [];

    for (const signal of signals) {
      // Demand score
      const demandScore = signal.demand_level === 'peak' ? 1.0 : 0.7;

      // Genre match
      const signalGenre = signal.genre as string | undefined;
      const genreMatch = signalGenre && artistGenres.includes(signalGenre) ? 1.0 : 0.3;

      // Crowd history — query past event context data for artist in this city/event_type
      let crowdScore = 0.5;
      const pastEvents = await db('event_context_data')
        .where('artist_id', artistId)
        .where(function () {
          if (signal.city) this.where('city', signal.city);
          if (signal.event_type) this.where('event_type', signal.event_type);
        })
        .select('crowd_energy');

      if (pastEvents.length > 0) {
        const totalEnergy = pastEvents.reduce(
          (sum: number, e: Record<string, unknown>) => sum + crowdEnergyScore(e.crowd_energy as string),
          0,
        );
        crowdScore = totalEnergy / pastEvents.length;
      }

      // Venue compatibility (default — would need specific venue data)
      const venueCompat = 0.5;

      // Price fit — check if artist pricing is within signal's typical range
      const typicalMin = Number(signal.typical_price_min ?? 0);
      const typicalMax = Number(signal.typical_price_max ?? Infinity);
      const priceScore = artistAvgPrice >= typicalMin && artistAvgPrice <= typicalMax ? 1.0 : 0.5;

      const totalScore =
        weights.DEMAND * demandScore +
        weights.GENRE_MATCH * genreMatch +
        weights.CROWD_HISTORY * crowdScore +
        weights.VENUE_COMPAT * venueCompat +
        weights.PRICE * priceScore;

      scored.push({
        signalId: signal.id,
        score: totalScore,
        context: {
          signal_date: signal.signal_date,
          demand_level: signal.demand_level,
          city: signal.city,
          event_type: signal.event_type,
          genre: signal.genre,
        },
      });
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 10);

    const expires = expiresAt();
    let count = 0;

    for (const entry of top) {
      await recommendationRepository.upsertScore({
        source_type: 'artist',
        source_id: artistId,
        target_artist_id: artistId,
        recommendation_type: 'events_for_artist',
        score: Math.round(entry.score * 1000) / 1000,
        context: entry.context,
        expires_at: expires,
      });
      count++;
    }

    return count;
  }

  /**
   * Compute collaborative filtering signals (booked together, same client booked).
   */
  async computeCollaborativeSignals(): Promise<number> {
    let count = 0;
    const now = new Date();

    // Signal 1: "booked_together" — artists booked in the same workspace event
    const bookedTogether = await db('workspace_event_bookings as web1')
      .join('workspace_event_bookings as web2', function () {
        this.on('web1.workspace_event_id', '=', 'web2.workspace_event_id');
        this.on('web1.booking_id', '<>', 'web2.booking_id');
      })
      .join('bookings as b1', 'b1.id', 'web1.booking_id')
      .join('bookings as b2', 'b2.id', 'web2.booking_id')
      .whereRaw('b1.artist_id < b2.artist_id')
      .groupBy('b1.artist_id', 'b2.artist_id')
      .select(
        'b1.artist_id as artist_a_id',
        'b2.artist_id as artist_b_id',
        db.raw('count(*)::integer as occurrence_count'),
        db.raw('max(web1.created_at) as last_occurred_at'),
      );

    for (const pair of bookedTogether) {
      const strength = Math.min(Number(pair.occurrence_count) / 5, 1.0);
      await recommendationRepository.upsertCollaborativeSignal({
        artist_a_id: pair.artist_a_id,
        artist_b_id: pair.artist_b_id,
        signal_type: 'booked_together',
        strength,
        occurrence_count: Number(pair.occurrence_count),
        last_occurred_at: pair.last_occurred_at ?? now,
        computed_at: now,
      });
      count++;
    }

    // Signal 2: "same_client_booked" — artists booked by the same client 2+ times each
    const sameClient = await db(
      db('bookings')
        .where('deleted_at', null)
        .groupBy('client_id', 'artist_id')
        .having(db.raw('count(*) >= 2'))
        .select('client_id', 'artist_id', db.raw('count(*)::integer as booking_count'))
        .as('client_artists'),
    )
      .join(
        db('bookings')
          .where('deleted_at', null)
          .groupBy('client_id', 'artist_id')
          .having(db.raw('count(*) >= 2'))
          .select('client_id', 'artist_id', db.raw('count(*)::integer as booking_count'))
          .as('ca2'),
        function () {
          this.on('client_artists.client_id', '=', 'ca2.client_id');
          this.on('client_artists.artist_id', '<', 'ca2.artist_id');
        },
      )
      .select(
        'client_artists.artist_id as artist_a_id',
        'ca2.artist_id as artist_b_id',
        db.raw('(client_artists.booking_count + ca2.booking_count)::integer as shared_bookings'),
      );

    for (const pair of sameClient) {
      const strength = Math.min(Number(pair.shared_bookings) / 10, 1.0);
      await recommendationRepository.upsertCollaborativeSignal({
        artist_a_id: pair.artist_a_id,
        artist_b_id: pair.artist_b_id,
        signal_type: 'same_client_booked',
        strength,
        occurrence_count: Number(pair.shared_bookings),
        last_occurred_at: now,
        computed_at: now,
      });
      count++;
    }

    return count;
  }

  /**
   * Get personalized recommendations for a client user.
   */
  async getClientRecommendations(
    userId: string,
    context: { event_type?: string; city?: string; budget_min?: number; budget_max?: number; limit?: number },
  ) {
    const limit = context.limit ?? 10;

    // Fetch user's recent bookings to understand preferences
    const recentBookings = await db('bookings')
      .where({ client_id: userId, deleted_at: null })
      .orderBy('created_at', 'desc')
      .limit(10);

    const preferredGenres = new Set<string>();
    const preferredCities = new Set<string>();
    const preferredEventTypes = new Set<string>();
    let lastBookedArtistId: string | null = null;

    for (const booking of recentBookings) {
      if (booking.event_city) preferredCities.add(booking.event_city);
      if (booking.event_type) preferredEventTypes.add(booking.event_type);
      if (!lastBookedArtistId && booking.artist_id) {
        lastBookedArtistId = booking.artist_id;
        // Get genres from artist
        const artist = await db('artist_profiles').where({ id: booking.artist_id }).first();
        if (artist?.genres) {
          for (const g of artist.genres as string[]) preferredGenres.add(g);
        }
      }
    }

    const allRecs: Map<string, Record<string, unknown>> = new Map();

    // 1. Popular for event type matching context
    const popularRecs = await recommendationRepository.getRecommendationsForClient(
      'popular_for_event',
      {
        event_type: context.event_type ?? [...preferredEventTypes][0],
        city: context.city ?? [...preferredCities][0],
      },
      limit,
    );
    for (const rec of popularRecs) {
      if (!allRecs.has(rec.target_artist_id)) {
        allRecs.set(rec.target_artist_id, { ...rec, sources: ['popular_for_event'] });
      }
    }

    // 2. Rising stars
    const risingStars = await recommendationRepository.getRecommendationsForClient(
      'rising_star',
      {
        event_type: context.event_type,
        city: context.city,
      },
      5,
    );
    for (const rec of risingStars) {
      if (!allRecs.has(rec.target_artist_id)) {
        allRecs.set(rec.target_artist_id, { ...rec, sources: ['rising_star'] });
      } else {
        const existing = allRecs.get(rec.target_artist_id)!;
        (existing.sources as string[]).push('rising_star');
      }
    }

    // 3. Similar to last booked artist
    if (lastBookedArtistId) {
      const similarRecs = await recommendationRepository.getRecommendations({
        source_type: 'artist',
        source_id: lastBookedArtistId,
        recommendation_type: 'similar_artist',
        limit: 5,
      });
      for (const rec of similarRecs) {
        if (!allRecs.has(rec.target_artist_id)) {
          allRecs.set(rec.target_artist_id, { ...rec, sources: ['similar_artist'] });
        } else {
          const existing = allRecs.get(rec.target_artist_id)!;
          (existing.sources as string[]).push('similar_artist');
        }
      }
    }

    // Deduplicate and sort by score, take top N
    const deduplicated = [...allRecs.values()]
      .sort((a, b) => (b.score as number) - (a.score as number))
      .slice(0, limit);

    // Join artist profile data
    const artistIds = deduplicated.map((r) => r.target_artist_id as string);
    if (artistIds.length === 0) {
      return { recommendations: [], preferences: { genres: [...preferredGenres], cities: [...preferredCities] } };
    }

    const artists = await db('artist_profiles')
      .whereIn('id', artistIds)
      .where('deleted_at', null)
      .select('id', 'stage_name', 'genres', 'trust_score', 'base_city', 'pricing', 'total_bookings', 'is_verified');

    const artistMap = new Map(artists.map((a: Record<string, unknown>) => [a.id, a]));

    const recommendations = deduplicated.map((rec) => {
      const artist = artistMap.get(rec.target_artist_id as string);
      return {
        recommendation_id: rec.id,
        score: rec.score,
        recommendation_type: rec.recommendation_type,
        sources: rec.sources,
        rising_star: rec.rising_star ?? false,
        context: rec.context,
        artist: artist ?? null,
      };
    });

    return {
      recommendations,
      preferences: {
        genres: [...preferredGenres],
        cities: [...preferredCities],
        event_types: [...preferredEventTypes],
      },
    };
  }

  /**
   * Get recommendations for an artist (events + complementary artists).
   */
  async getArtistRecommendations(userId: string) {
    // Resolve artist from user_id
    const artist = await db('artist_profiles')
      .where({ user_id: userId, deleted_at: null })
      .first();

    if (!artist) {
      throw new RecommendationError('ARTIST_NOT_FOUND', 'Artist profile not found', 404);
    }

    // 1. Events recommended for this artist
    const eventRecs = await recommendationRepository.getRecommendationsForArtist(
      artist.id,
      'events_for_artist',
      10,
    );

    // 2. Collaborative / complementary artists
    const collaborativeRaw = await recommendationRepository.getCollaborativeArtists(artist.id, 10);

    // Enrich collaborative artists with profile data
    const pairedIds = collaborativeRaw.map((r: Record<string, unknown>) => r.paired_artist_id as string);
    let collaborativeArtists: Record<string, unknown>[] = [];

    if (pairedIds.length > 0) {
      const pairedProfiles = await db('artist_profiles')
        .whereIn('id', pairedIds)
        .where('deleted_at', null)
        .select('id', 'stage_name', 'genres', 'trust_score', 'base_city');

      const profileMap = new Map(pairedProfiles.map((p: Record<string, unknown>) => [p.id, p]));

      collaborativeArtists = collaborativeRaw.map((r: Record<string, unknown>) => ({
        signal_type: r.signal_type,
        strength: r.strength,
        occurrence_count: r.occurrence_count,
        artist: profileMap.get(r.paired_artist_id as string) ?? null,
      }));
    }

    return {
      events: eventRecs,
      complementary_artists: collaborativeArtists,
    };
  }

  /**
   * Batch compute all recommendation types.
   */
  async batchCompute(): Promise<{ total_scores: number; expired_cleaned: number }> {
    let totalScores = 0;

    // Get active artists (limit 100)
    const artists = await db('artist_profiles')
      .where('deleted_at', null)
      .orderBy('trust_score', 'desc')
      .limit(100)
      .select('id');

    // Compute similar artists and events for each artist
    for (const artist of artists) {
      try {
        totalScores += await this.computeSimilarArtists(artist.id);
      } catch {
        // Continue on individual failures
      }
      try {
        totalScores += await this.computeEventsForArtist(artist.id);
      } catch {
        // Continue on individual failures
      }
    }

    // Compute popular_for_event for top city+event_type combinations from demand signals
    const topCombos = await db('demand_signals')
      .where('demand_level', 'in', ['high', 'peak'])
      .where('signal_date', '>=', new Date())
      .groupBy('event_type', 'city')
      .select('event_type', 'city')
      .limit(20);

    for (const combo of topCombos) {
      if (combo.event_type && combo.city) {
        try {
          totalScores += await this.computePopularForEvent(combo.event_type, combo.city);
        } catch {
          // Continue on individual failures
        }
      }
    }

    // Compute collaborative signals
    try {
      totalScores += await this.computeCollaborativeSignals();
    } catch {
      // Continue on failure
    }

    // Clean expired
    const expiredCleaned = await recommendationRepository.cleanExpired();

    return { total_scores: totalScores, expired_cleaned: expiredCleaned };
  }
}

export class RecommendationError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'RecommendationError';
  }
}

export const recommendationService = new RecommendationService();
