/**
 * Event Company OS pivot (2026-04-22) — Vendor repository.
 *
 * Thin read layer over `artist_profiles` filtered by the new `category` enum.
 * We reuse artist_profiles as the vendors table (shortcut documented in
 * CLAUDE.md MVP scope). Refactor to polymorphic `vendors` table is deferred
 * to month 3+ when paying customers force it.
 */
import { db } from '../../infrastructure/database.js';
import type { VendorCategory } from '@artist-booking/shared';

export interface ListVendorsParams {
  category?: VendorCategory;
  city?: string;
  page: number;
  per_page: number;
}

export class VendorRepository {
  async list(params: ListVendorsParams) {
    let query = db('artist_profiles')
      .where({ deleted_at: null })
      .orderBy('trust_score', 'desc');

    if (params.category) query = query.where('category', params.category);
    if (params.city) query = query.where('base_city', 'ilike', `%${params.city}%`);

    const totalRow = await query.clone().clearOrder().count('id as count').first();
    const rows = await query
      .select(
        'id',
        'user_id',
        'stage_name',
        'bio',
        'base_city',
        'category',
        'category_attributes',
        'trust_score',
        'total_bookings',
        'is_verified',
        'profile_completion_pct',
        'rating',
        'rating_count',
        'ontime_rate',
        'events_done',
        'is_preferred',
        'is_blacklisted',
        'last_used_at',
        'created_at',
      )
      .offset((params.page - 1) * params.per_page)
      .limit(params.per_page);

    return { data: rows, total: Number(totalRow?.count ?? 0) };
  }

  async findById(id: string) {
    return db('artist_profiles')
      .where({ id, deleted_at: null })
      .select(
        'id',
        'user_id',
        'stage_name',
        'bio',
        'base_city',
        'category',
        'category_attributes',
        'trust_score',
        'total_bookings',
        'is_verified',
        'profile_completion_pct',
        'rating',
        'rating_count',
        'ontime_rate',
        'events_done',
        'is_preferred',
        'is_blacklisted',
        'blacklist_reason',
        'last_used_at',
        'created_at',
      )
      .first();
  }

  async updateCategoryAttributes(
    id: string,
    userId: string,
    attributes: Record<string, unknown>,
  ) {
    const [updated] = await db('artist_profiles')
      .where({ id, user_id: userId, deleted_at: null })
      .update({ category_attributes: JSON.stringify(attributes) })
      .returning(['id', 'category', 'category_attributes']);
    return updated;
  }

  // ── Ratings ────────────────────────────────────────────────────────────────

  async submitRating(input: {
    workspaceId: string;
    vendorProfileId: string;
    eventFileId: string;
    raterUserId: string;
    overall: number;
    quality?: number | null;
    punctuality?: number | null;
    communication?: number | null;
    professionalism?: number | null;
    wasOntime?: boolean;
    wouldRebook?: boolean;
    comment?: string | null;
  }) {
    return db.transaction(async (trx) => {
      // Upsert (workspace_id, vendor_profile_id, event_file_id) is unique.
      const [row] = await trx('vendor_ratings')
        .insert({
          workspace_id: input.workspaceId,
          vendor_profile_id: input.vendorProfileId,
          event_file_id: input.eventFileId,
          rater_user_id: input.raterUserId,
          overall: input.overall,
          quality: input.quality ?? null,
          punctuality: input.punctuality ?? null,
          communication: input.communication ?? null,
          professionalism: input.professionalism ?? null,
          was_ontime: input.wasOntime ?? true,
          would_rebook: input.wouldRebook ?? true,
          comment: input.comment ?? null,
          updated_at: trx.fn.now(),
        })
        .onConflict(['workspace_id', 'vendor_profile_id', 'event_file_id'])
        .merge({
          overall: input.overall,
          quality: input.quality ?? null,
          punctuality: input.punctuality ?? null,
          communication: input.communication ?? null,
          professionalism: input.professionalism ?? null,
          was_ontime: input.wasOntime ?? true,
          would_rebook: input.wouldRebook ?? true,
          comment: input.comment ?? null,
          updated_at: trx.fn.now(),
        })
        .returning('*');

      // Recompute aggregates on artist_profiles (denormalized cache).
      await trx.raw(
        `
        UPDATE artist_profiles ap SET
          rating       = agg.avg_overall,
          rating_count = agg.cnt,
          ontime_rate  = agg.ontime_pct,
          events_done  = agg.distinct_events,
          last_used_at = agg.last_event
        FROM (
          SELECT
            vendor_profile_id,
            ROUND(AVG(overall)::numeric, 2)                              AS avg_overall,
            COUNT(*)                                                     AS cnt,
            ROUND(AVG(CASE WHEN was_ontime THEN 100.0 ELSE 0 END)::numeric, 2) AS ontime_pct,
            COUNT(DISTINCT event_file_id)                                AS distinct_events,
            MAX(created_at)                                              AS last_event
          FROM vendor_ratings
          WHERE vendor_profile_id = ?
          GROUP BY vendor_profile_id
        ) agg
        WHERE ap.id = agg.vendor_profile_id
        `,
        [input.vendorProfileId],
      );

      return row;
    });
  }

  async listRatings(vendorProfileId: string, opts: { workspaceId?: string; limit?: number } = {}) {
    let q = db('vendor_ratings as vr')
      .leftJoin('users as u', 'u.id', 'vr.rater_user_id')
      .leftJoin('event_files as ef', 'ef.id', 'vr.event_file_id')
      .where('vr.vendor_profile_id', vendorProfileId)
      .orderBy('vr.created_at', 'desc')
      .select(
        'vr.id',
        'vr.workspace_id',
        'vr.event_file_id',
        'vr.overall',
        'vr.quality',
        'vr.punctuality',
        'vr.communication',
        'vr.professionalism',
        'vr.was_ontime',
        'vr.would_rebook',
        'vr.comment',
        'vr.created_at',
        'u.full_name as rater_name',
        'ef.event_name as event_name',
      );

    if (opts.workspaceId) q = q.where('vr.workspace_id', opts.workspaceId);
    if (opts.limit) q = q.limit(opts.limit);
    return q;
  }

  // ── Per-workspace flags ────────────────────────────────────────────────────

  async getWorkspaceFlag(workspaceId: string, vendorProfileId: string) {
    return db('vendor_workspace_flags')
      .where({ workspace_id: workspaceId, vendor_profile_id: vendorProfileId })
      .first();
  }

  async setWorkspaceFlag(input: {
    workspaceId: string;
    vendorProfileId: string;
    flaggedBy: string;
    isPreferred?: boolean;
    isBlacklisted?: boolean;
    blacklistReason?: string | null;
    notes?: string | null;
  }) {
    const [row] = await db('vendor_workspace_flags')
      .insert({
        workspace_id: input.workspaceId,
        vendor_profile_id: input.vendorProfileId,
        flagged_by: input.flaggedBy,
        is_preferred: input.isPreferred ?? false,
        is_blacklisted: input.isBlacklisted ?? false,
        blacklist_reason: input.blacklistReason ?? null,
        notes: input.notes ?? null,
        updated_at: db.fn.now(),
      })
      .onConflict(['workspace_id', 'vendor_profile_id'])
      .merge({
        is_preferred: input.isPreferred ?? false,
        is_blacklisted: input.isBlacklisted ?? false,
        blacklist_reason: input.blacklistReason ?? null,
        notes: input.notes ?? null,
        flagged_by: input.flaggedBy,
        updated_at: db.fn.now(),
      })
      .returning('*');
    return row;
  }
}

export const vendorRepository = new VendorRepository();
