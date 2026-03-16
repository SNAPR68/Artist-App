import { db } from '../../infrastructure/database.js';
import type { BookingState } from '@artist-booking/shared';

export interface CreateBookingData {
  client_id: string;
  artist_id: string;
  event_type: string;
  event_date: string;
  event_city: string;
  event_venue?: string;
  duration_hours: number;
  guest_count?: number;
  special_requirements?: string;
}

export class BookingRepository {
  async create(data: CreateBookingData) {
    const [booking] = await db('bookings')
      .insert({
        client_id: data.client_id,
        artist_id: data.artist_id,
        event_type: data.event_type,
        event_date: data.event_date,
        event_city: data.event_city,
        event_venue: data.event_venue ?? null,
        duration_hours: data.duration_hours,
        guest_count: data.guest_count ?? null,
        special_requirements: data.special_requirements ?? null,
        state: 'inquiry',
      })
      .returning('*');
    return booking;
  }

  async findById(id: string) {
    return db('bookings')
      .where({ id, deleted_at: null })
      .first();
  }

  async findByIdWithDetails(id: string) {
    return db('bookings as b')
      .leftJoin('artist_profiles as ap', 'ap.id', 'b.artist_id')
      .leftJoin('client_profiles as cp', 'cp.user_id', 'b.client_id')
      .where({ 'b.id': id, 'b.deleted_at': null })
      .select(
        'b.*',
        'ap.stage_name as artist_name',
        'ap.user_id as artist_user_id',
        'cp.company_name as client_name',
        'cp.user_id as client_user_id',
      )
      .first();
  }

  async updateStatus(id: string, status: BookingState) {
    const [updated] = await db('bookings')
      .where({ id })
      .update({ state: status, updated_at: new Date() })
      .returning('*');
    return updated;
  }

  async updateAmounts(id: string, amounts: {
    quoted_amount_paise?: number;
    final_amount_paise?: number;
    platform_fee_paise?: number;
    artist_payout_paise?: number;
    tds_amount_paise?: number;
    gst_amount_paise?: number;
  }) {
    const [updated] = await db('bookings')
      .where({ id })
      .update({ ...amounts, updated_at: new Date() })
      .returning('*');
    return updated;
  }

  async listByArtistUserId(userId: string, filters?: { status?: string }) {
    let query = db('bookings as b')
      .join('artist_profiles as ap', 'ap.id', 'b.artist_id')
      .join('client_profiles as cp', 'cp.user_id', 'b.client_id')
      .where({ 'ap.user_id': userId, 'b.deleted_at': null })
      .select('b.*', 'cp.company_name as client_name')
      .orderBy('b.created_at', 'desc');

    if (filters?.status) {
      query = query.where('b.state', filters.status);
    }

    return query;
  }

  async listByClientUserId(userId: string, filters?: { status?: string }) {
    let query = db('bookings as b')
      .join('client_profiles as cp', 'cp.user_id', 'b.client_id')
      .join('artist_profiles as ap', 'ap.id', 'b.artist_id')
      .where({ 'cp.user_id': userId, 'b.deleted_at': null })
      .select('b.*', 'ap.stage_name as artist_name')
      .orderBy('b.created_at', 'desc');

    if (filters?.status) {
      query = query.where('b.state', filters.status);
    }

    return query;
  }

  async addEvent(bookingId: string, event: {
    from_state: string | null;
    to_state: string;
    triggered_by: string;
    metadata?: Record<string, unknown>;
  }) {
    const [entry] = await db('booking_events')
      .insert({
        booking_id: bookingId,
        event_type: 'state_transition',
        from_state: event.from_state,
        to_state: event.to_state,
        triggered_by: event.triggered_by,
        metadata: event.metadata ? JSON.stringify(event.metadata) : '{}',
      })
      .returning('*');
    return entry;
  }

  async getEvents(bookingId: string) {
    return db('booking_events')
      .where({ booking_id: bookingId })
      .orderBy('created_at', 'asc');
  }
}

export const bookingRepository = new BookingRepository();
