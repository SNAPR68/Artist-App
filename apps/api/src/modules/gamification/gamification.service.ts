import { gamificationRepository } from './gamification.repository.js';
import { db } from '../../infrastructure/database.js';

// ─── Constants ────────────────────────────────────────────────

const POINT_VALUES: Record<string, number> = {
  profile_complete: 100,
  first_booking: 50,
  review_left: 25,
  on_time_performance: 30,
  five_star_review: 40,
  gig_application: 10,
  streak_7_days: 50,
};

const LEVEL_THRESHOLDS: Record<string, number> = {
  bronze: 0,
  silver: 200,
  gold: 500,
  platinum: 1000,
};

const LEVEL_ORDER = ['bronze', 'silver', 'gold', 'platinum'];

function calculateLevel(points: number): string {
  let currentLevel = 'bronze';
  for (const level of LEVEL_ORDER) {
    if (points >= LEVEL_THRESHOLDS[level]) {
      currentLevel = level;
    }
  }
  return currentLevel;
}

function getNextLevelThreshold(currentLevel: string): number | null {
  const idx = LEVEL_ORDER.indexOf(currentLevel);
  if (idx < 0 || idx >= LEVEL_ORDER.length - 1) return null;
  return LEVEL_THRESHOLDS[LEVEL_ORDER[idx + 1]];
}

// ─── Error Class ──────────────────────────────────────────────

export class GamificationError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = 'GamificationError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// ─── Service ──────────────────────────────────────────────────

export class GamificationService {
  /**
   * Get or create gamification profile for a user
   */
  async getProfile(userId: string) {
    let points = await gamificationRepository.getPoints(userId);
    if (!points) {
      points = await gamificationRepository.createPoints(userId);
    }

    const badges = await gamificationRepository.getBadges(userId);
    const nextLevelAt = getNextLevelThreshold(points.level);

    return {
      points: points.points,
      level: points.level,
      streak_days: points.streak_days,
      last_activity_at: points.last_activity_at,
      badges: badges.map((b: any) => ({
        badge_type: b.badge_type,
        earned_at: b.earned_at,
      })),
      next_level_at: nextLevelAt,
    };
  }

  /**
   * Award points for a specific action (idempotent)
   */
  async awardPointsForAction(
    userId: string,
    actionType: string,
    metadata: Record<string, unknown> = {},
  ) {
    const pointValue = POINT_VALUES[actionType];
    if (pointValue === undefined) {
      throw new GamificationError(
        'INVALID_ACTION',
        `Unknown action type: ${actionType}`,
        400,
      );
    }

    // Idempotency check
    const exists = await gamificationRepository.hasTransaction(userId, actionType, metadata);
    if (exists) {
      return { points_awarded: 0, new_total: 0, level: 'bronze', already_awarded: true };
    }

    // Get or create user points
    let userPoints = await gamificationRepository.getPoints(userId);
    if (!userPoints) {
      userPoints = await gamificationRepository.createPoints(userId);
    }

    // Add transaction
    await gamificationRepository.addTransaction(userId, actionType, pointValue, metadata);

    // Calculate new totals
    const newTotal = userPoints.points + pointValue;
    const newLevel = calculateLevel(newTotal);

    // Update user points
    await gamificationRepository.updatePoints(userId, {
      points: newTotal,
      level: newLevel,
      last_activity_at: new Date(),
    });

    return {
      points_awarded: pointValue,
      new_total: newTotal,
      level: newLevel,
      already_awarded: false,
    };
  }

