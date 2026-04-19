/**
 * Admin Analytics — funnel + MRR/churn + agency health.
 */

import type { FastifyInstance } from 'fastify';
import { db } from '../../infrastructure/database.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';

async function assertAdmin(userId: string): Promise<boolean> {
  const user = await db('users').where({ id: userId }).first();
  return user?.role === 'admin';
}

export async function adminAnalyticsRoutes(app: FastifyInstance) {
  // ─── Activation funnel ─────────────────────────────────
  app.get('/v1/admin/analytics/funnel', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (request, reply) => {
    if (!(await assertAdmin(request.user!.user_id))) {
      return reply.status(403).send({ success: false, errors: [{ code: 'FORBIDDEN', message: 'Admin only' }] });
    }

    const [
      { count: totalUsers },
      { count: totalWorkspaces },
      { count: totalBriefs },
      { count: completedBriefs },
      { count: totalBookings },
      { count: confirmedBookings },
      { count: totalArtists },
      { count: proWorkspaces },
    ] = await Promise.all([
      db('users').count<{ count: string }[]>('* as count').first() as unknown as Promise<{ count: string }>,
      db('workspaces').count<{ count: string }[]>('* as count').first() as unknown as Promise<{ count: string }>,
      db('decision_briefs').count<{ count: string }[]>('* as count').first() as unknown as Promise<{ count: string }>,
      db('decision_briefs').where('status', 'completed').count<{ count: string }[]>('* as count').first() as unknown as Promise<{ count: string }>,
      db('bookings').count<{ count: string }[]>('* as count').first() as unknown as Promise<{ count: string }>,
      db('bookings').where('state', 'confirmed').count<{ count: string }[]>('* as count').first() as unknown as Promise<{ count: string }>,
      db('artist_profiles').count<{ count: string }[]>('* as count').first() as unknown as Promise<{ count: string }>,
      db('workspaces').whereRaw("metadata::text LIKE '%\"plan\":\"pro\"%'").count<{ count: string }[]>('* as count').first() as unknown as Promise<{ count: string }>,
    ]);

    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const [newUsersWeek, newBriefsWeek, newBookingsWeek] = await Promise.all([
      db('users').where('created_at', '>=', sevenDaysAgo.toISOString()).count<{ count: string }[]>('* as count').first(),
      db('decision_briefs').where('created_at', '>=', sevenDaysAgo.toISOString()).count<{ count: string }[]>('* as count').first(),
      db('bookings').where('created_at', '>=', sevenDaysAgo.toISOString()).count<{ count: string }[]>('* as count').first(),
    ]);

    return reply.send({
      success: true,
      data: {
        funnel: {
          total_users: Number(totalUsers),
          workspaces_created: Number(totalWorkspaces),
          briefs_submitted: Number(totalBriefs),
          briefs_completed: Number(completedBriefs),
          bookings_created: Number(totalBookings),
          bookings_confirmed: Number(confirmedBookings),
          pro_subscriptions: Number(proWorkspaces),
        },
        supply: { total_artists: Number(totalArtists) },
        last_7_days: {
          new_users: Number(newUsersWeek?.count ?? 0),
          new_briefs: Number(newBriefsWeek?.count ?? 0),
          new_bookings: Number(newBookingsWeek?.count ?? 0),
        },
      },
      errors: [],
    });
  });

  // ─── Revenue (MRR / ARR / trials) ─────────────────────
  app.get('/v1/admin/analytics/revenue', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (request, reply) => {
    if (!(await assertAdmin(request.user!.user_id))) {
      return reply.status(403).send({ success: false, errors: [{ code: 'FORBIDDEN', message: 'Admin only' }] });
    }

    // Active paid subscriptions → MRR
    const activeSubs = await db('agency_subscriptions')
      .whereIn('status', ['active', 'authenticated'])
      .select('plan', 'amount_paise');

    const mrrPaise = activeSubs.reduce((s, r) => s + Number(r.amount_paise), 0);
    const mrrByPlan: Record<string, { count: number; mrr_paise: number }> = {};
    for (const r of activeSubs) {
      const k = r.plan;
      mrrByPlan[k] = mrrByPlan[k] || { count: 0, mrr_paise: 0 };
      mrrByPlan[k].count += 1;
      mrrByPlan[k].mrr_paise += Number(r.amount_paise);
    }

    // Trials active
    const trialWorkspaces = await db('workspaces')
      .whereRaw("metadata::text LIKE '%\"plan\":\"pro\"%'")
      .whereRaw("metadata::text LIKE '%\"trial_ends_at\"%'")
      .select('id', 'metadata');
    const activeTrials = trialWorkspaces.filter((w) => {
      const m = typeof w.metadata === 'string' ? JSON.parse(w.metadata) : w.metadata || {};
      return m.trial_ends_at && new Date(m.trial_ends_at) > new Date();
    }).length;

    // Last 30d charged revenue
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const paid30 = await db('subscription_invoices')
      .where('status', 'paid')
      .where('paid_at', '>=', thirtyDaysAgo.toISOString())
      .sum<{ sum: string }[]>('amount_paise as sum').first();
    const revenue30dPaise = Number(paid30?.sum ?? 0);

    // Churn last 30d: subscriptions that ended
    const churned30 = await db('agency_subscriptions')
      .whereIn('status', ['cancelled', 'expired', 'halted', 'completed'])
      .where('ended_at', '>=', thirtyDaysAgo.toISOString())
      .count<{ count: string }[]>('* as count').first();

    // Cancels scheduled
    const scheduledCancels = await db('agency_subscriptions')
      .where({ cancel_at_cycle_end: true })
      .whereIn('status', ['active', 'authenticated'])
      .count<{ count: string }[]>('* as count').first();

    return reply.send({
      success: true,
      data: {
        mrr_paise: mrrPaise,
        arr_paise: mrrPaise * 12,
        active_paid: activeSubs.length,
        active_trials: activeTrials,
        by_plan: mrrByPlan,
        revenue_30d_paise: revenue30dPaise,
        churned_30d: Number(churned30?.count ?? 0),
        scheduled_cancels: Number(scheduledCancels?.count ?? 0),
      },
      errors: [],
    });
  });

  // ─── Per-agency health list ────────────────────────────
  app.get<{ Querystring: { limit?: string; order?: 'health_desc' | 'health_asc' | 'recent' } }>(
    '/v1/admin/analytics/agencies',
    { preHandler: [authMiddleware, rateLimit('READ')] },
    async (request, reply) => {
      if (!(await assertAdmin(request.user!.user_id))) {
        return reply.status(403).send({ success: false, errors: [{ code: 'FORBIDDEN', message: 'Admin only' }] });
      }
      const limit = Math.min(200, Math.max(1, Number(request.query.limit ?? 50)));

      const workspaces = await db('workspaces').select('id', 'name', 'metadata', 'created_at').orderBy('created_at', 'desc').limit(limit);

      const ids = workspaces.map((w) => w.id);
      if (ids.length === 0) return reply.send({ success: true, data: [], errors: [] });

      const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [subs, briefCounts, bookingCounts, lastActivity, memberCounts] = await Promise.all([
        db('agency_subscriptions').whereIn('workspace_id', ids).select('*'),
        db('decision_briefs').whereIn('workspace_id', ids).where('created_at', '>=', thirtyDaysAgo.toISOString())
          .select('workspace_id').count<{ workspace_id: string; count: string }[]>('* as count').groupBy('workspace_id'),
        db('bookings').whereIn('workspace_id', ids).where('created_at', '>=', thirtyDaysAgo.toISOString())
          .select('workspace_id').count<{ workspace_id: string; count: string }[]>('* as count').groupBy('workspace_id'),
        db('workspace_activity').whereIn('workspace_id', ids).max<{ workspace_id: string; last_at: string }[]>('created_at as last_at').select('workspace_id').groupBy('workspace_id').catch(() => [] as Array<{ workspace_id: string; last_at: string }>),
        db('workspace_members').whereIn('workspace_id', ids).where('is_active', true)
          .select('workspace_id').count<{ workspace_id: string; count: string }[]>('* as count').groupBy('workspace_id'),
      ]);

      const subByWs = new Map<string, (typeof subs)[number]>();
      for (const s of subs) if (['active', 'authenticated', 'pending'].includes(s.status)) subByWs.set(s.workspace_id, s);
      const briefByWs = new Map<string, number>();
      for (const r of briefCounts) briefByWs.set(r.workspace_id as string, Number(r.count));
      const bookingByWs = new Map<string, number>();
      for (const r of bookingCounts) bookingByWs.set(r.workspace_id as string, Number(r.count));
      const lastByWs = new Map<string, string>();
      for (const r of lastActivity as Array<{ workspace_id: string; last_at: string }>) {
        if (r.last_at) lastByWs.set(r.workspace_id, r.last_at);
      }
      const memberByWs = new Map<string, number>();
      for (const r of memberCounts) memberByWs.set(r.workspace_id as string, Number(r.count));

      const rows = workspaces.map((w) => {
        const metadata = typeof w.metadata === 'string' ? JSON.parse(w.metadata) : w.metadata || {};
        const plan: string = metadata.plan ?? 'free';
        const briefs30 = briefByWs.get(w.id) ?? 0;
        const bookings30 = bookingByWs.get(w.id) ?? 0;
        const members = memberByWs.get(w.id) ?? 0;
        const lastAt = lastByWs.get(w.id) ?? null;

        // Health score 0-100
        const planScore = plan === 'enterprise' ? 40 : plan === 'pro' ? 30 : 0;
        const activityScore = Math.min(30, briefs30 * 3 + bookings30 * 6);
        const teamScore = Math.min(15, members * 3);
        const recencyScore = lastAt
          ? Math.max(0, 15 - Math.floor((Date.now() - new Date(lastAt).getTime()) / 86_400_000))
          : 0;
        const health = Math.min(100, planScore + activityScore + teamScore + recencyScore);

        return {
          workspace_id: w.id,
          name: w.name,
          plan,
          trial_ends_at: metadata.trial_ends_at ?? null,
          subscription: subByWs.get(w.id) ?? null,
          briefs_30d: briefs30,
          bookings_30d: bookings30,
          active_members: members,
          last_activity_at: lastAt,
          health_score: health,
          created_at: w.created_at,
        };
      });

      const order = request.query.order ?? 'health_desc';
      rows.sort((a, b) => {
        if (order === 'health_asc') return a.health_score - b.health_score;
        if (order === 'recent') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return b.health_score - a.health_score;
      });

      return reply.send({ success: true, data: rows, errors: [] });
    },
  );
}
