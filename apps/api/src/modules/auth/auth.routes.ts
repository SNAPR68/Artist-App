import type { FastifyInstance } from 'fastify';
import { authService } from './auth.service.js';
import { generateOtpSchema, verifyOtpSchema, refreshTokenSchema } from '@artist-booking/shared';
import { authMiddleware } from '../../middleware/auth.middleware.js';

export async function authRoutes(app: FastifyInstance) {
  /**
   * POST /v1/auth/otp/generate
   * Send OTP to phone number
   */
  app.post('/v1/auth/otp/generate', async (request, reply) => {
    const body = generateOtpSchema.parse(request.body);

    const result = await authService.generateOTP(body.phone);

    return reply.status(200).send({
      success: true,
      data: {
        message: 'OTP sent successfully',
        expires_in_seconds: result.expiresInSeconds,
      },
      errors: [],
    });
  });

  /**
   * POST /v1/auth/otp/verify
   * Verify OTP and get tokens
   */
  app.post('/v1/auth/otp/verify', async (request, reply) => {
    const body = verifyOtpSchema.parse(request.body);

    const result = await authService.verifyOTP(body.phone, body.otp, body.role);

    return reply.status(200).send({
      success: true,
      data: {
        access_token: result.tokens.access_token,
        refresh_token: result.tokens.refresh_token,
        expires_in: result.tokens.expires_in,
        user: result.user,
      },
      errors: [],
    });
  });

  /**
   * POST /v1/auth/token/refresh
   * Refresh access token using refresh token (single-use rotation)
   */
  app.post('/v1/auth/token/refresh', async (request, reply) => {
    const body = refreshTokenSchema.parse(request.body);

    const tokens = await authService.refreshToken(body.refresh_token);

    return reply.status(200).send({
      success: true,
      data: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
      },
      errors: [],
    });
  });

  /**
   * POST /v1/auth/logout
   * Revoke current tokens
   */
  app.post('/v1/auth/logout', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const authHeader = request.headers.authorization;
    const accessToken = authHeader?.replace('Bearer ', '') ?? '';
    const refreshToken = (request.body as { refresh_token?: string })?.refresh_token;

    await authService.logout(accessToken, refreshToken);

    return reply.status(200).send({
      success: true,
      data: { message: 'Logged out successfully' },
      errors: [],
    });
  });
}
