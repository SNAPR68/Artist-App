/**
 * Event Company OS pivot (2026-04-22) — Instagram OAuth routes.
 *
 * GET  /v1/instagram/connect    — Returns FB OAuth URL (state HMAC-signed w/ user_id)
 * GET  /v1/instagram/callback   — OAuth redirect target; exchanges + persists token
 * GET  /v1/instagram/status     — Connection status + profile snapshot
 * POST /v1/instagram/sync       — Force-refresh follower/media counts
 * POST /v1/instagram/refresh    — Extend long-lived token (60-day roll)
 * POST /v1/instagram/disconnect — Deactivate the connection
 * GET  /v1/instagram/media      — Recent posts (for microsite + EPK bundle)
 */
import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { db } from '../../infrastructure/database.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import { instagramService } from './instagram.service.js';

function signState(userId: string): string {
  const secret = process.env.PII_ENCRYPTION_KEY ?? '';
  const sig = crypto.createHmac('sha256', secret).update(userId).digest('hex').slice(0, 16);
  return `${sig}:${userId}`;
}

function verifyState(state: string): string | null {
  const [sig, userId] = state.split(':');
  if (!userId || !sig) return null;
  const secret = process.env.PII_ENCRYPTION_KEY ?? '';
  const expected = crypto.createHmac('sha256', secret).update(userId).digest('hex').slice(0, 16);
  return sig === expected ? userId : null;
}

async function findVendorProfile(userId: string) {
  return db('artist_profiles').where({ user_id: userId }).first();
}

export async function instagramRoutes(app: FastifyInstance) {
  /** GET /v1/instagram/connect — begin OAuth */
  app.get('/v1/instagram/connect', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (request, reply) => {
    const state = signState(request.user!.user_id);
    const url = instagramService.buildAuthUrl(state);
    return reply.send({ success: true, data: { auth_url: url }, errors: [] });
  });

  /** GET /v1/instagram/callback?code=...&state=... — OAuth redirect */
  app.get<{ Querystring: { code?: string; state?: string; error?: string; error_description?: string } }>(
    '/v1/instagram/callback',
    async (request, reply) => {
      const { code, state, error, error_description } = request.query;
      if (error) {
        return reply.status(400).send({
          success: false,
          errors: [{ code: 'OAUTH_DENIED', message: error_description ?? error }],
        });
      }
      if (!code || !state) {
        return reply.status(400).send({
          success: false,
          errors: [{ code: 'MISSING_PARAMS', message: 'code and state required' }],
        });
      }
      const userId = verifyState(state);
      if (!userId) {
        return reply.status(400).send({
          success: false,
          errors: [{ code: 'INVALID_STATE', message: 'State signature mismatch' }],
        });
      }
      const profile = await findVendorProfile(userId);
      if (!profile) {
        return reply.status(404).send({
          success: false,
          errors: [{ code: 'NO_VENDOR_PROFILE', message: 'Vendor profile not found' }],
        });
      }

      try {
        const result = await instagramService.connect(profile.id, userId, code);
        const webBase = process.env.PUBLIC_WEB_URL ?? 'http://localhost:3100';
        return reply.redirect(
          `${webBase}/artist/settings/integrations?instagram=connected&username=${encodeURIComponent(result.ig_username)}`,
        );
      } catch (e: any) {
        return reply.status(400).send({
          success: false,
          errors: [{ code: 'IG_CONNECT_FAILED', message: e?.message ?? 'Instagram connection failed' }],
        });
      }
    },
  );

  /** GET /v1/instagram/status */
  app.get('/v1/instagram/status', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (request, reply) => {
    const profile = await findVendorProfile(request.user!.user_id);
    if (!profile) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NO_VENDOR_PROFILE', message: 'Vendor profile not found' }],
      });
    }
    const status = await instagramService.status(profile.id);
    return reply.send({ success: true, data: status, errors: [] });
  });

  /** POST /v1/instagram/sync */
  app.post('/v1/instagram/sync', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const profile = await findVendorProfile(request.user!.user_id);
    if (!profile) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NO_VENDOR_PROFILE', message: 'Vendor profile not found' }],
      });
    }
    try {
      const data = await instagramService.sync(profile.id);
      return reply.send({ success: true, data, errors: [] });
    } catch (e: any) {
      return reply.status(400).send({
        success: false,
        errors: [{ code: 'IG_SYNC_FAILED', message: e?.message ?? 'sync failed' }],
      });
    }
  });

  /** POST /v1/instagram/refresh — extend long-lived token */
  app.post('/v1/instagram/refresh', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const profile = await findVendorProfile(request.user!.user_id);
    if (!profile) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NO_VENDOR_PROFILE', message: 'Vendor profile not found' }],
      });
    }
    try {
      const data = await instagramService.refresh(profile.id);
      return reply.send({ success: true, data, errors: [] });
    } catch (e: any) {
      return reply.status(400).send({
        success: false,
        errors: [{ code: 'IG_REFRESH_FAILED', message: e?.message ?? 'refresh failed' }],
      });
    }
  });

  /** POST /v1/instagram/disconnect */
  app.post('/v1/instagram/disconnect', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const profile = await findVendorProfile(request.user!.user_id);
    if (!profile) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NO_VENDOR_PROFILE', message: 'Vendor profile not found' }],
      });
    }
    await instagramService.disconnect(profile.id);
    return reply.send({ success: true, data: { disconnected: true }, errors: [] });
  });

  /** GET /v1/instagram/media?limit=12 — recent posts */
  app.get<{ Querystring: { limit?: string } }>('/v1/instagram/media', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (request, reply) => {
    const profile = await findVendorProfile(request.user!.user_id);
    if (!profile) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NO_VENDOR_PROFILE', message: 'Vendor profile not found' }],
      });
    }
    const limit = Math.min(50, Math.max(1, parseInt(request.query.limit ?? '12')));
    try {
      const data = await instagramService.recentMedia(profile.id, limit);
      return reply.send({ success: true, data, errors: [] });
    } catch (e: any) {
      return reply.status(400).send({
        success: false,
        errors: [{ code: 'IG_MEDIA_FAILED', message: e?.message ?? 'media fetch failed' }],
      });
    }
  });

  /**
   * GET /v1/instagram/public/:vendorProfileId
   * Public snapshot (no auth) for microsite rendering — only returns public-safe
   * fields. Never exposes the access token or FB page/user IDs.
   */
  app.get<{ Params: { vendorProfileId: string } }>('/v1/instagram/public/:vendorProfileId', {
    preHandler: [rateLimit('READ')],
  }, async (request, reply) => {
    const row = await db('instagram_connections')
      .where({ vendor_profile_id: request.params.vendorProfileId, is_active: true })
      .first();
    if (!row) {
      return reply.send({ success: true, data: { connected: false }, errors: [] });
    }
    return reply
      .header('Cache-Control', 'public, max-age=300, s-maxage=300')
      .send({
        success: true,
        data: {
          connected: true,
          ig_username: row.ig_username,
          follower_count: row.follower_count,
          media_count: row.media_count,
          profile_picture_url: row.profile_picture_url,
          biography: row.biography,
        },
        errors: [],
      });
  });
}