  /**
   * Check and award all eligible badges for a user
   */
  async checkBadgeEligibility(userId: string) {
    const awarded: string[] = [];

    // Get artist profile data
    const artistProfile = await db('artist_profiles')
      .where({ user_id: userId })
      .first();

    if (!artistProfile) return awarded;

    // verified_artist: is_verified === true
    if (artistProfile.is_verified === true) {
      const alreadyHas = await gamificationRepository.hasBadge(userId, 'verified_artist');
      if (!alreadyHas) {
        await gamificationRepository.awardBadge(userId, 'verified_artist');
        awarded.push('verified_artist');
      }
    }

    // top_performer: trust_score >= 4.5
    if (artistProfile.trust_score && parseFloat(artistProfile.trust_score) >= 4.5) {
      const alreadyHas = await gamificationRepository.hasBadge(userId, 'top_performer');
      if (!alreadyHas) {
        await gamificationRepository.awardBadge(userId, 'top_performer');
        awarded.push('top_performer');
      }
    }

    // rising_star: total_bookings < 20 AND trust_score >= 3.5
    const totalBookings = artistProfile.total_bookings ?? 0;
    const trustScore = artistProfile.trust_score ? parseFloat(artistProfile.trust_score) : 0;
    if (totalBookings < 20 && trustScore >= 3.5) {
      const alreadyHas = await gamificationRepository.hasBadge(userId, 'rising_star');
      if (!alreadyHas) {
        await gamificationRepository.awardBadge(userId, 'rising_star');
        awarded.push('rising_star');
      }
    }

    // reliable_backup: is_reliable_backup === true
    if (artistProfile.is_reliable_backup === true) {
      const alreadyHas = await gamificationRepository.hasBadge(userId, 'reliable_backup');
      if (!alreadyHas) {
        await gamificationRepository.awardBadge(userId, 'reliable_backup');
        awarded.push('reliable_backup');
      }
    }

    // early_bird: avg response time < 1 hour (from bookings)
    try {
      const avgResponse = await db('bookings')
        .where({ artist_id: artistProfile.id })
        .whereNotNull('artist_responded_at')
        .avg('EXTRACT(EPOCH FROM (artist_responded_at - created_at)) as avg_response_seconds')
        .first();

      if (avgResponse && avgResponse.avg_response_seconds && Number(avgResponse.avg_response_seconds) < 3600) {
        const alreadyHas = await gamificationRepository.hasBadge(userId, 'early_bird');
        if (!alreadyHas) {
          await gamificationRepository.awardBadge(userId, 'early_bird');
          awarded.push('early_bird');
        }
      }
    } catch {
      // Column may not exist yet — skip
    }

    // crowd_favorite: avg crowd_energy from event_context_data >= 'high'
    try {
      const crowdData = await db('event_context_data')
        .where({ artist_id: artistProfile.id })
        .whereNotNull('crowd_energy')
        .select('crowd_energy');

      if (crowdData.length >= 3) {
        const energyMap: Record<string, number> = { low: 1, medium: 2, high: 3, very_high: 4 };
        const avgEnergy = crowdData.reduce((sum: number, row: any) =>
          sum + (energyMap[row.crowd_energy] ?? 0), 0) / crowdData.length;

        if (avgEnergy >= 3) {
          const alreadyHas = await gamificationRepository.hasBadge(userId, 'crowd_favorite');
          if (!alreadyHas) {
            await gamificationRepository.awardBadge(userId, 'crowd_favorite');
            awarded.push('crowd_favorite');
          }
        }
      }
    } catch {
      // Table may not exist yet — skip
    }

    return awarded;
  }

  /**
   * Claim a specific badge (checks eligibility first)
   */
  async claimBadge(userId: string, badgeType: string) {
    const awarded = await this.checkBadgeEligibility(userId);

    if (awarded.includes(badgeType)) {
      return { badge_type: badgeType, awarded: true };
    }

    // Check if they already had it
    const alreadyHas = await gamificationRepository.hasBadge(userId, badgeType);
    if (alreadyHas) {
      return { badge_type: badgeType, awarded: true, already_owned: true };
    }

    throw new GamificationError(
      'NOT_ELIGIBLE',
      `You are not yet eligible for the "${badgeType}" badge`,
      400,
    );
  }

  /**
   * Get anonymous leaderboard (level distribution only — no individual data)
   */
  async getLeaderboard() {
    const stats = await gamificationRepository.getLeaderboardStats();

    const distribution: Record<string, number> = {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
    };

    let total = 0;
    for (const row of stats) {
      const level = (row as any).level as string;
      const count = parseInt(String((row as any).count), 10);
      if (distribution[level] !== undefined) {
        distribution[level] = count;
      }
      total += count;
    }

    return {
      bronze_count: distribution.bronze,
      silver_count: distribution.silver,
      gold_count: distribution.gold,
      platinum_count: distribution.platinum,
      total,
    };
  }

  /**
   * Update streaks for all users (called by cron)
   */
  async updateStreaks() {
    const allPoints = await gamificationRepository.getAllUserPoints();
    const now = new Date();
    let updatedCount = 0;

    for (const userPoint of allPoints) {
      const lastActivity = userPoint.last_activity_at
        ? new Date(userPoint.last_activity_at)
        : null;

      if (!lastActivity) continue;

      const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

      if (hoursSinceActivity <= 24) {
        const newStreak = (userPoint.streak_days ?? 0) + 1;
        await gamificationRepository.updatePoints(userPoint.user_id, {
          streak_days: newStreak,
        });

        // Award streak bonus at 7-day milestones
        if (newStreak > 0 && newStreak % 7 === 0) {
          const alreadyAwarded = await gamificationRepository.hasTransaction(
            userPoint.user_id,
            'streak_7_days',
            { streak_count: newStreak },
          );
          if (!alreadyAwarded) {
            await this.awardPointsForAction(userPoint.user_id, 'streak_7_days', {
              streak_count: newStreak,
            });
          }
        }

        updatedCount++;
      } else if (hoursSinceActivity > 48) {
        // Reset streak if no activity for over 48 hours
        if (userPoint.streak_days > 0) {
          await gamificationRepository.updatePoints(userPoint.user_id, {
            streak_days: 0,
          });
          updatedCount++;
        }
      }
    }

    return updatedCount;
  }

  /**
   * Batch check badges for all active artists (called by cron)
   */
  async batchCheckBadges() {
    const artists = await gamificationRepository.getActiveArtistUserIds();
    let badgesAwarded = 0;

    for (const artist of artists) {
      const awarded = await this.checkBadgeEligibility(artist.user_id);
      badgesAwarded += awarded.length;
    }

    return badgesAwarded;
  }
}

export const gamificationService = new GamificationService();
