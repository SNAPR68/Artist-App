import { db } from '../../infrastructure/database.js';

export interface InstabookInterestRow {
  id: string;
  role: string;
  name: string;
  phone: string;
  email: string | null;
  city: string;
  excitement_score: number;
  top_concern: string | null;
  would_use_first_month: string;
  role_specific_data: Record<string, unknown>;
  source: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
  deleted_at: Date | null;
}

interface ListFilters {
  page: number;
  per_page: number;
  role?: string;
  city?: string;
  pilot?: boolean;
}

export class InstabookInterestRepository {
  async create(data: Omit<InstabookInterestRow, 'id' | 'created_at' | 'deleted_at'>): Promise<InstabookInterestRow> {
    const [row] = await db('instabook_interests')
      .insert({
        ...data,
        role_specific_data: JSON.stringify(data.role_specific_data),
      })
      .returning('*');
    return row;
  }

  async list(filters: ListFilters): Promise<{ rows: InstabookInterestRow[]; total: number }> {
    const query = db('instabook_interests').whereNull('deleted_at');

    if (filters.role) query.where('role', filters.role);
    if (filters.city) query.whereILike('city', `%${filters.city}%`);
    if (filters.pilot) query.whereRaw(`role_specific_data->>'pilot' = 'true'`);

    const countResult = await query.clone().count('* as count').first();
    const total = Number(countResult?.count ?? 0);

    const rows = await query
      .orderBy('created_at', 'desc')
      .offset((filters.page - 1) * filters.per_page)
      .limit(filters.per_page);

    return { rows, total };
  }

  async stats(): Promise<{
    total: number;
    by_role: Record<string, number>;
    by_excitement: Record<number, number>;
    avg_excitement: number;
    would_use_yes_pct: number;
  }> {
    const baseQuery = db('instabook_interests').whereNull('deleted_at');

    const [totalRow] = await baseQuery.clone().count('* as count');
    const total = Number(totalRow?.count ?? 0);

    if (total === 0) {
      return { total: 0, by_role: {}, by_excitement: {}, avg_excitement: 0, would_use_yes_pct: 0 };
    }

    const roleRows = await baseQuery.clone()
      .select('role')
      .count('* as count')
      .groupBy('role');

    const by_role: Record<string, number> = {};
    for (const r of roleRows) {
      by_role[r.role as string] = Number(r.count);
    }

    const excitementRows = await baseQuery.clone()
      .select('excitement_score')
      .count('* as count')
      .groupBy('excitement_score');

    const by_excitement: Record<number, number> = {};
    for (const r of excitementRows) {
      by_excitement[Number(r.excitement_score)] = Number(r.count);
    }

    const [avgRow] = await baseQuery.clone().avg('excitement_score as avg');
    const avg_excitement = Number(Number(avgRow?.avg ?? 0).toFixed(1));

    const [yesRow] = await baseQuery.clone()
      .where('would_use_first_month', 'yes')
      .count('* as count');
    const would_use_yes_pct = total > 0 ? Number(((Number(yesRow?.count ?? 0) / total) * 100).toFixed(1)) : 0;

    return { total, by_role, by_excitement, avg_excitement, would_use_yes_pct };
  }

  async countByPhoneLastHour(phone: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 3_600_000);
    const [row] = await db('instabook_interests')
      .where('phone', phone)
      .where('created_at', '>=', oneHourAgo)
      .whereNull('deleted_at')
      .count('* as count');
    return Number(row?.count ?? 0);
  }
}

export const instabookInterestRepository = new InstabookInterestRepository();
