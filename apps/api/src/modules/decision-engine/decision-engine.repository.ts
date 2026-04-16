import { db } from '../../infrastructure/database.js';

export class DecisionEngineRepository {
  async listBriefsByWorkspace(workspaceId: string) {
    const briefs = await db('decision_briefs as b')
      .leftJoin('users as u', 'u.id', 'b.created_by_user_id')
      .where({ 'b.workspace_id': workspaceId })
      .orderBy('b.created_at', 'desc')
      .select(
        'b.id',
        'b.source',
        'b.status',
        'b.raw_text',
        'b.structured_brief',
        'b.created_at',
        'b.created_by_user_id',
        'u.phone as owner_phone',
      );

    const briefIds = briefs.map((b: Record<string, unknown>) => b.id as string).filter(Boolean);
    if (briefIds.length === 0) return [];

    const recCountsRaw = await db('decision_recommendations')
      .whereIn('brief_id', briefIds)
      .groupBy('brief_id')
      .select('brief_id')
      .count('id as count');
    const recCountByBrief = new Map<string, number>();
    for (const row of recCountsRaw as unknown as Array<{ brief_id: string; count: string | number }>) {
      recCountByBrief.set(row.brief_id, Number(row.count ?? 0));
    }

    const events = await db('decision_events')
      .whereIn('brief_id', briefIds)
      .orderBy('created_at', 'asc')
      .select('brief_id', 'event_type', 'payload', 'created_at');

    const eventByBrief: Record<string, Array<{ event_type: string; payload: unknown; created_at: string }>> = {};
    for (const e of events as Array<Record<string, unknown>>) {
      const bid = e.brief_id as string;
      if (!eventByBrief[bid]) eventByBrief[bid] = [];
      eventByBrief[bid].push({
        event_type: String(e.event_type ?? ''),
        payload: typeof e.payload === 'string' ? (() => { try { return JSON.parse(e.payload as string); } catch { return {}; } })() : (e.payload ?? {}),
        created_at: String(e.created_at ?? ''),
      });
    }

    function buildSummary(structured: Record<string, unknown>, rawText?: string | null): string {
      const parts: string[] = [];
      const eventType = structured.event_type as string | undefined;
      const city = structured.city as string | undefined;
      const audience = structured.audience_size as number | undefined;
      const budgetMax = structured.budget_max_paise as number | undefined;
      if (eventType) parts.push(`${eventType} event`);
      if (city) parts.push(`in ${city}`);
      if (audience) parts.push(`${audience} guests`);
      if (budgetMax) parts.push(`budget up to ₹${Math.round(budgetMax / 100).toLocaleString('en-IN')}`);
      const summary = parts.join(' · ');
      if (summary) return summary;
      return (rawText ?? '').slice(0, 120) || 'Event brief';
    }

    return briefs.map((b: Record<string, unknown>) => {
      const briefId = b.id as string;
      const structured = typeof b.structured_brief === 'string'
        ? (() => { try { return JSON.parse(b.structured_brief as string); } catch { return {}; } })()
        : (b.structured_brief ?? {});

      const evs = eventByBrief[briefId] ?? [];
      const hasProposal = evs.some((e) => e.event_type === 'proposal_generated');
      const hasLock = evs.some((e) => e.event_type === 'lock_requested');
      const proposalEvent = [...evs].reverse().find((e) => e.event_type === 'proposal_generated');
      const lockEvent = [...evs].reverse().find((e) => e.event_type === 'lock_requested');

      const proposalPayload = (proposalEvent?.payload ?? {}) as Record<string, unknown>;
      const lockPayload = (lockEvent?.payload ?? {}) as Record<string, unknown>;

      const presentation_slug = (proposalPayload.presentation_slug as string | undefined) ?? null;
      const booking_id = (lockPayload.booking_id as string | undefined) ?? null;

      return {
        id: briefId,
        source: b.source,
        status: b.status,
        created_at: b.created_at,
        created_by_user_id: b.created_by_user_id,
        owner_phone: b.owner_phone ?? null,
        summary: buildSummary(structured as Record<string, unknown>, (b.raw_text as string | null) ?? null),
        structured_brief: structured,
        recommendations_count: recCountByBrief.get(briefId) ?? 0,
        proposal_generated: hasProposal,
        presentation_slug,
        lock_requested: hasLock,
        booking_id,
      };
    });
  }
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
    // Store JSON consistently across environments (jsonb or text)
    if (updates.metadata !== undefined) updateData.metadata = JSON.stringify(updates.metadata ?? {});
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
