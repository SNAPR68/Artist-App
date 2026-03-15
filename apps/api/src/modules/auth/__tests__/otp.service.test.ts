import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted — factory must not reference outer variables
vi.mock('../../../infrastructure/redis.js', () => ({
  redis: {
    exists: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$10$hashedotp'),
    compare: vi.fn(),
  },
}));

// Import AFTER mocks are set up
import { redis } from '../../../infrastructure/redis.js';
import bcrypt from 'bcrypt';
import { OTPService, OTPError } from '../otp.service.js';

const mockRedis = redis as unknown as {
  exists: ReturnType<typeof vi.fn>;
  incr: ReturnType<typeof vi.fn>;
  expire: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
};

describe('OTPService', () => {
  let service: OTPService;

  beforeEach(() => {
    service = new OTPService();
    vi.clearAllMocks();
    mockRedis.exists.mockResolvedValue(0);
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue('OK');
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.del.mockResolvedValue(1);
  });

  describe('generate', () => {
    it('should generate a 6-digit OTP', async () => {
      const result = await service.generate('9876543210');
      expect(result.otp).toMatch(/^\d{6}$/);
      expect(result.expiresInSeconds).toBe(300);
    });

    it('should store bcrypt hash in Redis with TTL', async () => {
      await service.generate('9876543210');
      expect(mockRedis.set).toHaveBeenCalledWith(
        'otp:9876543210',
        expect.any(String),
        'EX',
        300,
      );
    });

    it('should throw on lockout', async () => {
      mockRedis.exists.mockResolvedValue(1);
      await expect(service.generate('9876543210')).rejects.toThrow(OTPError);
    });

    it('should throw on rate limit exceeded', async () => {
      mockRedis.incr.mockResolvedValue(6);
      await expect(service.generate('9876543210')).rejects.toThrow('Too many OTP requests');
    });

    it('should reset verify attempts on new OTP generation', async () => {
      await service.generate('9876543210');
      expect(mockRedis.del).toHaveBeenCalledWith('otp_attempts:9876543210');
    });
  });

  describe('verify', () => {
    beforeEach(() => {
      mockRedis.get.mockResolvedValue('$2b$10$hashedotp');
    });

    it('should return true for valid OTP', async () => {
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      const result = await service.verify('9876543210', '123456');
      expect(result).toBe(true);
    });

    it('should clean up on successful verification', async () => {
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      await service.verify('9876543210', '123456');
      expect(mockRedis.del).toHaveBeenCalledWith('otp:9876543210');
      expect(mockRedis.del).toHaveBeenCalledWith('otp_attempts:9876543210');
    });

    it('should return false for invalid OTP', async () => {
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      const result = await service.verify('9876543210', '000000');
      expect(result).toBe(false);
    });

    it('should throw OTP_EXPIRED when no OTP stored', async () => {
      mockRedis.get.mockResolvedValue(null);
      await expect(service.verify('9876543210', '123456')).rejects.toThrow('OTP has expired');
    });

    it('should lock out after 3 failed attempts', async () => {
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      mockRedis.incr.mockResolvedValue(3);
      await expect(service.verify('9876543210', '000000')).rejects.toThrow(OTPError);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'otp_lockout:9876543210',
        '1',
        'EX',
        900,
      );
    });
  });
});
