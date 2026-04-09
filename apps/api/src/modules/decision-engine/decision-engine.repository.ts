import { db } from '../../infrastructure/database.js';

export class DecisionEngineRepository {
  async createBrief(data: {
    source: string;
    raw_text: string;
    structured_brief?: Record<string, unknown>;
    status?: string;
    created_by_user_id?: string | null;
    workspace_id?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const [brief] = await db('decision_briefs')
      .insert({
        source: data.source,
        raw_text: data.raw_text,
        structured_brief: JSON.stringify(data.structured_brief ?? {}),
        status: data.status ?? 'draft',
        created_by_user_id: data.created_by_user_id ?? null,
        workspace_id: data.workspace_id ?? null,
        metadata: JSON.stringify(data.metadata ?? {}),
      })
      .returning('*');
    return brief;
  }

  async updateBrief(briefId: string, updates: {
    status?: string;
    structured_brief?: Record<string, unknown>;
    selected_recommendation_id?: string;
    metadata?: Record<string, unknown>;
    raw_text?: string;
  }) {
    const updateData: Record<string, unknown> = { updated_at: db.fn.now() };
    if (updates.status) updateData.status = updates.status;
    if (updates.structured_brief) updateData.structured_brief = JSON.stringify(updates.structured_brief);
    if (updates.selected_recommendation_id) updateData.selected_recommendation_id = updates.selected_recommendation_id;
    if (updates.metadata) updateData.metadata = JSON.stringify(updates.metadata);
    if (updates.raw_text) updateData.raw_text = updates.raw_text;

    const [brief] = await db('decision_briefs')
      .where({ id: briefId })
      .update(updateData)
      .returning('*');
    return brief;
  }

  async getBriefById(briefId: string) {
    return db('decision_briefs').where({ id: briefId }).first();
  }

  async getBriefWithRecommendations(briefId: string) {
    const brief = await db('decision_briefs').where({ id: briefId }).first();
    if (!brief) return null;

    const recommendations = await db('decision_recommendations as dr')
      .leftJoin('artist_profiles as ap', 'ap.id', 'dr.artist_id')
      .where({ 'dr.brief_id': briefId })
      .orderBy('dr.rank', 'asc')
      .select(
        'dr.*',
        'ap.stage_name as artist_name',
        'ap.genres as artist_type_raw',
        'ap.profile_image_url as profile_image',
      );

    return { ...brief, recommendations };
  }

  async insertRecommendations(briefId: string, recommendations: Array<{
    artist_id: string;
    score: number;
    confidence: number;
    price_min_paise: number;
    price_max_paise: number;
    expected_close_paise: number | null;
    reasons: string[];
    risk_flags: string[];
    logistics_flags: string[];
    score_breakdown: Record<string, number>;
    rank: number;
  }>) {
    if (recommendations.length === 0) return [];

    const rows = recommendations.map((r) => ({
      brief_id: briefId,
      artist_id: r.artist_id,
      score: r.score,
      confidence: r.confidence,
      price_min_paise: r.price_min_paise,
      price_max_paise: r.price_max_paise,
      expected_close_paise: r.expected_close_paise,
      reasons: JSON.stringify(r.reasons),
      risk_flags: JSON.stringify(r.risk_flags),
      logistics_flags: JSON.stringify(r.logistics_flags),
      score_breakdown: JSON.stringify(r.score_breakdown),
      rank: r.rank,
    }));

    return db('decision_recommendations').insert(rows).returning('*');
  }

  async insertEvent(briefId: string, eventType: string, payload: Record<string, unknown> = {}) {
    const [event] = await db('decision_events')
      .insert({
        brief_id: briefId,
        event_type: eventType,
        payload: JSON.stringify(payload),
      })
      .returning('*');
    return event;
  }

  async getEvents(briefId: string) {
    return db('decision_events')
      .where({ brief_id: briefId })
      .orderBy('created_at', 'asc');
  }

  // ─── Batch enrichment queries ─────────────────────────────

  async batchGetPricingPositions(artistIds: string[], eventType?: string) {
    let query = db('pricing_brain_market_positions')
      .whereIn('artist_id', artistIds);
    if (eventType) query = query.where('event_type', eventType);
    return query;
  }

  async batchGetVibeHistory(artistIds: string[]) {
    return db('event_context_data')
      .whereIn('artist_id', artistIds)
      .select('artist_id', 'vibe_tags');
  }

  async batchGetRecentBookingCounts(artistIds: string[]) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    return db('bookings')
      .whereIn('artist_id', artistIds)
      .where('created_at', '>', ninetyDaysAgo)
      .whereIn('state', ['completed', 'settled', 'confirmed', 'pre_event', 'event_day'])
      .groupBy('artist_id')
      .select('artist_id')
      .count('id as booking_count');
  }

  async batchCheckAvailability(artistIds: string[], date: string) {
    return db('calendar_entries')
      .whereIn('artist_id', artistIds)
      .where('date', date)
      .whereIn('status', ['booked', 'blocked'])
      .select('artist_id');
  }
}

export const decisionEngineRepository = new DecisionEngineRepository();
