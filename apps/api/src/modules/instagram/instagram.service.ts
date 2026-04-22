/**
 * Event Company OS pivot (2026-04-22) — Instagram OAuth (Option A).
 *
 * Uses Facebook Login + IG Business API (NOT Instagram Basic Display, which
 * was deprecated for Business accounts). Flow:
 *   1. buildAuthUrl() → Facebook OAuth dialog
 *   2. exchangeCode() → short-lived user token
 *   3. exchangeLongLived() → 60-day token
 *   4. resolveIgBusinessAccount() → finds the FB Page with an linked IG Business account
 *   5. persist encrypted token + IG profile snapshot
 *   6. refresh() extends the token before expiry (60d renewable)
 *
 * Scopes (Meta app review): instagram_basic, instagram_manage_insights,
 * pages_show_list, pages_read_engagement, business_management.
 */
import axios from 'axios';
import { db } from '../../infrastructure/database.js';
import { encryptPII, decryptPII } from '../../infrastructure/encryption.js';
import { config } from '../../config/index.js';

const GRAPH = 'https://graph.facebook.com/v19.0';
const OAUTH_DIALOG = 'https://www.facebook.com/v19.0/dialog/oauth';

const SCOPES = [
  'instagram_basic',
  'instagram_manage_insights',
  'pages_show_list',
  'pages_read_engagement',
  'business_management',
];

function requireEnv(name: 'META_APP_ID' | 'META_APP_SECRET' | 'INSTAGRAM_OAUTH_REDIRECT_URI'): string {
  const v = config[name];
  if (!v) throw new Error(`${name} not configured`);
  return v;
}

export class InstagramService {
  // ─── OAuth ──────────────────────────────────────────────────────────────

  buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: requireEnv('META_APP_ID'),
      redirect_uri: requireEnv('INSTAGRAM_OAUTH_REDIRECT_URI'),
      response_type: 'code',
      scope: SCOPES.join(','),
      state,
    });
    return `${OAUTH_DIALOG}?${params.toString()}`;
  }

  private async exchangeCode(code: string): Promise<{ access_token: string; expires_in: number }> {
    const { data } = await axios.get(`${GRAPH}/oauth/access_token`, {
      params: {
        client_id: requireEnv('META_APP_ID'),
        client_secret: requireEnv('META_APP_SECRET'),
        redirect_uri: requireEnv('INSTAGRAM_OAUTH_REDIRECT_URI'),
        code,
      },
    });
    return data;
  }

  private async exchangeLongLived(shortToken: string): Promise<{ access_token: string; expires_in: number }> {
    const { data } = await axios.get(`${GRAPH}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: requireEnv('META_APP_ID'),
        client_secret: requireEnv('META_APP_SECRET'),
        fb_exchange_token: shortToken,
      },
    });
    return data;
  }

  private async getFbUserId(token: string): Promise<string> {
    const { data } = await axios.get(`${GRAPH}/me`, {
      params: { access_token: token, fields: 'id,name' },
    });
    return data.id as string;
  }

  /**
   * Walks the user's Pages and returns the first Page with an attached IG
   * Business account. We also request the Page token for that page so we can
   * authenticate content/insights calls on behalf of the page.
   */
  private async resolveIgBusinessAccount(userToken: string): Promise<{
    fb_page_id: string;
    page_access_token: string;
    ig_user_id: string;
  }> {
    const { data } = await axios.get(`${GRAPH}/me/accounts`, {
      params: {
        access_token: userToken,
        fields: 'id,name,access_token,instagram_business_account',
      },
    });
    const pages = (data.data ?? []) as Array<{
      id: string;
      access_token: string;
      instagram_business_account?: { id: string };
    }>;
    const match = pages.find((p) => p.instagram_business_account?.id);
    if (!match || !match.instagram_business_account) {
      throw new Error('NO_IG_BUSINESS_ACCOUNT_LINKED');
    }
    return {
      fb_page_id: match.id,
      page_access_token: match.access_token,
      ig_user_id: match.instagram_business_account.id,
    };
  }

  private async fetchIgProfile(igUserId: string, pageToken: string): Promise<{
    username: string;
    followers_count?: number;
    follows_count?: number;
    media_count?: number;
    profile_picture_url?: string;
    biography?: string;
  }> {
    const { data } = await axios.get(`${GRAPH}/${igUserId}`, {
      params: {
        access_token: pageToken,
        fields: 'username,followers_count,follows_count,media_count,profile_picture_url,biography',
      },
    });
    return data;
  }

  async connect(vendorProfileId: string, userId: string, code: string) {
    const short = await this.exchangeCode(code);
    const long = await this.exchangeLongLived(short.access_token);
    const fbUserId = await this.getFbUserId(long.access_token);
    const ig = await this.resolveIgBusinessAccount(long.access_token);
    const profile = await this.fetchIgProfile(ig.ig_user_id, ig.page_access_token);

    const expiresAt = new Date(Date.now() + long.expires_in * 1000).toISOString();

    const [row] = await db('instagram_connections')
      .insert({
        vendor_profile_id: vendorProfileId,
        user_id: userId,
        access_token_encrypted: encryptPII(ig.page_access_token),
        access_token_expires_at: expiresAt,
        fb_user_id: fbUserId,
        fb_page_id: ig.fb_page_id,
        ig_user_id: ig.ig_user_id,
        ig_username: profile.username,
        follower_count: profile.followers_count ?? null,
        follows_count: profile.follows_count ?? null,
        media_count: profile.media_count ?? null,
        profile_picture_url: profile.profile_picture_url ?? null,
        biography: profile.biography ?? null,
        last_synced_at: db.fn.now(),
        is_active: true,
      })
      .onConflict('vendor_profile_id')
      .merge({
        user_id: userId,
        access_token_encrypted: encryptPII(ig.page_access_token),
        access_token_expires_at: expiresAt,
        fb_user_id: fbUserId,
        fb_page_id: ig.fb_page_id,
        ig_user_id: ig.ig_user_id,
        ig_username: profile.username,
        follower_count: profile.followers_count ?? null,
        follows_count: profile.follows_count ?? null,
        media_count: profile.media_count ?? null,
        profile_picture_url: profile.profile_picture_url ?? null,
        biography: profile.biography ?? null,
        last_synced_at: db.fn.now(),
        is_active: true,
        updated_at: db.fn.now(),
      })
      .returning([
        'id',
        'vendor_profile_id',
        'ig_username',
        'follower_count',
        'follows_count',
        'media_count',
        'profile_picture_url',
        'last_synced_at',
      ]);
    return row;
  }

  async disconnect(vendorProfileId: string): Promise<void> {
    await db('instagram_connections')
      .where({ vendor_profile_id: vendorProfileId })
      .update({ is_active: false, updated_at: db.fn.now() });
  }

  async status(vendorProfileId: string) {
    const row = await db('instagram_connections')
      .where({ vendor_profile_id: vendorProfileId, is_active: true })
      .first();
    if (!row) return { connected: false };
    return {
      connected: true,
      ig_username: row.ig_username,
      follower_count: row.follower_count,
      follows_count: row.follows_count,
      media_count: row.media_count,
      profile_picture_url: row.profile_picture_url,
      biography: row.biography,
      last_synced_at: row.last_synced_at,
      expires_at: row.access_token_expires_at,
    };
  }

  /**
   * Pulls fresh follower/media counts. Caller responsible for invoking on a
   * schedule (cron) or on-demand from the dashboard.
   */
  async sync(vendorProfileId: string) {
    const row = await db('instagram_connections')
      .where({ vendor_profile_id: vendorProfileId, is_active: true })
      .first();
    if (!row) throw new Error('NOT_CONNECTED');
    const token = decryptPII(row.access_token_encrypted);
    const profile = await this.fetchIgProfile(row.ig_user_id, token);
    await db('instagram_connections')
      .where({ id: row.id })
      .update({
        ig_username: profile.username,
        follower_count: profile.followers_count ?? null,
        follows_count: profile.follows_count ?? null,
        media_count: profile.media_count ?? null,
        profile_picture_url: profile.profile_picture_url ?? null,
        biography: profile.biography ?? null,
        last_synced_at: db.fn.now(),
        updated_at: db.fn.now(),
      });
    return { ...profile };
  }

  /**
   * Extends a soon-to-expire long-lived token by re-exchanging it. Meta
   * allows this any time within the 60-day window.
   */
  async refresh(vendorProfileId: string) {
    const row = await db('instagram_connections')
      .where({ vendor_profile_id: vendorProfileId, is_active: true })
      .first();
    if (!row) throw new Error('NOT_CONNECTED');
    const token = decryptPII(row.access_token_encrypted);
    const long = await this.exchangeLongLived(token);
    const expiresAt = new Date(Date.now() + long.expires_in * 1000).toISOString();
    await db('instagram_connections')
      .where({ id: row.id })
      .update({
        access_token_encrypted: encryptPII(long.access_token),
        access_token_expires_at: expiresAt,
        updated_at: db.fn.now(),
      });
    return { expires_at: expiresAt };
  }

  /**
   * Fetches recent media items for the connected IG Business account. Used by
   * the artist microsite to render an embedded feed + the EPK bundler.
   */
  async recentMedia(vendorProfileId: string, limit = 12) {
    const row = await db('instagram_connections')
      .where({ vendor_profile_id: vendorProfileId, is_active: true })
      .first();
    if (!row) throw new Error('NOT_CONNECTED');
    const token = decryptPII(row.access_token_encrypted);
    const { data } = await axios.get(`${GRAPH}/${row.ig_user_id}/media`, {
      params: {
        access_token: token,
        fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count',
        limit,
      },
    });
    return data.data ?? [];
  }
}

export const instagramService = new InstagramService();
