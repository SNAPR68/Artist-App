import { riderRepository } from './rider.repository.js';
import { venueRepository } from '../venue/venue.repository.js';
import { bookingRepository } from '../booking/booking.repository.js';
import { db } from '../../infrastructure/database.js';

class RiderError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'RiderError';
  }
}

export class RiderService {
  async createOrUpdateRider(artistId: string, data: {
    notes?: string;
    hospitality_requirements: Record<string, unknown>;
    travel_requirements: Record<string, unknown>;
  }) {
    // Find artist profile by user_id
    const profile = await db('artist_profiles').where({ user_id: artistId }).first();
    if (!profile) throw new RiderError('NOT_FOUND', 'Artist profile not found', 404);

    const existing = await riderRepository.findRiderByArtistId(profile.id);
    if (existing) {
      return riderRepository.updateRider(existing.id, {
        notes: data.notes || existing.notes,
        hospitality_requirements: JSON.stringify(data.hospitality_requirements),
        travel_requirements: JSON.stringify(data.travel_requirements),
        version: existing.version + 1,
      });
    }

    return riderRepository.createRider({
      artist_id: profile.id,
      ...data,
    });
  }

  async getRider(artistId: string) {
    const rider = await riderRepository.findRiderByArtistId(artistId);
    if (!rider) throw new RiderError('NOT_FOUND', 'Rider not found', 404);

    const lineItems = await riderRepository.getLineItems(rider.id);
    return { ...rider, line_items: lineItems };
  }

  async addLineItem(userId: string, data: Record<string, unknown>) {
    const profile = await db('artist_profiles').where({ user_id: userId }).first();
    if (!profile) throw new RiderError('NOT_FOUND', 'Artist profile not found', 404);

    const rider = await riderRepository.findRiderByArtistId(profile.id);
    if (!rider) throw new RiderError('NOT_FOUND', 'Create a rider first', 404);

    return riderRepository.addLineItem({ rider_id: rider.id, ...data });
  }

  async updateLineItem(userId: string, itemId: string, data: Record<string, unknown>) {
    const profile = await db('artist_profiles').where({ user_id: userId }).first();
    if (!profile) throw new RiderError('NOT_FOUND', 'Artist profile not found', 404);

    const rider = await riderRepository.findRiderByArtistId(profile.id);
    if (!rider) throw new RiderError('NOT_FOUND', 'Rider not found', 404);

    return riderRepository.updateLineItem(itemId, data);
  }

  async removeLineItem(userId: string, itemId: string) {
    const profile = await db('artist_profiles').where({ user_id: userId }).first();
    if (!profile) throw new RiderError('NOT_FOUND', 'Artist profile not found', 404);

    const deleted = await riderRepository.removeLineItem(itemId);
    if (!deleted) throw new RiderError('NOT_FOUND', 'Line item not found', 404);
    return { deleted: true };
  }

  async generateBookingRiderCheck(bookingId: string) {
    const booking = await bookingRepository.findByIdWithDetails(bookingId);
    if (!booking) throw new RiderError('NOT_FOUND', 'Booking not found', 404);
    if (!booking.venue_id) throw new RiderError('NO_VENUE', 'Booking has no venue assigned', 400);

    const rider = await riderRepository.findRiderByArtistId(booking.artist_id);
    if (!rider) throw new RiderError('NO_RIDER', 'Artist has no rider configured', 400);

    // Remove existing checks for this booking
    await db('rider_venue_checks').where({ booking_id: bookingId }).del();

    const lineItems = await riderRepository.getLineItems(rider.id);
    const venueEquipment = await venueRepository.getEquipment(booking.venue_id);

    const checks = lineItems.map((item: Record<string, unknown>) => {
      // Auto-match: check if venue has equipment in same category with similar name
      const match = venueEquipment.find((eq: Record<string, unknown>) =>
        eq.category === item.category &&
        (eq.item_name as string).toLowerCase().includes((item.item_name as string).toLowerCase().split(' ')[0]),
      );

      return {
        booking_id: bookingId,
        rider_id: rider.id,
        venue_id: booking.venue_id,
        line_item_id: item.id,
        fulfillment_status: match ? 'available' : 'not_checked',
      };
    });

    if (checks.length === 0) return [];
    return riderRepository.createVenueChecks(checks);
  }

  async getRiderCheck(bookingId: string) {
    return riderRepository.getVenueChecks(bookingId);
  }

  async updateRiderCheck(checkId: string, userId: string, data: {
    fulfillment_status: string;
    alternative_offered?: string;
    notes?: string;
  }) {
    return riderRepository.updateVenueCheck(checkId, {
      ...data,
      checked_by: userId,
      checked_at: new Date(),
    });
  }

  async getRiderGapReport(bookingId: string) {
    const checks = await riderRepository.getVenueChecks(bookingId);

    const total = checks.length;
    const fulfilled = checks.filter((c: Record<string, unknown>) =>
      c.fulfillment_status === 'available' || c.fulfillment_status === 'alternative_offered',
    ).length;

    const missingMustHaves = checks.filter((c: Record<string, unknown>) =>
      c.priority === 'must_have' &&
      (c.fulfillment_status === 'unavailable' || c.fulfillment_status === 'not_checked'),
    );

    return {
      total_items: total,
      fulfilled_items: fulfilled,
      fulfillment_pct: total > 0 ? Math.round((fulfilled / total) * 100) : 100,
      missing_must_haves: missingMustHaves,
      is_rider_satisfied: missingMustHaves.length === 0,
    };
  }
}

export const riderService = new RiderService();
