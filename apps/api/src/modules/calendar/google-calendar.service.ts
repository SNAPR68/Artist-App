import axios from 'axios';
import crypto from 'crypto';
import { db } from '../../infrastructure/database.js';
import { encryptPII, decryptPII } from '../../infrastructure/encryption.js';
import { config } from '../../config/index.js';

/**
 * Google Calendar 2-way sync — moat #1 (calendar network effect).
 *
 * Push:  GRID booking (confirmed/pre_event/event_day/completed) → Google event
 * Pull:  Google busy blocks → google_calendar_busy_blocks table → availability check
 * Watch: Google push notifications hit /v1/calendar/google/webhook to trigger pull
 */

const OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CAL_API = 'https://www.googleapis.com/calendar/v3';
const SCOPES = ['https://www.googleapis.com/auth/calendar', 'openid', 'email'];

function requireEnv(name: string): string {
  const v = (config as unknown as Record<string, string | undefined>)[name] ?? process.env[name];
  if (!v) throw new Error(`${name} not configured`);
  return v;
}

export class GoogleCalendarService {
  // ─── OAuth ───────────────────────────────────────────────────────────

  buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: requireEnv('GOOGLE_OAUTH_CLIENT_ID'),
      redirect_uri: requireEnv('GOOGLE_OAUTH_REDIRECT_URI'),
      response_type: 'code',
      scope: SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return `${OAUTH_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    id_token: string;
  }> {
    const { data } = await axios.post(OAUTH_TOKEN_URL, new URLSearchParams({
      code,
      client_id: requireEnv('GOOGLE_OAUTH_CLIENT_ID'),
      client_secret: requireEnv('GOOGLE_OAUTH_CLIENT_SECRET'),
      redirect_uri: requireEnv('GOOGLE_OAUTH_REDIRECT_URI'),
      grant_type: 'authorization_code',
    }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    return data;
  }

  private decodeIdTokenEmail(idToken: string): string {
    const parts = idToken.split('.');
    if (parts.length !== 3) throw new Error('Invalid id_token');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return payload.email as string;
  }

  async connect(artistId: string, code: string): Promise<{ google_email: string }> {
    const tok = await this.exchangeCode(code);
    const email = this.decodeIdTokenEmail(tok.id_token);
    const expiresAt = new Date(Date.now() + tok.expires_in * 1000).toISOString();

    await db('artist_google_calendar_connections')
      .insert({
        artist_id: artistId,
        google_email: email,
        google_calendar_id: 'primary',
        access_token_encrypted: encryptPII(tok.access_token),
        refresh_token_encrypted: encryptPII(tok.refresh_token),
        access_token_expires_at: expiresAt,
        is_active: true,
      })
      .onConflict('artist_id')
      .merge({
        google_email: email,
        access_token_encrypted: encryptPII(tok.access_token),
        refresh_token_encrypted: encryptPII(tok.refresh_token),
        access_token_expires_at: expiresAt,
        is_active: true,
        updated_at: db.fn.now(),
      });

    // Kick off first pull + watch channel
    await this.syncBusyBlocks(artistId).catch(() => undefined);
    await this.ensureWatchChannel(artistId).catch(() => undefined);

    return { google_email: email };
  }

  async disconnect(artistId: string): Promise<void> {
    const conn = await this.getConnection(artistId);
    if (!conn) return;
    if (conn.watch_channel_id && conn.watch_resource_id) {
      await this.stopWatch(conn).catch(() => undefined);
    }
    await db('artist_google_calendar_connections')
      .where({ artist_id: artistId })
      .update({ is_active: false, watch_channel_id: null, watch_resource_id: null, watch_expiration: null });
  }

  // ─── Token management ───────────────────────────────────────────────

  private async getConnection(artistId: string) {
    return db('artist_google_calendar_connections')
      .where({ artist_id: artistId, is_active: true })
      .first();
  }

  private async getAccessToken(artistId: string): Promise<string> {
    const conn = await this.getConnection(artistId);
    if (!conn) throw new Error('Google Calendar not connected');

    const expiresAt = new Date(conn.access_token_expires_at).getTime();
    if (expiresAt - Date.now() > 60_000) {
      return decryptPII(conn.access_token_encrypted);
    }

    const refreshToken = decryptPII(conn.refresh_token_encrypted);
    const { data } = await axios.post(OAUTH_TOKEN_URL, new URLSearchParams({
      client_id: requireEnv('GOOGLE_OAUTH_CLIENT_ID'),
      client_secret: requireEnv('GOOGLE_OAUTH_CLIENT_SECRET'),
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

    const newExpires = new Date(Date.now() + data.expires_in * 1000).toISOString();
    await db('artist_google_calendar_connections')
      .where({ artist_id: artistId })
      .update({
        access_token_encrypted: encryptPII(data.access_token),
        access_token_expires_at: newExpires,
        updated_at: db.fn.now(),
      });
    return data.access_token;
  }

  // ─── Push: GRID booking → Google event ──────────────────────────────

  async pushBooking(artistId: string, booking: {
    id: string;
    event_date: string;
    event_type: string;
    event_city: string | null;
    event_venue: string | null;
    duration_hours: number | null;
  }): Promise<void> {
    const conn = await this.getConnection(artistId);
    if (!conn) return;

    const token = await this.getAccessToken(artistId);
    const startDate = booking.event_date;
    const endDate = new Date(new Date(startDate).getTime() + 86_400_000).toISOString().split('T')[0];

    const body = {
      summary: `[GRID] ${booking.event_type} — ${booking.event_city ?? ''}`.trim(),
      location: booking.event_venue ?? booking.event_city ?? '',
      description: `GRID booking · ${booking.duration_hours ?? 0}h\nBooking ID: ${booking.id}`,
      start: { date: startDate },
      end: { date: endDate },
      extendedProperties: { private: { grid_booking_id: booking.id } },
    };

    const existing = await db('google_calendar_pushed_events')
      .where({ artist_id: artistId, booking_id: booking.id })
      .first();

    if (existing) {
      await axios.patch(
        `${CAL_API}/calendars/${encodeURIComponent(conn.google_calendar_id)}/events/${existing.google_event_id}`,
        body,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return;
    }

    const { data } = await axios.post(
      `${CAL_API}/calendars/${encodeURIComponent(conn.google_calendar_id)}/events`,
      body,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    await db('google_calendar_pushed_events').insert({
      artist_id: artistId,
      booking_id: booking.id,
      google_event_id: data.id,
    });
  }

  async deleteBookingEvent(artistId: string, bookingId: string): Promise<void> {
    const conn = await this.getConnection(artistId);
    if (!conn) return;
    const mapping = await db('google_calendar_pushed_events')
      .where({ artist_id: artistId, booking_id: bookingId })
      .first();
    if (!mapping) return;
    const token = await this.getAccessToken(artistId);
    await axios.delete(
      `${CAL_API}/calendars/${encodeURIComponent(conn.google_calendar_id)}/events/${mapping.google_event_id}`,
      { headers: { Authorization: `Bearer ${token}` } },
    ).catch(() => undefined);
    await db('google_calendar_pushed_events').where({ id: mapping.id }).delete();
  }

  // ─── Pull: Google events → busy blocks ──────────────────────────────

  async syncBusyBlocks(artistId: string): Promise<{ imported: number; deleted: number }> {
    const conn = await this.getConnection(artistId);
    if (!conn) throw new Error('Not connected');
    const token = await this.getAccessToken(artistId);

    const params: Record<string, string> = {
      showDeleted: 'true',
      singleEvents: 'true',
      maxResults: '250',
    };
    if (conn.sync_token) {
      params.syncToken = conn.sync_token;
    } else {
      params.timeMin = new Date().toISOString();
    }

    let nextSyncToken: string | null = null;
    let pageToken: string | undefined;
    let imported = 0;
    let deleted = 0;

    do {
      if (pageToken) params.pageToken = pageToken;
      const { data } = await axios.get(
        `${CAL_API}/calendars/${encodeURIComponent(conn.google_calendar_id)}/events`,
        { headers: { Authorization: `Bearer ${token}` }, params },
      ).catch((err) => {
        // 410 Gone → syncToken invalid. Clear and re-sync full window.
        if (err.response?.status === 410) {
          return { data: { items: [], nextSyncToken: null, __reset: true } };
        }
        throw err;
      });

      if (data.__reset) {
        await db('artist_google_calendar_connections').where({ artist_id: artistId }).update({ sync_token: null });
        return this.syncBusyBlocks(artistId);
      }

      for (const ev of data.items ?? []) {
        // Skip events we pushed (they're GRID bookings — don't echo back as busy)
        if (ev.extendedProperties?.private?.grid_booking_id) continue;

        if (ev.status === 'cancelled') {
          const res = await db('google_calendar_busy_blocks')
            .where({ artist_id: artistId, google_event_id: ev.id })
            .delete();
          deleted += res;
          continue;
        }
        if (ev.transparency === 'transparent') continue; // marked "free"

        const startsAt = ev.start?.dateTime ?? (ev.start?.date ? `${ev.start.date}T00:00:00Z` : null);
        const endsAt = ev.end?.dateTime ?? (ev.end?.date ? `${ev.end.date}T00:00:00Z` : null);
        if (!startsAt || !endsAt) continue;

        await db('google_calendar_busy_blocks')
          .insert({
            artist_id: artistId,
            google_event_id: ev.id,
            summary: ev.summary ?? null,
            starts_at: startsAt,
            ends_at: endsAt,
            is_all_day: !!ev.start?.date,
          })
          .onConflict(['artist_id', 'google_event_id'])
          .merge({
            summary: ev.summary ?? null,
            starts_at: startsAt,
            ends_at: endsAt,
            is_all_day: !!ev.start?.date,
            updated_at: db.fn.now(),
          });
        imported += 1;
      }

      pageToken = data.nextPageToken;
      if (data.nextSyncToken) nextSyncToken = data.nextSyncToken;
    } while (pageToken);

    await db('artist_google_calendar_connections')
      .where({ artist_id: artistId })
      .update({
        sync_token: nextSyncToken ?? conn.sync_token ?? null,
        last_synced_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

    return { imported, deleted };
  }

  // ─── Watch channel (push notifications from Google) ─────────────────

  async ensureWatchChannel(artistId: string): Promise<void> {
    const conn = await this.getConnection(artistId);
    if (!conn) return;
    const exp = conn.watch_expiration ? new Date(conn.watch_expiration).getTime() : 0;
    // Renew if <24h remaining
    if (conn.watch_channel_id && exp - Date.now() > 24 * 3600_000) return;

    if (conn.watch_channel_id && conn.watch_resource_id) {
      await this.stopWatch(conn).catch(() => undefined);
    }

    const token = await this.getAccessToken(artistId);
    const channelId = crypto.randomUUID();
    const webhookBase = process.env.PUBLIC_API_URL ?? requireEnv('GOOGLE_OAUTH_REDIRECT_URI').replace(/\/[^/]*$/, '');
    const { data } = await axios.post(
      `${CAL_API}/calendars/${encodeURIComponent(conn.google_calendar_id)}/events/watch`,
      {
        id: channelId,
        type: 'web_hook',
        address: `${webhookBase}/v1/calendar/google/webhook`,
        token: artistId,
        expiration: String(Date.now() + 7 * 24 * 3600_000), // 7d
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    await db('artist_google_calendar_connections')
      .where({ artist_id: artistId })
      .update({
        watch_channel_id: data.id,
        watch_resource_id: data.resourceId,
        watch_expiration: new Date(Number(data.expiration)).toISOString(),
        updated_at: db.fn.now(),
      });
  }

  private async stopWatch(conn: { watch_channel_id: string; watch_resource_id: string }): Promise<void> {
    // Need an access token from any connection — resolve by channel
    const row = await db('artist_google_calendar_connections')
      .where({ watch_channel_id: conn.watch_channel_id })
      .first();
    if (!row) return;
    const token = await this.getAccessToken(row.artist_id);
    await axios.post(
      `${CAL_API}/channels/stop`,
      { id: conn.watch_channel_id, resourceId: conn.watch_resource_id },
      { headers: { Authorization: `Bearer ${token}` } },
    ).catch(() => undefined);
  }

  async handleWatchNotification(channelId: string, tokenHeader: string | undefined): Promise<void> {
    const conn = await db('artist_google_calendar_connections')
      .where({ watch_channel_id: channelId, is_active: true })
      .first();
    if (!conn) return;
    // Validate `token` matches artist_id we set when creating the channel
    if (tokenHeader && tokenHeader !== conn.artist_id) return;
    await this.syncBusyBlocks(conn.artist_id);
  }

  // ─── Availability check (used by booking validation) ────────────────

  async isBusy(artistId: string, startsAt: Date, endsAt: Date): Promise<boolean> {
    const row = await db('google_calendar_busy_blocks')
      .where({ artist_id: artistId })
      .where('starts_at', '<', endsAt.toISOString())
      .where('ends_at', '>', startsAt.toISOString())
      .first();
    return !!row;
  }

  async getStatus(artistId: string) {
    const conn = await this.getConnection(artistId);
    if (!conn) return { connected: false as const };
    return {
      connected: true as const,
      google_email: conn.google_email,
      last_synced_at: conn.last_synced_at,
      watch_active: !!conn.watch_channel_id,
      watch_expiration: conn.watch_expiration,
    };
  }
}

export const googleCalendarService = new GoogleCalendarService();
