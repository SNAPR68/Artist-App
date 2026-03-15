import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../calendar.repository.js', () => ({
  calendarRepository: {
    getRange: vi.fn(),
    upsertDates: vi.fn(),
    getDateStatus: vi.fn(),
  },
}));

vi.mock('../../artist/artist.repository.js', () => ({
  artistRepository: {
    findByUserId: vi.fn(),
  },
}));

vi.mock('../../../infrastructure/redis.js', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    scan: vi.fn().mockResolvedValue(['0', []]),
  },
}));

import { calendarRepository } from '../calendar.repository.js';
import { artistRepository } from '../../artist/artist.repository.js';
import { redis } from '../../../infrastructure/redis.js';
import { CalendarService } from '../calendar.service.js';

const mockCalRepo = calendarRepository as unknown as {
  getRange: ReturnType<typeof vi.fn>;
  upsertDates: ReturnType<typeof vi.fn>;
  getDateStatus: ReturnType<typeof vi.fn>;
};

const mockArtistRepo = artistRepository as unknown as {
  findByUserId: ReturnType<typeof vi.fn>;
};

const mockRedis = redis as unknown as {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  scan: ReturnType<typeof vi.fn>;
};

describe('CalendarService', () => {
  let service: CalendarService;

  beforeEach(() => {
    service = new CalendarService();
    vi.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.scan.mockResolvedValue(['0', []]);
  });

  describe('getAvailability', () => {
    it('should return cached data if available', async () => {
      const cached = [{ date: '2026-04-01', status: 'available' }];
      mockRedis.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.getAvailability('artist-1', '2026-04-01', '2026-04-30');

      expect(result).toEqual(cached);
      expect(mockCalRepo.getRange).not.toHaveBeenCalled();
    });

    it('should query DB and cache when no cache hit', async () => {
      const entries = [{ date: '2026-04-01', status: 'available' }];
      mockCalRepo.getRange.mockResolvedValue(entries);

      const result = await service.getAvailability('artist-1', '2026-04-01', '2026-04-30');

      expect(mockCalRepo.getRange).toHaveBeenCalledWith('artist-1', '2026-04-01', '2026-04-30');
      expect(mockRedis.set).toHaveBeenCalledWith(
        'calendar:artist-1:2026-04-01:2026-04-30',
        JSON.stringify(entries),
        'EX',
        300,
      );
      expect(result).toEqual(entries);
    });
  });

  describe('updateAvailability', () => {
    it('should update dates for valid artist', async () => {
      mockArtistRepo.findByUserId.mockResolvedValue({ id: 'artist-1' });
      mockCalRepo.getDateStatus.mockResolvedValue(null);
      mockCalRepo.upsertDates.mockResolvedValue([{ date: '2026-04-15', status: 'held' }]);

      const result = await service.updateAvailability('user-1', [
        { date: '2026-04-15', status: 'held' },
      ]);

      expect(mockCalRepo.upsertDates).toHaveBeenCalledWith('artist-1', [
        { date: '2026-04-15', status: 'held' },
      ]);
      expect(result).toHaveLength(1);
    });

    it('should throw when artist profile not found', async () => {
      mockArtistRepo.findByUserId.mockResolvedValue(null);

      await expect(
        service.updateAvailability('user-1', [{ date: '2026-04-15', status: 'available' }]),
      ).rejects.toThrow('Artist profile not found');
    });

    it('should reject manually setting booked status', async () => {
      mockArtistRepo.findByUserId.mockResolvedValue({ id: 'artist-1' });

      await expect(
        service.updateAvailability('user-1', [{ date: '2026-04-15', status: 'booked' }]),
      ).rejects.toThrow('Cannot manually set booked status');
    });

    it('should reject modifying a booked date', async () => {
      mockArtistRepo.findByUserId.mockResolvedValue({ id: 'artist-1' });
      mockCalRepo.getDateStatus.mockResolvedValue({ status: 'booked' });

      await expect(
        service.updateAvailability('user-1', [{ date: '2026-04-15', status: 'available' }]),
      ).rejects.toThrow('already booked');
    });
  });

  describe('getPublicAvailability', () => {
    it('should mask held/booked as unavailable', async () => {
      const entries = [
        { date: '2026-04-01', status: 'available' },
        { date: '2026-04-02', status: 'held' },
        { date: '2026-04-03', status: 'booked' },
      ];
      mockCalRepo.getRange.mockResolvedValue(entries);

      const result = await service.getPublicAvailability('artist-1', '2026-04-01', '2026-04-30');

      expect(result).toEqual([
        { date: '2026-04-01', status: 'available' },
        { date: '2026-04-02', status: 'unavailable' },
        { date: '2026-04-03', status: 'unavailable' },
      ]);
    });
  });
});
