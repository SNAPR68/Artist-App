import {
  SUBSTITUTION_WEIGHTS,
  SUBSTITUTION_MAX_CANDIDATES,
  SUBSTITUTION_EXPIRY_HOURS,
  SUBSTITUTION_SEARCH_RADIUS_KM,
} from '@artist-booking/shared';
import { db } from '../../infrastructure/database.js';
import { emergencySubstitutionRepository } from './emergency-substitution.repository.js';

// ─── Helpers ──────────────────────────────────────────────────

function jaccard(a: string[], b: string[]): number {
  if (!a || !b || (a.length === 0 && b.length === 0)) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function parsePricing(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
}

function getPriceForEventType(pricing: unknown, eventType: string): number {
  const entries = parsePricing(pricing);
  const match = entries.find(
    (p) => (p.event_type as string)?.toLowerCase() === eventType.toLowerCase(),
  );
  if (match) return Number(match.base_price_paise ?? match.price ?? 0);
  // Fallback: average of all prices
  const prices = entries
    .map((p) => Number(p.base_price_paise ?? p.price ?? 0))
    .filter((p) => p > 0);
  return prices.length === 0 ? 0 : prices.reduce((s, p) => s + p, 0) / prices.length;
}

/**
 * Haversine distance in km between two lat/lng points.
 */
function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function determineUrgency(daysUntilEvent: number): 'CRITICAL' | 'URGENT' | 'STANDARD' {
  if (daysUntilEvent <= 1) return 'CRITICAL';
  if (daysUntilEvent <= 3) return 'URGENT';
  return 'STANDARD';
}

function expiresAt(urgencyLevel: 'CRITICAL' | 'URGENT' | 'STANDARD'): Date {
  const hours = SUBSTITUTION_EXPIRY_HOURS[urgencyLevel];
  const d = new Date();
  d.setTime(d.getTime() + hours * 60 * 60 * 1000);
  return d;
}

// ─── Error Class ──────────────────────────────────────────────

export class EmergencySubstitutionError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'EmergencySubstitutionError';
  }
}

// ─── Candidate Scoring Types ──────────────────────────────────

interface CandidateScore {
  artist_id: string;
  match_score: number;
  score_breakdown: {
    genre_overlap: number;
    tier_proximity: number;
    venue_fit: number;
    geographic: number;
    historical_success: number;
    reliable_backup_bonus: number;
  };
}

interface BookingRow {
  id: string;
  artist_id: string;
  event_date: string;
  event_city: string;
  event_type: string;
  agreed_amount_paise: number;
  venue_id: string | null;
  state: string;
  event_lat?: number | null;
  event_lng?: number | null;
}

// ─── Service ──────────────────────────────────────────────────

export class EmergencySubstitutionService {

  // ─── Create & Match ─────────────────────────────────────────

