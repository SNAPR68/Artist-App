import { db } from '../../infrastructure/database.js';

/**
 * Agent-of-record attribution — GRID's anti-disintermediation moat.
 *
 * Every artist↔client relationship is tagged with the originating workspace
 * (agency). Any future booking between the same pair auto-flows commission
 * to that agency — even if booked direct later.
 */

export interface AttributionRecord {
  id: string;
  artist_id: string;
  client_user_id: string;
  workspace_id: string;
  first_booking_id: string | null;
  commission_pct: string | number;
  is_active: boolean;
  created_at: string;
}

export class AttributionService {
  /**
   * Find existing attribution for (artist, client) pair, or create one
   * tagged to the given workspace. First workspace to book wins.
   */
  async findOrCreateAttribution(
    artistId: string,
    clientUserId: string,
    workspaceId: string | null,
    bookingId?: string,
    commissionPct = 10.0,
  ): Promise<AttributionRecord | null> {
    if (!workspaceId) return null;

    const existing = await db('artist_client_attribution')
      .where({ artist_id: artistId, client_user_id: clientUserId })
      .first();

    if (existing) return existing as AttributionRecord;

    const [created] = await db('artist_client_attribution')
      .insert({
        artist_id: artistId,
        client_user_id: clientUserId,
        workspace_id: workspaceId,
        first_booking_id: bookingId ?? null,
        commission_pct: commissionPct,
        is_active: true,
      })
      .returning('*');

    return created as AttributionRecord;
  }

  /**
   * Get the attributed workspace for this (artist, client) pair, if any.
   * Called on every new booking to check whether commission is owed to an agency.
   */
  async getAttribution(artistId: string, clientUserId: string): Promise<AttributionRecord | null> {
    const row = await db('artist_client_attribution')
      .where({ artist_id: artistId, client_user_id: clientUserId, is_active: true })
      .first();
    return (row as AttributionRecord) ?? null;
  }

  /**
   * Record commission accrued on a completed booking. Called during the
   * booking state transition to `completed`.
   */
  async recordAttributedCommission(
    bookingId: string,
    artistId: string,
    clientUserId: string,
    bookingTotalPaise: number,
  ): Promise<void> {
    const attribution = await this.getAttribution(artistId, clientUserId);
    if (!attribution) return;

    const pct = Number(attribution.commission_pct);
    const commissionPaise = Math.round((bookingTotalPaise * pct) / 100);

    // Idempotent: skip if already recorded for this booking
    const existing = await db('attributed_commissions').where({ booking_id: bookingId }).first();
    if (existing) return;

    await db('attributed_commissions').insert({
      attribution_id: attribution.id,
      booking_id: bookingId,
      workspace_id: attribution.workspace_id,
      booking_total_paise: bookingTotalPaise,
      commission_paise: commissionPaise,
      commission_pct: pct,
      status: 'accrued',
    });
  }

  /**
   * Sum of attributed commission earned by a workspace.
   */
  async getWorkspaceEarnings(workspaceId: string) {
    const row = await db('attributed_commissions')
      .where({ workspace_id: workspaceId })
      .select(
        db.raw('COALESCE(SUM(commission_paise), 0)::bigint as total_paise'),
        db.raw('COUNT(*)::int as booking_count'),
      )
      .first() as unknown as { total_paise: string; booking_count: string } | undefined;
    return {
      total_paise: Number(row?.total_paise ?? 0),
      booking_count: Number(row?.booking_count ?? 0),
    };
  }

  /**
   * Recent commission entries for a workspace (audit view).
   */
  async listWorkspaceCommissions(workspaceId: string, limit = 50) {
    return db('attributed_commissions')
      .where({ workspace_id: workspaceId })
      .orderBy('created_at', 'desc')
      .limit(limit);
  }
}

export const attributionService = new AttributionService();
