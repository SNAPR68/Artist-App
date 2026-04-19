import { db } from '../../infrastructure/database.js';
import { encryptPII, decryptPII, hashForSearch } from '../../infrastructure/encryption.js';

/**
 * TDS auto-calc (moat #5 — compliance lock-in).
 *
 * Per-booking TDS is already calculated in split-calculator and stored on
 * payment_settlements.tds_paise. This service:
 *   1. Stores artist PAN (encrypted) for certificate issuance.
 *   2. Aggregates TDS deducted per financial year (India FY = Apr→Mar).
 *   3. Emits a Form 16A–style payload agencies can pull for their artists.
 *
 * Indian FY boundaries: 1 Apr 00:00 IST → 31 Mar 23:59:59 IST.
 * We approximate in UTC since settlement timestamps are UTC; for certificate
 * accuracy we let the caller specify the FY explicitly.
 */
export class TDSService {
  /**
   * Store or update an artist's PAN. Encrypted at rest, hashed for lookup.
   */
  async savePAN(artistId: string, pan: string): Promise<void> {
    const clean = pan.trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(clean)) {
      throw new TDSError('INVALID_PAN', 'PAN format invalid (ABCDE1234F)', 400);
    }
    await db('artist_profiles').where({ id: artistId }).update({
      pan_encrypted: encryptPII(clean),
      pan_hash: hashForSearch(clean),
      updated_at: new Date(),
    });
  }

  /**
   * Get the artist's stored PAN (decrypted), or null if not set.
   */
  async getPAN(artistId: string): Promise<string | null> {
    const row = await db('artist_profiles').where({ id: artistId }).select('pan_encrypted').first();
    if (!row?.pan_encrypted) return null;
    try {
      return decryptPII(row.pan_encrypted);
    } catch {
      return null;
    }
  }

  /**
   * Return the TDS summary for an artist for a given Indian FY.
   * FY 2025-26 runs 2025-04-01 to 2026-03-31.
   */
  async getFYSummary(artistId: string, fyStartYear: number): Promise<TDSFYSummary> {
    const fyStart = new Date(Date.UTC(fyStartYear, 3, 1, 0, 0, 0));              // Apr 1 UTC
    const fyEnd = new Date(Date.UTC(fyStartYear + 1, 2, 31, 23, 59, 59));        // Mar 31 UTC

    const rows = await db('payment_settlements')
      .leftJoin('payments', 'payment_settlements.payment_id', 'payments.id')
      .leftJoin('bookings', 'payments.booking_id', 'bookings.id')
      .where('bookings.artist_id', artistId)
      .whereBetween('payment_settlements.settled_at', [fyStart, fyEnd])
      .select(
        'payment_settlements.id',
        'payment_settlements.settled_at',
        'payment_settlements.artist_payout_paise',
        'payment_settlements.tds_paise',
        'bookings.id as booking_id',
        'bookings.event_date',
        'bookings.event_type',
        'bookings.final_amount_paise',
      )
      .orderBy('payment_settlements.settled_at', 'asc');

    const totalTds = rows.reduce((sum, r) => sum + Number(r.tds_paise ?? 0), 0);
    const totalGross = rows.reduce((sum, r) => sum + Number(r.final_amount_paise ?? 0), 0);
    const totalPayout = rows.reduce((sum, r) => sum + Number(r.artist_payout_paise ?? 0), 0);

    const profile = await db('artist_profiles').where({ id: artistId }).select('stage_name', 'pan_encrypted').first();
    const pan = profile?.pan_encrypted ? (() => { try { return decryptPII(profile.pan_encrypted); } catch { return null; } })() : null;
    // Mask PAN for response: ABCDE1234F → ABCDE****F
    const panMasked = pan ? `${pan.slice(0, 5)}****${pan.slice(9)}` : null;

    return {
      artist_id: artistId,
      stage_name: profile?.stage_name ?? '',
      pan_masked: panMasked,
      has_pan: Boolean(pan),
      financial_year: `${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`,
      fy_start: fyStart.toISOString().slice(0, 10),
      fy_end: fyEnd.toISOString().slice(0, 10),
      total_gross_paise: totalGross,
      total_tds_paise: totalTds,
      total_payout_paise: totalPayout,
      bookings_count: rows.length,
      section: '194J',   // Professional services
      tds_rate_pct: 10,
      line_items: rows.map((r) => ({
        settlement_id: r.id,
        booking_id: r.booking_id,
        event_date: r.event_date,
        event_type: r.event_type,
        settled_at: r.settled_at,
        gross_paise: Number(r.final_amount_paise ?? 0),
        tds_paise: Number(r.tds_paise ?? 0),
        payout_paise: Number(r.artist_payout_paise ?? 0),
      })),
    };
  }
}

export interface TDSFYSummary {
  artist_id: string;
  stage_name: string;
  pan_masked: string | null;
  has_pan: boolean;
  financial_year: string;
  fy_start: string;
  fy_end: string;
  total_gross_paise: number;
  total_tds_paise: number;
  total_payout_paise: number;
  bookings_count: number;
  section: string;
  tds_rate_pct: number;
  line_items: Array<{
    settlement_id: string;
    booking_id: string;
    event_date: string;
    event_type: string;
    settled_at: Date | string;
    gross_paise: number;
    tds_paise: number;
    payout_paise: number;
  }>;
}

export class TDSError extends Error {
  constructor(public code: string, message: string, public statusCode: number) {
    super(message);
    this.name = 'TDSError';
  }
}

export const tdsService = new TDSService();
