/**
 * Admin Analytics — Activation funnel tracking for the Agency OS.
 * Tracks: signup → workspace created → first brief → first proposal → first booking → paid.
 */

import type { FastifyInstance } from 'fastify';
import { db } from '../../infrastructure/database.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';

export async function adminAnalyticsRoutes(app: FastifyInstance) {
  /**
   * GET /v1/admin/analytics/funnel — Activation funnel metrics.
   * Admin only.
   */
  app.get('/v1/admin/analytics/funnel', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (request, reply) => {
    // Check admin role
    const user = await db('users').where({ id: request.user!.user_id }).first();
    if (user?.role !== 'admin') {
      return reply.status(403).send({ success: false, data: null, errors: [{ code: 'FORBIDDEN', message: 'Admin only' }] });
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
      db('users').count('* as count').first() as any,
      db('workspaces').count('* as count').first() as any,
      db('decision_briefs').count('* as count').first() as any,
      db('decision_briefs').where('status', 'completed').count('* as count').first() as any,
      db('bookings').count('* as count').first() as any,
      db('bookings').where('state', 'confirmed').count('* as count').first() as any,
      db('artist_profiles').count('* as count').first() as any,
      db('workspaces').whereRaw("metadata::text LIKE '%\"plan\":\"pro\"%'").count('* as count').first() as any,
    ]);

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      { count: newUsersWeek },
      { count: newBriefsWeek },
      { count: newBookingsWeek },
    ] = await Promise.all([
      db('users').where('created_at', '>=', sevenDaysAgo.toISOString()).count('* as count').first() as any,
      db('decision_briefs').where('created_at', '>=', sevenDaysAgo.toISOString()).count('* as count').first() as any,
      db('bookings').where('created_at', '>=', sevenDaysAgo.toISOString()).count('* as count').first() as any,
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
        supply: {
          total_artists: Number(totalArtists),
        },
        last_7_days: {
          new_users: Number(newUsersWeek),
          new_briefs: Number(newBriefsWeek),
          new_bookings: Number(newBookingsWeek),
        },
      },
      errors: [],
    });
  });
}
