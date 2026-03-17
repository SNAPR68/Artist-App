import { db } from '../../infrastructure/database.js';
import { venueRepository } from './venue.repository.js';
import { VENUE_COMPATIBILITY_WEIGHTS } from '@artist-booking/shared';

export class VenueCompatibilityService {
  async getCompatibilityScore(artistId: string, venueId: string) {
    const venue = await venueRepository.findById(venueId);
    if (!venue) return null;

    const artist = await db('artist_profiles').where({ id: artistId }).first();
    if (!artist) return null;

    const venueEquipment = await venueRepository.getEquipment(venueId);

    // 1. Capacity score (0-1)
    const capacityScore = this.computeCapacityScore(venue, artist);

    // 2. Equipment score (0-1) — requires rider data
    const equipmentScore = await this.computeEquipmentScore(artistId, venueEquipment);

    // 3. Location score (0-1)
    const locationScore = this.computeLocationScore(venue, artist);

    // 4. Past success score (0-1)
    const pastSuccessScore = await this.computePastSuccessScore(artistId, venueId);

    const overall =
      capacityScore * VENUE_COMPATIBILITY_WEIGHTS.CAPACITY +
      equipmentScore * VENUE_COMPATIBILITY_WEIGHTS.EQUIPMENT +
      locationScore * VENUE_COMPATIBILITY_WEIGHTS.LOCATION +
      pastSuccessScore * VENUE_COMPATIBILITY_WEIGHTS.PAST_SUCCESS;

    return {
      overall_score: Math.round(overall * 100),
      breakdown: {
        capacity: Math.round(capacityScore * 100),
        equipment: Math.round(equipmentScore * 100),
        location: Math.round(locationScore * 100),
        past_success: Math.round(pastSuccessScore * 100),
      },
      venue_id: venueId,
      artist_id: artistId,
    };
  }

  private computeCapacityScore(venue: Record<string, unknown>, artist: Record<string, unknown>): number {
    // Simple: if venue capacity range is reasonable for the artist's typical bookings, score high
    const venueMax = Number(venue.capacity_max || 0);
    if (venueMax === 0) return 0.5; // Unknown capacity
    // Artists in higher tiers expect larger venues
    const trustScore = Number(artist.trust_score || 50);
    if (trustScore >= 80 && venueMax >= 500) return 1.0;
    if (trustScore >= 60 && venueMax >= 200) return 0.9;
    if (venueMax >= 50) return 0.8;
    return 0.6;
  }

  private async computeEquipmentScore(artistId: string, venueEquipment: Record<string, unknown>[]): Promise<number> {
    // Check if artist has a rider
    const rider = await db('artist_riders').where({ artist_id: artistId }).first();
    if (!rider) return 0.7; // No rider = assume moderate compatibility

    const mustHaveItems = await db('rider_line_items')
      .where({ rider_id: rider.id, priority: 'must_have' });

    if (mustHaveItems.length === 0) return 0.9;

    const equipCategories = new Set(venueEquipment.map((e: Record<string, unknown>) => e.category));
    let matched = 0;
    for (const item of mustHaveItems) {
      if (equipCategories.has(item.category)) matched++;
    }

    return mustHaveItems.length > 0 ? matched / mustHaveItems.length : 0.9;
  }

  private computeLocationScore(venue: Record<string, unknown>, artist: Record<string, unknown>): number {
    // If artist base_city matches venue city, high score
    const venueCity = (venue.city as string || '').toLowerCase();
    const artistCity = (artist.base_city as string || '').toLowerCase();
    if (venueCity === artistCity) return 1.0;
    // Otherwise moderate
    return 0.6;
  }

  private async computePastSuccessScore(artistId: string, venueId: string): Promise<number> {
    const history = await db('venue_artist_history')
      .where({ artist_id: artistId, venue_id: venueId })
      .select('overall_review_rating', 'crowd_energy');

    if (history.length === 0) return 0.5; // No history = neutral

    const avgRating = history.reduce((sum: number, h: Record<string, unknown>) =>
      sum + (Number(h.overall_review_rating) || 3), 0) / history.length;

    return Math.min(avgRating / 5, 1.0);
  }

  async getCompatibleVenues(artistId: string, limit = 10) {
    const artist = await db('artist_profiles').where({ id: artistId }).first();
    if (!artist) return [];

    // Get venues in same city first, then others
    const venues = await db('venue_profiles')
      .where({ deleted_at: null })
      .whereNot('status', 'inactive')
      .orderByRaw(`CASE WHEN city = ? THEN 0 ELSE 1 END`, [artist.base_city])
      .limit(limit * 2);

    const scored = [];
    for (const venue of venues) {
      const score = await this.getCompatibilityScore(artistId, venue.id);
      if (score) scored.push({ venue, compatibility: score });
    }

    return scored
      .sort((a, b) => b.compatibility.overall_score - a.compatibility.overall_score)
      .slice(0, limit);
  }
}

export const venueCompatibilityService = new VenueCompatibilityService();
