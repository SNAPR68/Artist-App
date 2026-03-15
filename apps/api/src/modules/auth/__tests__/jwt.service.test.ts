import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../infrastructure/redis.js', () => ({
  redis: {
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn(),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('../../../config/index.js', () => ({
  config: {
    JWT_PRIVATE_KEY_PATH: undefined,
    JWT_PUBLIC_KEY_PATH: undefined,
    JWT_ACCESS_TOKEN_EXPIRY: '24h',
    JWT_REFRESH_TOKEN_EXPIRY: '7d',
    PII_ENCRYPTION_KEY: 'test-key-that-is-32-chars-long!!',
  },
}));

import { redis } from '../../../infrastructure/redis.js';
import { JWTService, JWTError } from '../jwt.service.js';
import { UserRole } from '@artist-booking/shared';

const mockRedis = redis as unknown as {
  set: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  exists: ReturnType<typeof vi.fn>;
};

describe('JWTService', () => {
  let service: JWTService;

  beforeEach(() => {
    service = new JWTService();
    vi.clearAllMocks();
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.del.mockResolvedValue(1);
    mockRedis.exists.mockResolvedValue(0);
  });

  describe('generateTokenPair', () => {
    it('should return access_token, refresh_token, and expires_in', async () => {
      const result = await service.generateTokenPair({
        user_id: '123',
        role: UserRole.ARTIST,
        phone: '9876543210',
      });

      expect(result.access_token).toBeTruthy();
      expect(result.refresh_token).toBeTruthy();
      expect(result.expires_in).toBe(86400);
    });

    it('should store refresh token in Redis', async () => {
      const result = await service.generateTokenPair({
        user_id: '123',
        role: UserRole.ARTIST,
        phone: '9876543210',
      });

      expect(mockRedis.set).toHaveBeenCalledWith(
        `refresh:${result.refresh_token}`,
        expect.any(String),
        'EX',
        expect.any(Number),
      );
    });
  });

  describe('verifyAccessToken', () => {
    it('should decode a valid token', async () => {
      const pair = await service.generateTokenPair({
        user_id: '123',
        role: UserRole.CLIENT,
        phone: '9876543210',
      });

      const decoded = await service.verifyAccessToken(pair.access_token);
      expect(decoded.user_id).toBe('123');
      expect(decoded.role).toBe(UserRole.CLIENT);
      expect(decoded.jti).toBeTruthy();
    });

    it('should throw for revoked token', async () => {
      const pair = await service.generateTokenPair({
        user_id: '123',
        role: UserRole.ARTIST,
        phone: '9876543210',
      });

      mockRedis.exists.mockResolvedValue(1);
      await expect(service.verifyAccessToken(pair.access_token)).rejects.toThrow(JWTError);
    });

    it('should throw for invalid token', async () => {
      await expect(service.verifyAccessToken('invalid.token.here')).rejects.toThrow();
    });
  });

  describe('refreshTokenPair', () => {
    it('should consume refresh token and issue new pair', async () => {
      const original = await service.generateTokenPair({
        user_id: '123',
        role: UserRole.AGENT,
        phone: '9876543210',
      });

      mockRedis.get.mockResolvedValue(
        JSON.stringify({ user_id: '123', role: UserRole.AGENT, phone: '9876543210' }),
      );

      const newPair = await service.refreshTokenPair(original.refresh_token);
      expect(newPair.access_token).toBeTruthy();
      expect(newPair.refresh_token).not.toBe(original.refresh_token);
      expect(mockRedis.del).toHaveBeenCalledWith(`refresh:${original.refresh_token}`);
    });

    it('should throw for invalid refresh token', async () => {
      mockRedis.get.mockResolvedValue(null);
      await expect(service.refreshTokenPair('nonexistent')).rejects.toThrow(JWTError);
    });
  });

  describe('revokeAccessToken', () => {
    it('should blacklist the token JTI', async () => {
      const pair = await service.generateTokenPair({
        user_id: '123',
        role: UserRole.ARTIST,
        phone: '9876543210',
      });

      await service.revokeAccessToken(pair.access_token);
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('jwt_blacklist:'),
        '1',
        'EX',
        expect.any(Number),
      );
    });
  });
});
