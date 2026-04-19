import jwt from 'jsonwebtoken';
import { readFileSync, existsSync } from 'fs';
import { db } from '../../infrastructure/database.js';
import { config } from '../../config/index.js';

/**
 * Signed reputation export — moat #4 (portable trust).
 *
 * Agencies can pull an artist's core reputation metrics as a JWT-signed payload
 * and verify authenticity with GRID's public key. This makes GRID's reputation
 * data the canonical source the industry references — another agency platform
 * can't mint comparable signed credentials.
 *
 * Signed with the same key material as auth JWTs (RS256 in prod, HS256 dev fallback).
 * Issuer: "grid-reputation", audience: "external".
 */

let privateKey: string | Buffer;
let publicKey: string | Buffer;
let algorithm: jwt.Algorithm;

if (config.JWT_PRIVATE_KEY_PATH && existsSync(config.JWT_PRIVATE_KEY_PATH)) {
  privateKey = readFileSync(config.JWT_PRIVATE_KEY_PATH);
  publicKey = readFileSync(config.JWT_PUBLIC_KEY_PATH!);
  algorithm = 'RS256';
} else {
  privateKey = config.PII_ENCRYPTION_KEY;
  publicKey = config.PII_ENCRYPTION_KEY;
  algorithm = 'HS256';
}

export interface ReputationPayload {
  artist_id: string;
  stage_name: string;
  trust_score: number;          // 0–100
  on_time_pct: number;           // 0–100
  bookings_completed: number;
  rating_avg: number | null;     // 0–5 or null if no ratings
  rating_count: number;
  disputes_lost: number;
  signed_at: string;             // ISO
}

export class ReputationExportService {
  /**
   * Build and sign the reputation card for an artist.
   * Token expires in 7 days — agencies should re-pull for fresh data.
   */
  async exportForArtist(artistId: string): Promise<{ token: string; payload: ReputationPayload; public_key_hint: string }> {
    const profile = await db('artist_profiles')
      .where({ id: artistId })
      .first();
    if (!profile) {
      throw new ReputationExportError('ARTIST_NOT_FOUND', 'Artist profile not found', 404);
    }

    // Ratings from completed bookings
    const ratingRow = await db('reviews')
      .where({ reviewee_id: profile.user_id })
      .select(db.raw('AVG(overall_rating)::float as avg_rating'), db.raw('COUNT(*)::int as count'))
      .first()
      .catch(() => ({ avg_rating: null, count: 0 }));

    // Disputes lost (resolved against the artist)
    const disputesLostRow = await db('review_disputes')
      .leftJoin('reviews', 'review_disputes.review_id', 'reviews.id')
      .where('reviews.reviewee_id', profile.user_id)
      .andWhere('review_disputes.status', 'rejected')
      .count('* as total')
      .first()
      .catch(() => ({ total: 0 }));

    const bookingsCompletedRow = await db('bookings')
      .where({ artist_id: artistId, state: 'completed' })
      .whereNull('deleted_at')
      .count('* as total')
      .first()
      .catch(() => ({ total: 0 }));

    const payload: ReputationPayload = {
      artist_id: artistId,
      stage_name: profile.stage_name ?? '',
      trust_score: Number(profile.trust_score ?? 0),
      on_time_pct: Number(profile.on_time_rate ?? 0),
      bookings_completed: Number(bookingsCompletedRow?.total ?? 0),
      rating_avg: ratingRow?.avg_rating != null ? Number(ratingRow.avg_rating) : null,
      rating_count: Number(ratingRow?.count ?? 0),
      disputes_lost: Number(disputesLostRow?.total ?? 0),
      signed_at: new Date().toISOString(),
    };

    const token = jwt.sign(payload, privateKey, {
      algorithm,
      issuer: 'grid-reputation',
      audience: 'external',
      expiresIn: '7d',
    } as jwt.SignOptions);

    return {
      token,
      payload,
      public_key_hint: algorithm === 'RS256' ? 'RS256 public key at /v1/reputation/export/public-key' : 'HS256 (dev only — not externally verifiable)',
    };
  }

  /**
   * Return the public key so external parties can verify signed exports.
   * Returns null if running in HS256 dev mode (symmetric — can't expose).
   */
  getPublicKey(): { algorithm: string; public_key: string } | null {
    if (algorithm !== 'RS256') return null;
    return {
      algorithm: 'RS256',
      public_key: typeof publicKey === 'string' ? publicKey : publicKey.toString('utf8'),
    };
  }
}

export class ReputationExportError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'ReputationExportError';
  }
}

export const reputationExportService = new ReputationExportService();
