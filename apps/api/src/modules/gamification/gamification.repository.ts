import { db } from '../../infrastructure/database.js';

export class GamificationRepository {
  // ─── Points ─────────────────────────────────────────────────

  async getPoints(userId: string) {
    return db('user_points')
      .where({ user_id: userId })
      .first() ?? null;
  }

  async createPoints(userId: string) {
    const [row] = await db('user_points')
      .insert({
        user_id: userId,
        points: 0,
        level: 'bronze',
        streak_days: 0,
        last_activity_at: new Date(),
      })
      .returning('*');
    return row;
  }

  async updatePoints(
    userId: string,
    data: {
      points?: number;
      level?: string;
      streak_days?: number;
      last_activity_at?: Date;
    },
  ) {
    const [row] = await db('user_points')
      .where({ user_id: userId })
      .update({ ...data, updated_at: new Date() })
      .returning('*');
    return row;
  }

  // ─── Transactions ──────────────────────────────────────────

  async addTransaction(
    userId: string,
    actionType: string,
    points: number,
    metadata: Record<string, unknown> = {},
  ) {
    const [row] = await db('point_transactions')
      .insert({
        user_id: userId,
        action_type: actionType,
        points,
        metadata: JSON.stringify(metadata),
      })
      .returning('*');
    return row;
  }

  async getTransactions(userId: string, limit = 20) {
    return db('point_transactions')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit);
  }

  async hasTransaction(
    userId: string,
    actionType: string,
    metadata?: Record<string, unknown>,
  ): Promise<boolean> {
    let query = db('point_transactions')
      .where({ user_id: userId, action_type: actionType });

    if (metadata && Object.keys(metadata).length > 0) {
      query = query.whereRaw('metadata @> ?', [JSON.stringify(metadata)]);
    }

    const row = await query.first();
    return !!row;
  }

  // ─── Badges ────────────────────────────────────────────────

  async getBadges(userId: string) {
    return db('user_badges').where({ user_id: userId });
  }

  async awardBadge(userId: string, badgeType: string) {
    const [row] = await db('user_badges')
      .insert({
        user_id: userId,
        badge_type: badgeType,
        earned_at: new Date(),
      })
      .onConflict(['user_id', 'badge_type'])
      .ignore()
      .returning('*');
    return row;
  }

  async hasBadge(userId: string, badgeType: string): Promise<boolean> {
    const row = await db('user_badges')
      .where({ user_id: userId, badge_type: badgeType })
      .first();
    return !!row;
  }

  // ─── Leaderboard ───────────────────────────────────────────

  async getLeaderboardStats() {
    return db('user_points')
      .select('level')
      .count('* as count')
      .groupBy('level');
  }

  // ─── Bulk Helpers ──────────────────────────────────────────

  async getAllUserPoints() {
    return db('user_points').select('*');
  }

  async getActiveArtistUserIds(): Promise<{ user_id: string }[]> {
    return db('artist_profiles')
      .select('user_id')
      .whereNull('deleted_at');
  }
}

export const gamificationRepository = new GamificationRepository();
