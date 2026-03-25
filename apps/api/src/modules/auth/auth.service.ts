import { db } from '../../infrastructure/database.js';
import { encryptPII, hashForSearch } from '../../infrastructure/encryption.js';
import { otpService } from './otp.service.js';
import { jwtService } from './jwt.service.js';
import { smsService } from './sms.service.js';
import type { UserRole } from '@artist-booking/shared';
import type { TokenPair } from './jwt.service.js';

export interface AuthResult {
  tokens: TokenPair;
  user: {
    id: string;
    phone: string;
    role: UserRole;
    is_new: boolean;
  };
}

export class AuthService {
  /**
   * Generate and send OTP to phone number
   */
  async generateOTP(phone: string): Promise<{ expiresInSeconds: number }> {
    const { otp, expiresInSeconds } = await otpService.generate(phone);
    await smsService.sendOTP(phone, otp);
    return { expiresInSeconds };
  }

  /**
   * Verify OTP and return tokens.
   * Creates a new user if first-time login.
   */
  async verifyOTP(phone: string, otp: string, role?: UserRole): Promise<AuthResult> {
    const isValid = await otpService.verify(phone, otp);
    if (!isValid) {
      throw new AuthError('INVALID_OTP', 'The OTP entered is incorrect.', 401);
    }

    // Look up user by phone hash
    const phoneHash = hashForSearch(phone);
    let user = await db('users')
      .where({ phone_hash: phoneHash, deleted_at: null })
      .first();

    let isNew = false;

    if (!user) {
      // First-time user — create account
      if (!role) {
        throw new AuthError('ROLE_REQUIRED', 'Role is required for new users.', 400);
      }

      const encryptedPhone = encryptPII(phone);
      [user] = await db('users')
        .insert({
          phone: encryptedPhone,
          phone_hash: phoneHash,
          role,
          is_active: true,
          last_login_at: db.fn.now(),
        })
        .returning('*');

      isNew = true;
    } else {
      // Existing user — update last login
      await db('users').where({ id: user.id }).update({ last_login_at: db.fn.now() });
    }

    // Generate token pair
    const tokens = await jwtService.generateTokenPair({
      user_id: user.id,
      role: user.role,
      phone,
    });

    return {
      tokens,
      user: {
        id: user.id,
        phone,
        role: user.role,
        is_new: isNew,
      },
    };
  }

  /**
   * Refresh token pair
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    return jwtService.refreshTokenPair(refreshToken);
  }

  /**
   * Logout: revoke both access and refresh tokens.
   * If a specific refresh token is provided, revoke it.
   * Otherwise, revoke ALL refresh tokens for this user to prevent session leakage.
   */
  async logout(accessToken: string, refreshToken?: string, userId?: string): Promise<void> {
    await jwtService.revokeAccessToken(accessToken);
    if (refreshToken) {
      await jwtService.revokeRefreshToken(refreshToken);
    } else if (userId) {
      // No refresh token sent — revoke all refresh tokens for this user
      await db('refresh_tokens')
        .where({ user_id: userId, revoked_at: null })
        .update({ revoked_at: db.fn.now() });
    }
  }
}

export class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export const authService = new AuthService();
