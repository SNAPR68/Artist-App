import { db } from '../../infrastructure/database.js';

/**
 * Deal History Vault — the workspace's complete searchable record of every
 * artist booking they've ever done. Pro-gated CSV export is the lock-in:
 * once an agency has ~50 deals in here, leaving means losing the history.
 *
 * A "deal" = a booking linked to a workspace_event belonging to this workspace.
 */

export interface DealRow {
  booking_id: string;
  event_id: string;
  event_name: string;
  event_date: string;
  event_city: string;
  event_type: string;
  stage_name: string | null;
  artist_id: string;
  client_name: string | null;
  client_phone: string | null;
  state: string;
  quoted_amount_paise: number | null;
  final_amount_paise: number | null;
  gst_amount_paise: number | null;
  created_at: string;
  confirmed_at: string | null;
  completed_at: string | null;
}

export interface DealSearchFilters {
  q?: string; // free-text: artist name, event name, client name, city
  state?: string;
  start_date?: string;
  end_date?: string;
  artist_id?: string;
  page?: number;
  per_page?: number;
}

class DealVaultService {
  /**
   * Base query — bookings attached to any workspace_event in this workspace.
   * Returns a Knex query builder so callers can paginate OR stream for export.
   */
  private baseQuery(workspaceId: string) {
    return db('workspace_event_bookings as web')
      .join('workspace_events as we', 'we.id', 'web.workspace_event_id')
      .join('bookings as b', 'b.id', 'web.booking_id')
      .leftJoin('artist_profiles as ap', 'ap.id', 'b.artist_id')
      .where('we.workspace_id', workspaceId)
      .whereNull('b.deleted_at')
      .whereNull('we.deleted_at');
  }

  private applyFilters<T extends ReturnType<typeof this.baseQuery>>(q: T, f: DealSearchFilters): T {
    if (f.state) q.where('b.state', f.state);
    if (f.artist_id) q.where('b.artist_id', f.artist_id);
    if (f.start_date) q.where('b.event_date', '>=', f.start_date);
    if (f.end_date) q.where('b.event_date', '<=', f.end_date);
    if (f.q) {
      const term = `%${f.q.trim()}%`;
      q.where((qb) => {
        qb.whereILike('ap.stage_name', term)
          .orWhereILike('we.name', term)
          .orWhereILike('we.client_name', term)
          .orWhereILike('b.event_city', term);
      });
    }
    return q;
  }

  async search(workspaceId: string, filters: DealSearchFilters): Promise<{ rows: DealRow[]; total: number }> {
    const page = Math.max(1, filters.page ?? 1);
    const perPage = Math.min(100, Math.max(1, filters.per_page ?? 25));

    // Count (clone query before select/limit)
    const countQuery = this.applyFilters(this.baseQuery(workspaceId), filters);
    const [{ count }] = await countQuery.clone().clearSelect().clearOrder().count<{ count: string }[]>('* as count');

    const rows = await this.applyFilters(this.baseQuery(workspaceId), filters)
      .select(
        'b.id as booking_id',
        'we.id as event_id',
        'we.name as event_name',
        'b.event_date',
        'b.event_city',
        'b.event_type',
        'ap.stage_name',
        'b.artist_id',
        'we.client_name',
        'we.client_phone',
        'b.state',
        'b.quoted_amount_paise',
        'b.final_amount_paise',
        'b.gst_amount_paise',
        'b.created_at',
        'b.confirmed_at',
        'b.completed_at',
      )
      .orderBy('b.event_date', 'desc')
      .limit(perPage)
      .offset((page - 1) * perPage);

    return { rows: rows as DealRow[], total: Number(count) };
  }

  async exportAll(workspaceId: string, filters: DealSearchFilters): Promise<DealRow[]> {
    const rows = await this.applyFilters(this.baseQuery(workspaceId), filters)
      .select(
        'b.id as booking_id',
        'we.id as event_id',
        'we.name as event_name',
        'b.event_date',
        'b.event_city',
        'b.event_type',
        'ap.stage_name',
        'b.artist_id',
        'we.client_name',
        'we.client_phone',
        'b.state',
        'b.quoted_amount_paise',
        'b.final_amount_paise',
        'b.gst_amount_paise',
        'b.created_at',
        'b.confirmed_at',
        'b.completed_at',
      )
      .orderBy('b.event_date', 'desc')
      .limit(50000); // hard cap — workspaces with >50k deals should use the paginated list endpoint
    return rows as DealRow[];
  }

  async summary(workspaceId: string): Promise<{
    total_deals: number;
    completed_deals: number;
    gross_volume_paise: number;
    unique_artists: number;
    unique_clients: number;
  }> {
    const [stats] = await this.baseQuery(workspaceId)
      .select(db.raw('COUNT(DISTINCT b.id)::int as total_deals'))
      .select(db.raw("COUNT(DISTINCT CASE WHEN b.state = 'completed' THEN b.id END)::int as completed_deals"))
      .select(db.raw('COALESCE(SUM(b.final_amount_paise), 0)::bigint as gross_volume_paise'))
      .select(db.raw('COUNT(DISTINCT b.artist_id)::int as unique_artists'))
      .select(db.raw('COUNT(DISTINCT we.client_phone)::int as unique_clients'));

    return {
      total_deals: Number(stats?.total_deals ?? 0),
      completed_deals: Number(stats?.completed_deals ?? 0),
      gross_volume_paise: Number(stats?.gross_volume_paise ?? 0),
      unique_artists: Number(stats?.unique_artists ?? 0),
      unique_clients: Number(stats?.unique_clients ?? 0),
    };
  }
}

export const dealVaultService = new DealVaultService();

/**
 * Convert deal rows to RFC 4180 CSV.
 */
export function dealsToCsv(rows: DealRow[]): string {
  const headers = [
    'booking_id', 'event_id', 'event_name', 'event_date', 'event_city', 'event_type',
    'artist_stage_name', 'artist_id', 'client_name', 'client_phone', 'state',
    'quoted_amount_inr', 'final_amount_inr', 'gst_amount_inr',
    'created_at', 'confirmed_at', 'completed_at',
  ];
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const paiseToRupees = (p: number | null) => (p == null ? '' : (p / 100).toFixed(2));
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push([
      escape(r.booking_id),
      escape(r.event_id),
      escape(r.event_name),
      escape(r.event_date),
      escape(r.event_city),
      escape(r.event_type),
      escape(r.stage_name),
      escape(r.artist_id),
      escape(r.client_name),
      escape(r.client_phone),
      escape(r.state),
      paiseToRupees(r.quoted_amount_paise),
      paiseToRupees(r.final_amount_paise),
      paiseToRupees(r.gst_amount_paise),
      escape(r.created_at),
      escape(r.confirmed_at),
      escape(r.completed_at),
    ].join(','));
  }
  return lines.join('\r\n');
}