  async createRequest(userId: string, originalBookingId: string, urgencyLevel?: string) {
    // 1. Load and verify booking
    const booking: BookingRow | undefined = await db('bookings')
      .where({ id: originalBookingId })
      .first();

    if (!booking) {
      throw new EmergencySubstitutionError(
        'BOOKING_NOT_FOUND',
        'Original booking not found',
        404,
      );
    }

    if (booking.state !== 'cancelled') {
      throw new EmergencySubstitutionError(
        'BOOKING_NOT_CANCELLED',
        'Booking must be in cancelled state to request substitution',
        400,
      );
    }

    // 2. Extract event details
    const { event_date, event_city, event_type, artist_id: cancelledArtistId } = booking;

    // 3. Load cancelled artist genres
    const cancelledArtist = await db('artist_profiles')
      .where({ id: cancelledArtistId })
      .select('genres', 'pricing')
      .first();

    const originalGenres: string[] = cancelledArtist?.genres ?? [];

    // 4. Determine urgency
    const daysUntilEvent = Math.max(
      0,
      (new Date(event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    const resolvedUrgency = (urgencyLevel as 'CRITICAL' | 'URGENT' | 'STANDARD') ?? determineUrgency(daysUntilEvent);

    // 5. Calculate expiry
    const expiryDate = expiresAt(resolvedUrgency);

    // 6. Create request with status=matching
    const request = await emergencySubstitutionRepository.createRequest({
      original_booking_id: originalBookingId,
      requested_by: userId,
      original_artist_id: cancelledArtistId,
      event_date,
      event_city,
      event_type,
      original_genres: originalGenres,
      urgency_level: resolvedUrgency,
      status: 'matching',
      expires_at: expiryDate,
      original_agreed_amount_paise: booking.agreed_amount_paise ?? 0,
      venue_id: booking.venue_id,
    });

    // 7. Run matching algorithm
    const candidates = await this.findCandidates(
      event_date,
      event_city,
      event_type,
      originalGenres,
      cancelledArtistId,
      cancelledArtist?.pricing,
      booking.venue_id,
      booking.agreed_amount_paise ?? 0,
      booking.event_lat ?? null,
      booking.event_lng ?? null,
    );

    // 8/9. Update status based on candidates found
    if (candidates.length > 0) {
      await emergencySubstitutionRepository.updateRequest(request.id, { status: 'notified' });
      await emergencySubstitutionRepository.createCandidates(
        request.id,
        candidates.map((c) => ({
          artist_id: c.artist_id,
          match_score: c.match_score,
          score_breakdown: c.score_breakdown,
          response: 'pending',
        })),
      );
      // TODO: send notifications to candidate artists
    } else {
      await emergencySubstitutionRepository.updateRequest(request.id, {
        status: 'expired',
        advisory: 'No matching candidates found in your area for this event date.',
      });
    }

    // 10. Return request with candidates
    const updatedRequest = await emergencySubstitutionRepository.getRequest(request.id);
    const savedCandidates = await emergencySubstitutionRepository.getCandidates(request.id);

    return { ...updatedRequest, candidates: savedCandidates };
  }

  // ─── Matching Algorithm ─────────────────────────────────────

  private async findCandidates(
    eventDate: string,
    eventCity: string,
    eventType: string,
    originalGenres: string[],
    cancelledArtistId: string,
    cancelledArtistPricing: unknown,
    venueId: string | null,
    originalAgreedAmountPaise: number,
    eventLat: number | null,
    eventLng: number | null,
  ): Promise<CandidateScore[]> {
    // Get available artists
    const available = await emergencySubstitutionRepository.getAvailableArtists(
      eventDate,
      eventCity,
      originalGenres,
      [cancelledArtistId],
    );

    if (available.length === 0) return [];

    const originalPrice = originalAgreedAmountPaise > 0
      ? originalAgreedAmountPaise
      : getPriceForEventType(cancelledArtistPricing, eventType);

    // Fetch venue history if venue exists
    let venueHistory: Map<string, number> = new Map();
    if (venueId) {
      const history = await db('venue_artist_history')
        .where({ venue_id: venueId })
        .select('artist_id', 'avg_rating');
      for (const h of history) {
        venueHistory.set(h.artist_id, Number(h.avg_rating));
      }
    }

    const weights = SUBSTITUTION_WEIGHTS;
    const scored: CandidateScore[] = [];

    for (const candidate of available) {
      // 1. Genre Overlap (0.30)
      const candidateGenres: string[] = candidate.genres ?? [];
      const genreScore = jaccard(originalGenres, candidateGenres);

      // 2. Tier Proximity (0.25)
      const candidatePrice = getPriceForEventType(candidate.pricing, eventType);
      const maxPrice = Math.max(candidatePrice, originalPrice, 1);
      const tierScore = Math.max(0, Math.min(1,
        1 - Math.abs(candidatePrice - originalPrice) / maxPrice,
      ));

      // 3. Venue Fit (0.20)
      let venueScore = 0.5; // neutral if never performed
      if (venueId && venueHistory.has(candidate.id)) {
        const rating = venueHistory.get(candidate.id)!;
        venueScore = rating >= 4 ? 1.0 : rating >= 3 ? 0.7 : 0.5;
      }

      // 4. Geographic (0.15)
      let geoScore = 0.0;
      if (candidate.base_city?.toLowerCase() === eventCity?.toLowerCase()) {
        geoScore = 1.0;
      } else if (candidate.location_lat != null && candidate.location_lng != null && eventLat != null && eventLng != null) {
        const distanceKm = haversineKm(
          candidate.location_lat, candidate.location_lng,
          eventLat, eventLng,
        );
        if (distanceKm <= 200) {
          geoScore = 0.7;
        } else if (distanceKm <= SUBSTITUTION_SEARCH_RADIUS_KM) {
          geoScore = 0.3;
        } else {
          // Beyond search radius — filter out
          continue;
        }
      } else {
        // No coordinates — use city match only (already 0.0 since not same city)
        geoScore = 0.0;
      }

      // 5. Historical Success (0.10)
      const trustNorm = (candidate.trust_score ?? 0) / 5.0;
      // Fetch completion rate
      const completionStats: any = await db('bookings')
        .where({ artist_id: candidate.id })
        .whereIn('state', ['completed', 'cancelled'])
        .select(
          db.raw('COUNT(*) FILTER (WHERE state = ?) as completed', ['completed']),
          db.raw('COUNT(*) as total'),
        )
        .first();
      const completionRate = completionStats && Number(completionStats.total) > 0
        ? Number(completionStats.completed) / Number(completionStats.total)
        : 0.5;
      const historyScore = trustNorm * completionRate;

      // Compute weighted total
      let totalScore =
        weights.GENRE_OVERLAP * genreScore +
        weights.TIER_PROXIMITY * tierScore +
        weights.VENUE_FIT * venueScore +
        weights.GEOGRAPHIC * geoScore +
        weights.HISTORICAL_SUCCESS * historyScore;

      // Reliable backup bonus
      const reliableBonus = candidate.is_reliable_backup ? 0.10 : 0;
      totalScore += reliableBonus;

      scored.push({
        artist_id: candidate.id,
        match_score: Math.round(totalScore * 1000) / 1000,
        score_breakdown: {
          genre_overlap: Math.round(genreScore * 1000) / 1000,
          tier_proximity: Math.round(tierScore * 1000) / 1000,
          venue_fit: Math.round(venueScore * 1000) / 1000,
          geographic: Math.round(geoScore * 1000) / 1000,
          historical_success: Math.round(historyScore * 1000) / 1000,
          reliable_backup_bonus: reliableBonus,
        },
      });
    }

    // Sort descending, take top N
    scored.sort((a, b) => b.match_score - a.match_score);
    return scored.slice(0, SUBSTITUTION_MAX_CANDIDATES);
  }

  // ─── Acceptance Flow ────────────────────────────────────────

  async acceptSubstitution(candidateId: string, userId: string) {
    // 1. Load candidate + request
    const candidate = await emergencySubstitutionRepository.getCandidate(candidateId);
    if (!candidate) {
      throw new EmergencySubstitutionError('CANDIDATE_NOT_FOUND', 'Candidate not found', 404);
    }

    // Verify candidate belongs to this user's artist profile
    const artistProfile = await db('artist_profiles')
      .where({ user_id: userId, id: candidate.artist_id })
      .first();
    if (!artistProfile) {
      throw new EmergencySubstitutionError('UNAUTHORIZED', 'Not your candidate entry', 403);
    }

    const request = await emergencySubstitutionRepository.getRequest(candidate.substitution_request_id);
    if (!request) {
      throw new EmergencySubstitutionError('REQUEST_NOT_FOUND', 'Substitution request not found', 404);
    }

    // 2. Verify status
    if (request.status !== 'notified') {
      throw new EmergencySubstitutionError(
        'INVALID_STATUS',
        `Cannot accept: request status is '${request.status}'`,
        400,
      );
    }

    // 3. Transaction with row-level lock
    const result = await db.transaction(async (trx) => {
      // Lock the request row
      const lockedRequest: any = await trx('substitution_requests')
        .where({ id: request.id })
        .forUpdate()
        .first();

      if (lockedRequest.status !== 'notified') {
        throw new EmergencySubstitutionError(
          'ALREADY_ACCEPTED',
          'This request has already been accepted or expired',
          409,
        );
      }

      // 4. Update candidate response
      await trx('substitution_candidates')
        .where({ id: candidateId })
        .update({ response: 'accepted', responded_at: trx.fn.now(), updated_at: trx.fn.now() });

      // 5. Expire other candidates
      await trx('substitution_candidates')
        .where({ substitution_request_id: request.id })
        .whereNot({ id: candidateId })
        .where({ response: 'pending' })
        .update({ response: 'expired', updated_at: trx.fn.now() });

      // 6. Calculate premium amount
      const premiumPct = artistProfile.backup_premium_pct ?? 25;
      const premiumMultiplier = 1 + premiumPct / 100;
      const premiumAmountPaise = Math.round(
        (lockedRequest.original_agreed_amount_paise ?? 0) * premiumMultiplier,
      );

      // 7. Update request
      const [updatedRequest] = await trx('substitution_requests')
        .where({ id: request.id })
        .update({
          status: 'accepted',
          accepted_artist_id: candidate.artist_id,
          matched_at: trx.fn.now(),
          premium_amount_paise: premiumAmountPaise,
          updated_at: trx.fn.now(),
        })
        .returning('*');

      return updatedRequest;
    });

    // 9. TODO: send notification to client
    // 10. Return updated request
    const candidates = await emergencySubstitutionRepository.getCandidates(result.id);
    return { ...result, candidates };
  }

  async declineSubstitution(candidateId: string, userId: string, reason?: string) {
    // 1. Verify ownership
    const candidate = await emergencySubstitutionRepository.getCandidate(candidateId);
    if (!candidate) {
      throw new EmergencySubstitutionError('CANDIDATE_NOT_FOUND', 'Candidate not found', 404);
    }

    const artistProfile = await db('artist_profiles')
      .where({ user_id: userId, id: candidate.artist_id })
      .first();
    if (!artistProfile) {
      throw new EmergencySubstitutionError('UNAUTHORIZED', 'Not your candidate entry', 403);
    }

    // 2. Update candidate
    const updatedCandidate = await emergencySubstitutionRepository.updateCandidate(candidateId, {
      response: 'declined',
      decline_reason: reason ?? null,
      responded_at: db.fn.now(),
    });

    // 3. Check if all candidates have responded
    const pending = await emergencySubstitutionRepository.getUnrespondedCandidates(
      candidate.substitution_request_id,
    );

    if (pending.length === 0) {
      // All responded, none accepted — check if any accepted
      const allCandidates = await emergencySubstitutionRepository.getCandidates(
        candidate.substitution_request_id,
      );
      const hasAccepted = allCandidates.some((c: Record<string, unknown>) => c.response === 'accepted');
      if (!hasAccepted) {
        await emergencySubstitutionRepository.updateRequest(
          candidate.substitution_request_id,
          { status: 'expired' },
        );
        // TODO: send expiry notification to requester
      }
    }

    return updatedCandidate;
  }

  // ─── Batch / Cron ───────────────────────────────────────────

  async expireUnresponded(): Promise<number> {
    const expiredRequests = await emergencySubstitutionRepository.getExpiredRequests();
    let count = 0;

    for (const request of expiredRequests) {
      await emergencySubstitutionRepository.expireUnrespondedForRequest(request.id);
      await emergencySubstitutionRepository.updateRequest(request.id, { status: 'expired' });
      // TODO: send expiry notification to requester
      count++;
    }

    return count;
  }

  // ─── Read Methods ───────────────────────────────────────────

  async getRequest(requestId: string, userId: string) {
    const request = await emergencySubstitutionRepository.getRequest(requestId);
    if (!request) {
      throw new EmergencySubstitutionError('REQUEST_NOT_FOUND', 'Substitution request not found', 404);
    }

    // Verify access: requester or candidate artist
    const isRequester = request.requested_by === userId;
    if (!isRequester) {
      const artistProfile = await db('artist_profiles').where({ user_id: userId }).first();
      if (artistProfile) {
        const candidates = await emergencySubstitutionRepository.getCandidates(requestId);
        const isCandidate = candidates.some(
          (c: Record<string, unknown>) => c.artist_id === artistProfile.id,
        );
        if (!isCandidate) {
          throw new EmergencySubstitutionError('UNAUTHORIZED', 'Not authorized to view this request', 403);
        }
      } else {
        throw new EmergencySubstitutionError('UNAUTHORIZED', 'Not authorized to view this request', 403);
      }
    }

    const candidates = await emergencySubstitutionRepository.getCandidates(requestId);
    return { ...request, candidates };
  }

  async getMyRequests(userId: string) {
    return emergencySubstitutionRepository.getRequestsByUser(userId);
  }

  // ─── Backup Preferences ─────────────────────────────────────

  async updateBackupPreferences(userId: string, isReliable: boolean, premiumPct: number) {
    const artistProfile = await db('artist_profiles').where({ user_id: userId }).first();
    if (!artistProfile) {
      throw new EmergencySubstitutionError('ARTIST_NOT_FOUND', 'Artist profile not found', 404);
    }

    return emergencySubstitutionRepository.updateBackupPreferences(
      artistProfile.id,
      isReliable,
      premiumPct,
    );
  }

  async getBackupPreferences(userId: string) {
    const artistProfile = await db('artist_profiles').where({ user_id: userId }).first();
    if (!artistProfile) {
      throw new EmergencySubstitutionError('ARTIST_NOT_FOUND', 'Artist profile not found', 404);
    }

    return emergencySubstitutionRepository.getBackupPreferences(artistProfile.id);
  }
}

export const emergencySubstitutionService = new EmergencySubstitutionService();
