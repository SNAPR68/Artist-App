import type { FastifyInstance } from 'fastify';
import { calendarService } from './calendar.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validateBody } from '../../middleware/validation.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import { updateCalendarSchema } from '@artist-booking/shared';
import { db } from '../../infrastructure/database.js';
import crypto from 'node:crypto';
import { googleCalendarService } from './google-calendar.service.js';

export async function calendarRoutes(app: FastifyInstance) {
  /**
   * GET /v1/calendar — Get own availability (authenticated artist)
   */
  app.get('/v1/calendar', {
    preHandler: [authMiddleware, requirePermission('calendar:read_own')],
  }, async (request, reply) => {
    const query = request.query as { start_date: string; end_date: string };

    // Default to current month if not provided
    const now = new Date();
    const startDate = query.start_date ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = query.end_date ?? new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    // Look up artist by user ID
    const { artistRepository } = await import('../artist/artist.repository.js');
    const artist = await artistRepository.findByUserId(request.user!.user_id);
    if (!artist) {
      return reply.status(404).send({ success: false, data: null, errors: [{ code: 'PROFILE_NOT_FOUND', message: 'Artist profile not found' }] });
    }

    const entries = await calendarService.getAvailability(artist.id, startDate, endDate);

    return reply.send({
      success: true,
      data: entries,
      errors: [],
    });
  });

  /**
   * PUT /v1/calendar — Update availability dates
   */
  app.put('/v1/calendar', {
    preHandler: [
      authMiddleware,
      requirePermission('calendar:update_own'),
      rateLimit('WRITE'),
      validateBody(updateCalendarSchema),
    ],
  }, async (request, reply) => {
    const { dates } = request.body as { dates: { date: string; status: 'available' | 'held' | 'booked'; notes?: string }[] };
    const result = await calendarService.updateAvailability(request.user!.user_id, dates);

    return reply.send({
      success: true,
      data: result,
      errors: [],
    });
  });

  /**
   * GET /v1/artists/:id/availability — Public availability view
   */
  app.get('/v1/artists/:id/availability', {
    preHandler: [rateLimit('READ')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as { start_date?: string; end_date?: string };

    const now = new Date();
    const startDate = query.start_date ?? now.toISOString().split('T')[0];
    const endDate = query.end_date ?? new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString().split('T')[0];

    const entries = await calendarService.getPublicAvailability(id, startDate, endDate);

    return reply.send({
      success: true,
      data: entries,
      errors: [],
    });
  });

  /**
   * POST /v1/calendar/ical/token — Generate or rotate the artist's iCal subscription token.
   * The token allows subscribing from Google / Apple / Outlook calendars.
   */
  app.post('/v1/calendar/ical/token', {
    preHandler: [authMiddleware, requirePermission('calendar:read_own')],
  }, async (request, reply) => {
    const userId = request.user!.user_id;
    const profile = await db('artist_profiles').where({ user_id: userId }).first();
    if (!profile) {
      return reply.status(404).send({ success: false, errors: [{ code: 'NOT_ARTIST', message: 'Artist profile not found' }] });
    }

    const token = crypto.randomBytes(24).toString('base64url');
    await db('artist_profiles').where({ id: profile.id }).update({ ical_token: token });

    const base = process.env.PUBLIC_API_URL ?? `${request.protocol}://${request.hostname}`;
    return reply.send({
      success: true,
      data: {
        token,
        ical_url: `${base}/v1/calendar/ical/${token}.ics`,
      },
      errors: [],
    });
  });

  /**
   * GET /v1/calendar/ical/:token.ics — Public iCal feed for artist subscription.
   * Token-authenticated (no session needed — the URL is the secret).
   */
  app.get<{ Params: { token: string } }>('/v1/calendar/ical/:token.ics', async (request, reply) => {
    const { token } = request.params;
    const profile = await db('artist_profiles').where({ ical_token: token }).first();
    if (!profile) return reply.status(404).send('Invalid token');

    // Pull confirmed/future bookings
    const bookings = await db('bookings')
      .where({ artist_id: profile.id })
      .whereIn('state', ['confirmed', 'pre_event', 'event_day', 'completed'])
      .whereNull('deleted_at')
      .select('id', 'event_date', 'event_type', 'event_city', 'event_venue', 'duration_hours');

    const fmtDate = (d: string) => d.replace(/-/g, '');
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const escape = (s: string) => (s ?? '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');

    const events = bookings.map((b) => [
      'BEGIN:VEVENT',
      `UID:grid-booking-${b.id}@grid.live`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${fmtDate(b.event_date as string)}`,
      `SUMMARY:${escape(b.event_type)} — ${escape(b.event_city)}`,
      `LOCATION:${escape(b.event_venue ?? b.event_city ?? '')}`,
      `DESCRIPTION:${escape(`GRID booking · ${b.duration_hours}h · ${b.event_type}`)}`,
      'END:VEVENT',
    ].join('\r\n'));

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//GRID//Artist Calendar//EN',
      'CALSCALE:GREGORIAN',
      `X-WR-CALNAME:${escape(profile.stage_name as string)} — GRID Bookings`,
      ...events,
      'END:VCALENDAR',
    ].join('\r\n');

    reply.header('Content-Type', 'text/calendar; charset=utf-8');
    reply.header('Cache-Control', 'public, max-age=300');
    return reply.send(ics);
  });

  // ─── Google Calendar 2-way sync ──────────────────────────────────────

  /**
   * GET /v1/calendar/google/connect — Returns Google OAuth URL for artist to authorize.
   * State parameter is the artist's user_id (signed, opaque to client).
   */
  app.get('/v1/calendar/google/connect', {
    preHandler: [authMiddleware, requirePermission('calendar:read_own')],
  }, async (request, reply) => {
    const userId = request.user!.user_id;
    const state = crypto.createHmac('sha256', process.env.PII_ENCRYPTION_KEY ?? '').update(userId).digest('hex').slice(0, 16) + ':' + userId;
    const url = googleCalendarService.buildAuthUrl(state);
    return reply.send({ success: true, data: { auth_url: url }, errors: [] });
  });

  /**
   * GET /v1/calendar/google/callback?code=...&state=... — OAuth redirect target.
   * Exchanges code, stores encrypted tokens, kicks off first sync.
   */
  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>('/v1/calendar/google/callback', async (request, reply) => {
    const { code, state, error } = request.query;
    if (error) return reply.status(400).send({ success: false, errors: [{ code: 'OAUTH_DENIED', message: error }] });
    if (!code || !state) return reply.status(400).send({ success: false, errors: [{ code: 'MISSING_PARAMS', message: 'code and state required' }] });

    const [sig, userId] = state.split(':');
    const expected = crypto.createHmac('sha256', process.env.PII_ENCRYPTION_KEY ?? '').update(userId ?? '').digest('hex').slice(0, 16);
    if (!userId || sig !== expected) return reply.status(400).send({ success: false, errors: [{ code: 'INVALID_STATE', message: 'State signature mismatch' }] });

    const profile = await db('artist_profiles').where({ user_id: userId }).first();
    if (!profile) return reply.status(404).send({ success: false, errors: [{ code: 'NOT_ARTIST', message: 'Artist profile not found' }] });

    const result = await googleCalendarService.connect(profile.id, code);
    // Redirect back to artist settings with success flag
    const webBase = process.env.PUBLIC_WEB_URL ?? 'http://localhost:3100';
    return reply.redirect(`${webBase}/artist/calendar?google=connected&email=${encodeURIComponent(result.google_email)}`);
  });

  /**
   * GET /v1/calendar/google/status — Is this artist connected? When did we last sync?
   */
  app.get('/v1/calendar/google/status', {
    preHandler: [authMiddleware, requirePermission('calendar:read_own')],
  }, async (request, reply) => {
    const profile = await db('artist_profiles').where({ user_id: request.user!.user_id }).first();
    if (!profile) return reply.status(404).send({ success: false, errors: [{ code: 'NOT_ARTIST', message: 'Artist profile not found' }] });
    const status = await googleCalendarService.getStatus(profile.id);
    return reply.send({ success: true, data: status, errors: [] });
  });

  /**
   * POST /v1/calendar/google/sync — Manually trigger a pull of busy blocks.
   */
  app.post('/v1/calendar/google/sync', {
    preHandler: [authMiddleware, requirePermission('calendar:read_own')],
  }, async (request, reply) => {
    const profile = await db('artist_profiles').where({ user_id: request.user!.user_id }).first();
    if (!profile) return reply.status(404).send({ success: false, errors: [{ code: 'NOT_ARTIST', message: 'Artist profile not found' }] });
    try {
      const result = await googleCalendarService.syncBusyBlocks(profile.id);
      await googleCalendarService.ensureWatchChannel(profile.id).catch(() => undefined);
      return reply.send({ success: true, data: result, errors: [] });
    } catch (err) {
      return reply.status(400).send({ success: false, errors: [{ code: 'SYNC_FAILED', message: (err as Error).message }] });
    }
  });

  /**
   * POST /v1/calendar/google/disconnect — Revoke the connection locally (stops watch channel).
   */
  app.post('/v1/calendar/google/disconnect', {
    preHandler: [authMiddleware, requirePermission('calendar:read_own')],
  }, async (request, reply) => {
    const profile = await db('artist_profiles').where({ user_id: request.user!.user_id }).first();
    if (!profile) return reply.status(404).send({ success: false, errors: [{ code: 'NOT_ARTIST', message: 'Artist profile not found' }] });
    await googleCalendarService.disconnect(profile.id);
    return reply.send({ success: true, data: { disconnected: true }, errors: [] });
  });

  /**
   * POST /v1/calendar/google/webhook — Push-notification target for Google watch channels.
   * Google sends X-Goog-Channel-Id + X-Goog-Channel-Token + X-Goog-Resource-State headers.
   * No body — we just pull on notification.
   */
  app.post('/v1/calendar/google/webhook', async (request, reply) => {
    const channelId = request.headers['x-goog-channel-id'] as string | undefined;
    const token = request.headers['x-goog-channel-token'] as string | undefined;
    const state = request.headers['x-goog-resource-state'] as string | undefined;
    if (!channelId) return reply.status(400).send();
    // "sync" is the initial handshake — ignore.
    if (state === 'sync') return reply.status(200).send();
    await googleCalendarService.handleWatchNotification(channelId, token).catch(() => undefined);
    return reply.status(200).send();
  });
}
