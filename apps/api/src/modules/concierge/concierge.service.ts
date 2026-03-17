import { db } from '../../infrastructure/database.js';
import { bookingRepository } from '../booking/booking.repository.js';

export class ConciergeService {
  /**
   * Search artists on behalf of a client (uses existing search logic).
   */
  async searchOnBehalf(searchParams: Record<string, unknown>) {
    // Use direct DB query for concierge search — simpler than importing full search module
    let query = db('artist_profiles as ap')
      .leftJoin('users as u', 'u.id', 'ap.user_id')
      .where('u.is_active', true)
      .select('ap.*');

    if (searchParams.genre) {
      query = query.whereRaw('? = ANY(ap.genres)', [searchParams.genre]);
    }
    if (searchParams.city) {
      query = query.where('ap.base_city', 'ilike', `%${searchParams.city}%`);
    }
    if (searchParams.event_type) {
      query = query.whereRaw('? = ANY(ap.event_types)', [searchParams.event_type]);
    }

    return query.orderBy('ap.trust_score', 'desc').limit(50);
  }

  /**
   * Create a booking on behalf of a client.
   */
  async createBookingOnBehalf(
    conciergeUserId: string,
    clientUserId: string,
    bookingData: {
      artist_id: string;
      event_type: string;
      event_date: string;
      event_city: string;
      event_venue?: string;
      duration_hours: number;
      guest_count?: number;
      special_requirements?: string;
    },
  ) {
    const clientProfile = await db('client_profiles').where({ user_id: clientUserId }).first();
    if (!clientProfile) {
      throw new Error('Client profile not found');
    }

    const [booking] = await db('bookings')
      .insert({
        client_id: clientUserId,
        artist_id: bookingData.artist_id,
        event_type: bookingData.event_type,
        event_date: bookingData.event_date,
        event_city: bookingData.event_city,
        event_venue: bookingData.event_venue ?? null,
        duration_hours: bookingData.duration_hours,
        guest_count: bookingData.guest_count ?? null,
        special_requirements: bookingData.special_requirements ?? null,
        state: 'inquiry',
        is_concierge_assisted: true,
        concierge_user_id: conciergeUserId,
      })
      .returning('*');

    await bookingRepository.addEvent(booking.id, {
      from_state: null,
      to_state: 'inquiry',
      triggered_by: conciergeUserId,
      metadata: {
        concierge_assisted: true,
        on_behalf_of: clientUserId,
      },
    });

    return booking;
  }

  /**
   * Get a client's booking pipeline (all bookings grouped by state).
   */
  async getClientPipeline(clientUserId: string) {
    const bookings = await db('bookings as b')
      .leftJoin('artist_profiles as ap', 'ap.id', 'b.artist_id')
      .where({ 'b.client_id': clientUserId, 'b.deleted_at': null })
      .select('b.*', 'ap.stage_name as artist_name')
      .orderBy('b.created_at', 'desc');

    // Group by state
    const pipeline: Record<string, unknown[]> = {};
    for (const booking of bookings) {
      const state = booking.state as string;
      if (!pipeline[state]) pipeline[state] = [];
      pipeline[state].push(booking);
    }

    return {
      pipeline,
      total: bookings.length,
      summary: Object.entries(pipeline).map(([state, items]) => ({
        state,
        count: items.length,
      })),
    };
  }

  /**
   * Get concierge dashboard stats.
   */
  async getStats() {
    const [totalAssisted, activeAssisted, recentBookings] = await Promise.all([
      db('bookings').where({ is_concierge_assisted: true }).count('id as count').first(),
      db('bookings')
        .where({ is_concierge_assisted: true })
        .whereNotIn('state', ['cancelled', 'expired', 'settled'])
        .count('id as count')
        .first(),
      db('bookings')
        .where({ is_concierge_assisted: true })
        .orderBy('created_at', 'desc')
        .limit(10)
        .select('id', 'state', 'event_type', 'event_date', 'created_at'),
    ]);

    return {
      total_concierge_bookings: Number(totalAssisted?.count ?? 0),
      active_concierge_bookings: Number(activeAssisted?.count ?? 0),
      recent_bookings: recentBookings,
    };
  }
}

export const conciergeService = new ConciergeService();
