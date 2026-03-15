import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { redis } from '../../infrastructure/redis.js';
import { config } from '../../config/index.js';
import type { UserRole } from '@artist-booking/shared';

const TOKEN_BLACKLIST_PREFIX = 'jwt_blacklist:';
const REFRESH_TOKEN_PREFIX = 'refresh:';

export interface TokenPayload {
  user_id: string;
  role: UserRole;
  phone: string;
  jti: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
}

// Load RSA keys or fall back to HMAC secret for development
let privateKey: string | Buffer;
let publicKey: string | Buffer;
let algorithm: jwt.Algorithm;

if (config.JWT_PRIVATE_KEY_PATH && existsSync(config.JWT_PRIVATE_KEY_PATH)) {
  privateKey = readFileSync(config.JWT_PRIVATE_KEY_PATH);
  publicKey = readFileSync(config.JWT_PUBLIC_KEY_PATH!);
  algorithm = 'RS256';
} else {
  // Development fallback: use HMAC with PII encryption key
  privateKey = config.PII_ENCRYPTION_KEY;
  publicKey = config.PII_ENCRYPTION_KEY;
  algorithm = 'HS256';
}

export class JWTService {
  /**
   * Generate an access + refresh token pair for a user
   */
  async generateTokenPair(payload: Omit<TokenPayload, 'jti'>): Promise<TokenPair> {
    const jti = randomBytes(16).toString('hex');

    const access_token = jwt.sign(
      { ...payload, jti },
      privateKey,
      {
        algorithm,
        expiresIn: config.JWT_ACCESS_TOKEN_EXPIRY as string,
        issuer: 'artist-booking-api',
      } as jwt.SignOptions,
    );

    // Refresh token: random string stored in Redis
    const refresh_token = randomBytes(48).toString('hex');
    const refreshTTL = parseDuration(config.JWT_REFRESH_TOKEN_EXPIRY);

    await redis.set(
      `${REFRESH_TOKEN_PREFIX}${refresh_token}`,
      JSON.stringify({ user_id: payload.user_id, role: payload.role, phone: payload.phone }),
      'EX',
      refreshTTL,
    );

    return {
      access_token,
      refresh_token,
      expires_in: parseDuration(config.JWT_ACCESS_TOKEN_EXPIRY),
    };
  }

  /**
   * Verify and decode an access token
   */
  async verifyAccessToken(token: string): Promise<TokenPayload> {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: [algorithm],
      issuer: 'artist-booking-api',
    }) as TokenPayload;

    // Check if token has been revoked
    const isBlacklisted = await redis.exists(`${TOKEN_BLACKLIST_PREFIX}${decoded.jti}`);
    if (isBlacklisted) {
      throw new JWTError('TOKEN_REVOKED', 'Token has been revoked', 401);
    }

    return decoded;
  }

  /**
   * Refresh: consume the refresh token (single-use) and issue a new pair
   */
  async refreshTokenPair(refreshToken: string): Promise<TokenPair> {
    const key = `${REFRESH_TOKEN_PREFIX}${refreshToken}`;
    const stored = await redis.get(key);

    if (!stored) {
      throw new JWTError('INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired', 401);
    }

    // Single-use: delete immediately
    await redis.del(key);

    const payload = JSON.parse(stored) as { user_id: string; role: UserRole; phone: string };
    return this.generateTokenPair(payload);
  }

  /**
   * Revoke an access token by adding its JTI to the blacklist
   */
  async revokeAccessToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as TokenPayload & { exp: number };
      if (!decoded?.jti || !decoded?.exp) return;

      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await redis.set(`${TOKEN_BLACKLIST_PREFIX}${decoded.jti}`, '1', 'EX', ttl);
      }
    } catch {
      // Token already invalid, nothing to revoke
    }
  }

  /**
   * Revoke a refresh token
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    await redis.del(`${REFRESH_TOKEN_PREFIX}${refreshToken}`);
  }
}

export class JWTError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'JWTError';
  }
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 86400; // default 24h
  const [, value, unit] = match;
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return parseInt(value) * (multipliers[unit] ?? 3600);
}

export const jwtService = new JWTService();
