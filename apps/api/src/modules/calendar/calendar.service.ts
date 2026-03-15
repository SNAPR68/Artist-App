import { calendarRepository } from './calendar.repository.js';
import { artistRepository } from '../artist/artist.repository.js';
import { redis } from '../../infrastructure/redis.js';

const CACHE_TTL = 300; // 5 minutes

export class CalendarService {
  async getAvailability(artistId: string, startDate: string, endDate: string) {
    const cacheKey = `calendar:${artistId}:${startDate}:${endDate}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const entries = await calendarRepository.getRange(artistId, startDate, endDate);
    await redis.set(cacheKey, JSON.stringify(entries), 'EX', CACHE_TTL);
    return entries;
  }

  async updateAvailability(
    userId: string,
    dates: { date: string; status: 'available' | 'held' | 'booked'; notes?: string }[],
  ) {
    const artist = await artistRepository.findByUserId(userId);
    if (!artist) {
      throw new CalendarError('PROFILE_NOT_FOUND', 'Artist profile not found', 404);
    }

    // Artists can only set available/held manually — booked is system-managed
    for (const d of dates) {
      if (d.status === 'booked') {
        throw new CalendarError('INVALID_STATUS', 'Cannot manually set booked status', 400);
      }

      // Cannot modify booked dates
      const existing = await calendarRepository.getDateStatus(artist.id, d.date);
      if (existing && existing.status === 'booked') {
        throw new CalendarError('DATE_BOOKED', `${d.date} is already booked and cannot be modified`, 409);
      }
    }

    const result = await calendarRepository.upsertDates(artist.id, dates);
    await this.invalidateCache(artist.id);
    return result;
  }

  async getPublicAvailability(artistId: string, startDate: string, endDate: string) {
    const entries = await this.getAvailability(artistId, startDate, endDate);
    // Public view only shows date + availability (not booking IDs or notes)
    return entries.map((e: { date: string; status: string }) => ({
      date: e.date,
      status: e.status === 'held' ? 'unavailable' : e.status === 'booked' ? 'unavailable' : 'available',
    }));
  }

  private async invalidateCache(artistId: string) {
    // Scan and delete calendar caches for this artist
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `calendar:${artistId}:*`, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  }
}

export class CalendarError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'CalendarError';
  }
}

export const calendarService = new CalendarService();
