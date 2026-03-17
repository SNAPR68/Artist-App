import { db } from '../../infrastructure/database.js';

export class EventDayRepository {
  async create(bookingId: string) {
    const [log] = await db('event_day_logs')
      .insert({ booking_id: bookingId })
      .returning('*');
    return log;
  }

  async findByBookingId(bookingId: string) {
    return db('event_day_logs').where({ booking_id: bookingId }).first();
  }

  async updateArrival(bookingId: string, lat: number, lng: number, verified: boolean, distanceM: number) {
    const [updated] = await db('event_day_logs')
      .where({ booking_id: bookingId })
      .update({
        arrival_lat: lat,
        arrival_lng: lng,
        arrival_verified: verified,
        arrival_distance_m: distanceM,
        arrival_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return updated;
  }

  async updateSoundcheck(bookingId: string, role: 'artist' | 'client') {
    const field = role === 'artist' ? 'soundcheck_artist' : 'soundcheck_client';
    const atField = `${field}_at`;
    const [updated] = await db('event_day_logs')
      .where({ booking_id: bookingId })
      .update({
        [field]: true,
        [atField]: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return updated;
  }

  async updateSetStart(bookingId: string) {
    const [updated] = await db('event_day_logs')
      .where({ booking_id: bookingId })
      .update({ set_start_at: new Date(), updated_at: new Date() })
      .returning('*');
    return updated;
  }

  async updateSetEnd(bookingId: string, actualDurationMin: number) {
    const [updated] = await db('event_day_logs')
      .where({ booking_id: bookingId })
      .update({
        set_end_at: new Date(),
        actual_duration_min: actualDurationMin,
        updated_at: new Date(),
      })
      .returning('*');
    return updated;
  }

  async updateCompletion(bookingId: string, role: 'artist' | 'client') {
    const field = role === 'artist' ? 'completion_artist' : 'completion_client';
    const atField = `${field}_at`;
    const [updated] = await db('event_day_logs')
      .where({ booking_id: bookingId })
      .update({
        [field]: true,
        [atField]: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return updated;
  }

  async appendIssue(bookingId: string, issue: Record<string, unknown>) {
    const [updated] = await db('event_day_logs')
      .where({ booking_id: bookingId })
      .update({
        issues: db.raw(`issues || ?::jsonb`, [JSON.stringify(issue)]),
        updated_at: new Date(),
      })
      .returning('*');
    return updated;
  }

  async findPendingEventDay(today: string) {
    return db('bookings')
      .where('state', 'pre_event')
      .where('event_date', '<=', today)
      .select('id', 'artist_id', 'client_id', 'event_type', 'event_date');
  }
}

export const eventDayRepository = new EventDayRepository();
