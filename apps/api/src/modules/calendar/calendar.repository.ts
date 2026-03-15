import { db } from '../../infrastructure/database.js';

export interface CalendarEntry {
  id: string;
  artist_id: string;
  date: string;
  status: 'available' | 'held' | 'booked';
  booking_id?: string;
  hold_expires_at?: Date;
  notes?: string;
}

export class CalendarRepository {
  async getRange(artistId: string, startDate: string, endDate: string) {
    return db('availability_calendar')
      .where({ artist_id: artistId })
      .whereBetween('date', [startDate, endDate])
      .orderBy('date', 'asc');
  }

  async upsertDates(artistId: string, dates: { date: string; status: 'available' | 'held' | 'booked'; notes?: string }[]) {
    const results = [];
    for (const entry of dates) {
      const [row] = await db('availability_calendar')
        .insert({
          artist_id: artistId,
          date: entry.date,
          status: entry.status,
          notes: entry.notes ?? null,
        })
        .onConflict(['artist_id', 'date'])
        .merge({
          status: entry.status,
          notes: entry.notes ?? null,
        })
        .returning('*');
      results.push(row);
    }
    return results;
  }

  async setHold(artistId: string, date: string, bookingId: string, expiresAt: Date) {
    const [row] = await db('availability_calendar')
      .insert({
        artist_id: artistId,
        date,
        status: 'held',
        booking_id: bookingId,
        hold_expires_at: expiresAt,
      })
      .onConflict(['artist_id', 'date'])
      .merge({
        status: 'held',
        booking_id: bookingId,
        hold_expires_at: expiresAt,
      })
      .returning('*');
    return row;
  }

  async confirmBooking(artistId: string, date: string, bookingId: string) {
    const [row] = await db('availability_calendar')
      .where({ artist_id: artistId, date })
      .update({
        status: 'booked',
        booking_id: bookingId,
        hold_expires_at: null,
      })
      .returning('*');
    return row;
  }

  async releaseDate(artistId: string, date: string) {
    const [row] = await db('availability_calendar')
      .where({ artist_id: artistId, date })
      .update({
        status: 'available',
        booking_id: null,
        hold_expires_at: null,
      })
      .returning('*');
    return row;
  }

  async releaseExpiredHolds() {
    const released = await db('availability_calendar')
      .where('status', 'held')
      .where('hold_expires_at', '<', new Date())
      .update({
        status: 'available',
        booking_id: null,
        hold_expires_at: null,
      })
      .returning('*');
    return released;
  }

  async getDateStatus(artistId: string, date: string) {
    return db('availability_calendar')
      .where({ artist_id: artistId, date })
      .first();
  }
}

export const calendarRepository = new CalendarRepository();
