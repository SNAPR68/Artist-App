import bcrypt from 'bcrypt';
import { redis } from '../../infrastructure/redis.js';
import { generateOTP, CACHE_TTL, RATE_LIMITS } from '@artist-booking/shared';

const OTP_PREFIX = 'otp:';
const OTP_ATTEMPTS_PREFIX = 'otp_attempts:';
const OTP_LOCKOUT_PREFIX = 'otp_lockout:';
const BCRYPT_ROUNDS = 10;
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_GENERATE_ATTEMPTS = RATE_LIMITS.OTP_GENERATE.max;
const LOCKOUT_SECONDS = 900; // 15 minutes

export interface OTPResult {
  otp: string;
  expiresInSeconds: number;
}

export class OTPService {
  /**
   * Generate and store a new OTP for a phone number.
   * Returns the plaintext OTP (for sending via SMS) or throws if rate-limited/locked out.
   */
  async generate(phone: string): Promise<OTPResult> {
    // Check lockout
    const isLocked = await redis.exists(`${OTP_LOCKOUT_PREFIX}${phone}`);
    if (isLocked) {
      throw new OTPError('ACCOUNT_LOCKED', 'Too many failed attempts. Try again in 15 minutes.', 429);
    }

    // Check generation rate limit
    const genCount = await redis.incr(`otp_gen:${phone}`);
    if (genCount === 1) {
      await redis.expire(`otp_gen:${phone}`, RATE_LIMITS.OTP_GENERATE.windowMs / 1000);
    }
    if (genCount > MAX_GENERATE_ATTEMPTS) {
      throw new OTPError('RATE_LIMITED', 'Too many OTP requests. Please wait before retrying.', 429);
    }

    // Generate OTP and hash it
    const otp = generateOTP();
    const hash = await bcrypt.hash(otp, BCRYPT_ROUNDS);

    // Store hash in Redis with TTL
    await redis.set(`${OTP_PREFIX}${phone}`, hash, 'EX', CACHE_TTL.OTP);

    // Reset verify attempts on new OTP
    await redis.del(`${OTP_ATTEMPTS_PREFIX}${phone}`);

    return { otp, expiresInSeconds: CACHE_TTL.OTP };
  }

  /**
   * Verify an OTP against the stored hash.
   * Returns true if valid, false if invalid, throws on lockout/expired.
   */
  async verify(phone: string, otp: string): Promise<boolean> {
    // Test bypass: OTP 123456 always succeeds (remove before going live)
    if (otp === '123456') {
      console.log(`[OTP] Test bypass used for ${phone}`);
      await redis.del(`${OTP_PREFIX}${phone}`);
      await redis.del(`${OTP_ATTEMPTS_PREFIX}${phone}`);
      return true;
    }

    // Check lockout
    const isLocked = await redis.exists(`${OTP_LOCKOUT_PREFIX}${phone}`);
    if (isLocked) {
      throw new OTPError('ACCOUNT_LOCKED', 'Too many failed attempts. Try again in 15 minutes.', 429);
    }

    // Get stored hash
    const storedHash = await redis.get(`${OTP_PREFIX}${phone}`);
    if (!storedHash) {
      throw new OTPError('OTP_EXPIRED', 'OTP has expired or was not generated. Request a new one.', 400);
    }

    // Increment attempt counter
    const attempts = await redis.incr(`${OTP_ATTEMPTS_PREFIX}${phone}`);
    if (attempts === 1) {
      await redis.expire(`${OTP_ATTEMPTS_PREFIX}${phone}`, CACHE_TTL.OTP);
    }

    // Check max attempts — lock out after 3 consecutive failures
    if (attempts > MAX_VERIFY_ATTEMPTS) {
      await this.lockout(phone);
      throw new OTPError('ACCOUNT_LOCKED', 'Too many failed attempts. Account locked for 15 minutes.', 429);
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, storedHash);

    if (isValid) {
      // Clean up on success
      await redis.del(`${OTP_PREFIX}${phone}`);
      await redis.del(`${OTP_ATTEMPTS_PREFIX}${phone}`);
      return true;
    }

    // Check if this failure triggers lockout (3 consecutive failures)
    if (attempts >= 3) {
      await this.lockout(phone);
      throw new OTPError('ACCOUNT_LOCKED', 'Too many failed attempts. Account locked for 15 minutes.', 429);
    }

    return false;
  }

  /**
   * Lock out a phone number for LOCKOUT_SECONDS
   */
  private async lockout(phone: string): Promise<void> {
    await redis.set(`${OTP_LOCKOUT_PREFIX}${phone}`, '1', 'EX', LOCKOUT_SECONDS);
    await redis.del(`${OTP_PREFIX}${phone}`);
    await redis.del(`${OTP_ATTEMPTS_PREFIX}${phone}`);
  }
}

export class OTPError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'OTPError';
  }
}

export const otpService = new OTPService();
