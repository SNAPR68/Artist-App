/**
 * Deal History Vault — searchable archive of briefs + bookings.
 * Agency switching-cost moat: the more deals you run, the harder it is to leave.
 */

import type { FastifyInstance } from 'fastify';
import { db } from '../../infrastructure/database.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';

export async function vaultRoutes(app: FastifyInstance) {
  /**
   * GET /v1/vault/history — Search deal history (briefs + bookings).
   * Auth required.
   */
  app.get('/v1/vault/history', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (request, reply) => {
    const userId = request.user!.user_id;
    const query = request.query as {
      q?: string;
      event_type?: string;
      status?: string;
      city?: string;
      date_from?: string;
      date_to?: string;
      source?: 'briefs' | 'bookings' | 'all';
      page?: string;
      per_page?: string;
    };

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const perPage = Math.min(50, Math.max(1, parseInt(query.per_page || '20', 10)));
    const offset = (page - 1) * perPage;
    const source = query.source || 'all';

    const results: Array<Record<string, unknown>> = [];
    let totalCount = 0;

    // ─── Briefs ───────────────────────────────────────
    if (source === 'all' || source === 'briefs') {
      let briefQuery = db('decision_briefs')
        .where('created_by_user_id', userId)
        .whereNull('deleted_at');

      if (query.q) {
        briefQuery = briefQuery.where('raw_text', 'ilike', `%${query.q}%`);
      }
      if (query.status) {
        briefQuery = briefQuery.where('status', query.status);
      }
      if (query.date_from) {
        briefQuery = briefQuery.where('created_at', '>=', query.date_from);
      }
      if (query.date_to) {
        briefQuery = briefQuery.where('created_at', '<=', query.date_to);
      }

      const [{ count: briefCount }] = await briefQuery.clone().count('* as count');

      const briefs = await briefQuery
        .orderBy('created_at', 'desc')
        .limit(source === 'all' ? Math.ceil(perPage / 2) : perPage)
        .offset(source === 'all' ? 0 : offset)
        .select('id', 'raw_text', 'structured_brief', 'status', 'source', 'created_at');

      for (const b of briefs) {
        const structured = typeof b.structured_brief === 'string'
          ? JSON.parse(b.structured_brief)
          : b.structured_brief || {};
        results.push({
          type: 'brief',
          id: b.id,
          title: structured.event_type
            ? `${structured.event_type} in ${structured.city || '?'}`
            : b.raw_text?.slice(0, 80),
          event_type: structured.event_type || null,
          city: structured.city || null,
          status: b.status,
          source: b.source,
          date: b.created_at,
          raw_text: b.raw_text,
        });
      }
      totalCount += Number(briefCount);
    }

    // ─── Bookings ─────────────────────────────────────
    if (source === 'all' || source === 'bookings') {
      let bookingQuery = db('bookings')
        .where(function () {
          this.where('client_id', userId).orWhere('artist_id', userId);
        });

      if (query.q) {
        bookingQuery = bookingQuery.where(function () {
          this.where('event_type', 'ilike', `%${query.q}%`)
            .orWhere('event_city', 'ilike', `%${query.q}%`);
        });
      }
      if (query.event_type) {
        bookingQuery = bookingQuery.where('event_type', query.event_type);
      }
      if (query.status) {
        bookingQuery = bookingQuery.where('state', query.status);
      }
      if (query.city) {
        bookingQuery = bookingQuery.where('event_city', 'ilike', `%${query.city}%`);
      }
      if (query.date_from) {
        bookingQuery = bookingQuery.where('created_at', '>=', query.date_from);
      }
      if (query.date_to) {
        bookingQuery = bookingQuery.where('created_at', '<=', query.date_to);
      }

      const [{ count: bookingCount }] = await bookingQuery.clone().count('* as count');

      const bookings = await bookingQuery
        .orderBy('created_at', 'desc')
        .limit(source === 'all' ? Math.ceil(perPage / 2) : perPage)
        .offset(source === 'all' ? 0 : offset)
        .select('id', 'event_type', 'event_date', 'event_city', 'state',
          'agreed_amount', 'artist_id', 'client_id', 'created_at');

      // Fetch artist names
      const artistIds = [...new Set(bookings.map((b: any) => b.artist_id).filter(Boolean))];
      const artistMap = new Map<string, string>();
      if (artistIds.length > 0) {
        const artists = await db('artist_profiles').whereIn('user_id', artistIds).select('user_id', 'stage_name');
        for (const a of artists) artistMap.set(a.user_id, a.stage_name);
      }

      for (const b of bookings) {
        results.push({
          type: 'booking',
          id: b.id,
          title: `${b.event_type || 'Event'} — ${artistMap.get(b.artist_id) || 'Artist'}`,
          event_type: b.event_type,
          city: b.event_city,
          status: b.state,
          artist_name: artistMap.get(b.artist_id) || null,
          amount_paise: b.agreed_amount ? Number(b.agreed_amount) : null,
          event_date: b.event_date,
          date: b.created_at,
        });
      }
      totalCount += Number(bookingCount);
    }

    // Sort combined results by date desc
    results.sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());

    return reply.send({
      success: true,
      data: {
        results: results.slice(0, perPage),
        total: totalCount,
        page,
        per_page: perPage,
      },
      errors: [],
    });
  });

  /**
   * GET /v1/vault/export — CSV export of deal history (Pro tier gated).
   * Auth required.
   */
  app.get('/v1/vault/export', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (request, reply) => {
    // TODO: Check subscription tier — gate behind Pro plan
    // For now, return the data as CSV

    const userId = request.user!.user_id;

    const bookings = await db('bookings')
      .where(function () {
        this.where('client_id', userId).orWhere('artist_id', userId);
      })
      .orderBy('created_at', 'desc')
      .limit(500)
      .select('id', 'event_type', 'event_date', 'event_city', 'state',
        'agreed_amount', 'created_at');

    const header = 'ID,Event Type,Event Date,City,Status,Amount (₹),Created At\n';
    const rows = bookings.map((b: any) =>
      `${b.id},${b.event_type || ''},${b.event_date || ''},${b.event_city || ''},${b.state},${b.agreed_amount ? Number(b.agreed_amount) / 100 : ''},${b.created_at}`
    ).join('\n');

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="grid-deal-history.csv"');
    return reply.send(header + rows);
  });
}
