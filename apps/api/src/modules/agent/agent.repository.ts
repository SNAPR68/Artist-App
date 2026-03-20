import { db } from '../../infrastructure/database.js';

export class AgentRepository {
  async findByUserId(userId: string) {
    return db('agent_profiles').where({ user_id: userId }).first();
  }

  async findById(id: string) {
    return db('agent_profiles').where({ id }).first();
  }

  async create(data: {
    user_id: string;
    agency_name: string;
    contact_person: string;
    phone: string;
    email: string;
    city: string;
    commission_pct?: number;
    bio?: string;
  }) {
    const [profile] = await db('agent_profiles').insert(data).returning('*');
    return profile;
  }

  async update(id: string, data: Record<string, unknown>) {
    const [updated] = await db('agent_profiles')
      .where({ id })
      .update({ ...data, updated_at: new Date() })
      .returning('*');
    return updated;
  }

  async getRoster(agentId: string) {
    return db('artist_agent_links as aal')
      .join('artist_profiles as ap', 'ap.id', 'aal.artist_id')
      .where('aal.agent_id', agentId)
      .where('aal.is_active', true)
      .select(
        'aal.id as link_id',
        'ap.id as artist_id',
        'ap.stage_name',
        'ap.genres',
        'ap.base_city',
        'ap.is_verified',
      );
  }

  async addToRoster(agentId: string, artistId: string) {
    const [link] = await db('artist_agent_links')
      .insert({ agent_id: agentId, artist_id: artistId, is_active: true })
      .returning('*');
    return link;
  }

  async removeFromRoster(agentId: string, artistId: string) {
    return db('artist_agent_links')
      .where({ agent_id: agentId, artist_id: artistId })
      .delete();
  }

  async findLink(agentId: string, artistId: string) {
    return db('artist_agent_links')
      .where({ agent_id: agentId, artist_id: artistId })
      .first();
  }

  async getCommissionSummary(agentId: string, commissionPct: number) {
    const stats = await db('bookings as b')
      .join('artist_agent_links as aal', function () {
        this.on('aal.artist_id', '=', 'b.artist_id').andOn('aal.agent_id', '=', db.raw('?', [agentId]));
      })
      .where('aal.is_active', true)
      .whereIn('b.state', ['completed', 'settled', 'confirmed', 'pre_event', 'event_day'])
      .select(
        db.raw(`COUNT(*) FILTER (WHERE b.state IN ('completed', 'settled')) as completed_bookings`),
        db.raw(`COUNT(*) FILTER (WHERE b.state IN ('confirmed', 'pre_event', 'event_day')) as active_bookings`),
        db.raw(`COALESCE(SUM(b.final_amount) FILTER (WHERE b.state IN ('completed', 'settled')), 0) as total_gmv`),
        db.raw(`COALESCE(SUM(b.final_amount) FILTER (WHERE b.state IN ('confirmed', 'pre_event', 'event_day')), 0) as pending_gmv`),
      )
      .first() as any;

    const totalGmv = Number(stats?.total_gmv ?? 0);
    const pendingGmv = Number(stats?.pending_gmv ?? 0);
    const rate = commissionPct / 100;

    return {
      completed_bookings: Number(stats?.completed_bookings ?? 0),
      active_bookings: Number(stats?.active_bookings ?? 0),
      total_gmv: totalGmv,
      pending_gmv: pendingGmv,
      earned_commission: Math.round(totalGmv * rate * 100) / 100,
      pending_commission: Math.round(pendingGmv * rate * 100) / 100,
      commission_pct: commissionPct,
    };
  }

  async getCommissionHistory(agentId: string, commissionPct: number, limit = 50, offset = 0) {
    const rows = await db('bookings as b')
      .join('artist_agent_links as aal', function () {
        this.on('aal.artist_id', '=', 'b.artist_id').andOn('aal.agent_id', '=', db.raw('?', [agentId]));
      })
      .join('artist_profiles as ap', 'ap.id', 'b.artist_id')
      .where('aal.is_active', true)
      .whereIn('b.state', ['completed', 'settled'])
      .orderBy('b.event_date', 'desc')
      .select(
        'b.id as booking_id',
        'b.event_type',
        'b.event_date',
        'b.final_amount',
        'b.state',
        'b.settled_at',
        'ap.stage_name as artist_name',
      )
      .limit(limit)
      .offset(offset);

    const rate = commissionPct / 100;
    return rows.map((r: any) => ({
      ...r,
      final_amount: Number(r.final_amount ?? 0),
      commission_amount: Math.round(Number(r.final_amount ?? 0) * rate * 100) / 100,
    }));
  }

  async getRosterPerformance(agentId: string) {
    return db('artist_agent_links as aal')
      .join('artist_profiles as ap', 'ap.id', 'aal.artist_id')
      .leftJoin('bookings as b', function () {
        this.on('b.artist_id', '=', 'aal.artist_id')
          .andOnIn('b.state', ['completed', 'settled', 'confirmed', 'pre_event', 'event_day']);
      })
      .where('aal.agent_id', agentId)
      .where('aal.is_active', true)
      .groupBy('aal.artist_id', 'ap.id', 'ap.stage_name', 'ap.trust_score', 'ap.base_city', 'ap.genres')
      .select(
        'ap.id as artist_id',
        'ap.stage_name',
        'ap.base_city',
        'ap.genres',
        'ap.trust_score',
        db.raw(`COUNT(b.id) as total_bookings`),
        db.raw(`COUNT(b.id) FILTER (WHERE b.state IN ('completed', 'settled')) as completed_bookings`),
        db.raw(`COALESCE(SUM(b.final_amount) FILTER (WHERE b.state IN ('completed', 'settled')), 0) as total_revenue`),
        db.raw(`COALESCE(AVG(b.final_amount) FILTER (WHERE b.state IN ('completed', 'settled')), 0) as avg_booking_value`),
      )
      .orderBy('total_revenue', 'desc');
  }
}

export const agentRepository = new AgentRepository();
