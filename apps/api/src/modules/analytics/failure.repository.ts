import { db } from '../../infrastructure/database.js';

export class FailureRepository {
  async record(data: {
    event_type: string;
    user_id?: string;
    session_id?: string;
    search_params?: Record<string, unknown>;
    booking_id?: string;
    stage?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  }) {
    const [event] = await db('failure_events')
      .insert({
        event_type: data.event_type,
        user_id: data.user_id ?? null,
        session_id: data.session_id ?? null,
        search_params: data.search_params ? JSON.stringify(data.search_params) : null,
        booking_id: data.booking_id ?? null,
        stage: data.stage ?? null,
        reason: data.reason ?? null,
        metadata: JSON.stringify(data.metadata ?? {}),
      })
      .returning('*');
    return event;
  }

  async getSupplyGaps(startDate: string, endDate: string) {
    return db('failure_events')
      .where('event_type', 'empty_search')
      .whereBetween('created_at', [startDate, endDate])
      .select(
        db.raw(`search_params->>'genre' as genre`),
        db.raw(`search_params->>'city' as city`),
        db.raw(`COUNT(*) as search_count`),
      )
      .groupByRaw(`search_params->>'genre', search_params->>'city'`)
      .orderBy('search_count', 'desc')
      .limit(50);
  }

  async getDropoffFunnel(startDate: string, endDate: string) {
    return db('failure_events')
      .whereIn('event_type', ['abandoned_flow', 'booking_dropoff'])
      .whereBetween('created_at', [startDate, endDate])
      .select('stage', db.raw('COUNT(*) as count'))
      .groupBy('stage')
      .orderBy('count', 'desc');
  }

  async getRejectReasons(startDate: string, endDate: string) {
    return db('failure_events')
      .where('event_type', 'rejected_quote')
      .whereBetween('created_at', [startDate, endDate])
      .select('reason', db.raw('COUNT(*) as count'))
      .groupBy('reason')
      .orderBy('count', 'desc')
      .limit(20);
  }
}

export const failureRepository = new FailureRepository();
