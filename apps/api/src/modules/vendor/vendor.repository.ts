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
}

export const vendorRepository = new VendorRepository();
