import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../artist.repository.js', () => ({
  artistRepository: {
    findByUserId: vi.fn(),
    findPublicById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    list: vi.fn(),
  },
}));

vi.mock('../../../infrastructure/database.js', () => ({
  db: vi.fn(() => ({
    where: vi.fn().mockReturnThis(),
    join: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  })),
}));

import { artistRepository } from '../artist.repository.js';
import { ArtistService, ArtistError } from '../artist.service.js';

const mockRepo = artistRepository as unknown as {
  findByUserId: ReturnType<typeof vi.fn>;
  findPublicById: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  list: ReturnType<typeof vi.fn>;
};

describe('ArtistService', () => {
  let service: ArtistService;

  const profileData = {
    stage_name: 'DJ Test',
    bio: 'A test bio',
    genres: ['EDM', 'Bollywood'],
    languages: ['Hindi', 'English'],
    base_city: 'Mumbai',
    travel_radius_km: 100,
    event_types: ['Wedding', 'Corporate'],
    performance_duration_min: 60,
    performance_duration_max: 180,
    pricing: [{ event_type: 'Wedding', city_tier: 'tier_1', min_price: 50000, max_price: 200000 }],
  };

  beforeEach(() => {
    service = new ArtistService();
    vi.clearAllMocks();
  });

  describe('createProfile', () => {
    it('should create a profile when none exists', async () => {
      mockRepo.findByUserId.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({ id: 'artist-1', user_id: 'user-1', ...profileData });

      const result = await service.createProfile('user-1', profileData);

      expect(mockRepo.findByUserId).toHaveBeenCalledWith('user-1');
      expect(mockRepo.create).toHaveBeenCalledWith({ ...profileData, user_id: 'user-1' });
      expect(result.id).toBe('artist-1');
    });

    it('should throw PROFILE_EXISTS if profile already exists', async () => {
      mockRepo.findByUserId.mockResolvedValue({ id: 'existing' });

      await expect(service.createProfile('user-1', profileData)).rejects.toThrow(ArtistError);
      await expect(service.createProfile('user-1', profileData)).rejects.toThrow('Artist profile already exists');
    });
  });

  describe('getOwnProfile', () => {
    it('should return profile with media', async () => {
      mockRepo.findByUserId.mockResolvedValue({ id: 'artist-1', stage_name: 'DJ Test' });

      const result = await service.getOwnProfile('user-1');

      expect(result.id).toBe('artist-1');
      expect(result).toHaveProperty('media');
    });

    it('should throw PROFILE_NOT_FOUND when no profile', async () => {
      mockRepo.findByUserId.mockResolvedValue(null);

      await expect(service.getOwnProfile('user-1')).rejects.toThrow('Artist profile not found');
    });
  });

  describe('getPublicProfile', () => {
    it('should return public profile with media and reviews', async () => {
      mockRepo.findPublicById.mockResolvedValue({ id: 'artist-1', stage_name: 'DJ Test' });

      const result = await service.getPublicProfile('artist-1');

      expect(result.id).toBe('artist-1');
      expect(result).toHaveProperty('media');
      expect(result).toHaveProperty('reviews');
    });

    it('should throw PROFILE_NOT_FOUND for invalid ID', async () => {
      mockRepo.findPublicById.mockResolvedValue(null);

      await expect(service.getPublicProfile('invalid-id')).rejects.toThrow('Artist not found');
    });
  });

  describe('updateProfile', () => {
    it('should update when profile exists', async () => {
      mockRepo.findByUserId.mockResolvedValue({ id: 'artist-1' });
      mockRepo.update.mockResolvedValue({ id: 'artist-1', stage_name: 'New Name' });

      const result = await service.updateProfile('user-1', { stage_name: 'New Name' });

      expect(mockRepo.update).toHaveBeenCalledWith('user-1', { stage_name: 'New Name' });
      expect(result.stage_name).toBe('New Name');
    });

    it('should throw when profile not found', async () => {
      mockRepo.findByUserId.mockResolvedValue(null);

      await expect(service.updateProfile('user-1', { stage_name: 'X' })).rejects.toThrow('Artist profile not found');
    });

    it('should reject invalid pricing (max < min)', async () => {
      mockRepo.findByUserId.mockResolvedValue({ id: 'artist-1' });

      await expect(
        service.updateProfile('user-1', {
          pricing: [{ event_type: 'Wedding', city_tier: 'tier_1', min_price: 100000, max_price: 50000 }],
        }),
      ).rejects.toThrow('max_price must be >= min_price');
    });

    it('should reject invalid duration (max < min)', async () => {
      mockRepo.findByUserId.mockResolvedValue({ id: 'artist-1' });

      await expect(
        service.updateProfile('user-1', {
          performance_duration_min: 120,
          performance_duration_max: 30,
        }),
      ).rejects.toThrow('max duration must be >= min duration');
    });
  });

  describe('listArtists', () => {
    it('should delegate to repository', async () => {
      mockRepo.list.mockResolvedValue({ data: [], total: 0 });

      const result = await service.listArtists({ page: 1, per_page: 20, city: 'Mumbai' });

      expect(mockRepo.list).toHaveBeenCalledWith({ page: 1, per_page: 20, city: 'Mumbai' });
      expect(result.total).toBe(0);
    });
  });
});
