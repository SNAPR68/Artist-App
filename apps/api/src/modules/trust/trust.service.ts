import { db } from '../../infrastructure/database.js';
import { TRUST_SCORE_WEIGHTS } from '@artist-booking/shared';

export class TrustScoreService {
  async recompute(artistId: string): Promise<number> {
    const behavioral = await this.computeBehavioral(artistId);
    const stated = await this.computeStated(artistId);

    const behavioralScore = (
      behavioral.completionRate * TRUST_SCORE_WEIGHTS.COMPLETION_RATE +
      behavioral.punctuality * TRUST_SCORE_WEIGHTS.PUNCTUALITY +
      behavioral.responseTime * TRUST_SCORE_WEIGHTS.RESPONSE_TIME +
      behavioral.rebookingRate * TRUST_SCORE_WEIGHTS.REBOOKING_RATE +
      (100 - behavioral.cancellationRate) * TRUST_SCORE_WEIGHTS.CANCELLATION_RATE +
      behavioral.contractCompliance * TRUST_SCORE_WEIGHTS.CONTRACT_COMPLIANCE
    );

    const statedScore = (
      stated.avgRating * TRUST_SCORE_WEIGHTS.AVG_RATING +
      stated.wouldRebook * TRUST_SCORE_WEIGHTS.WOULD_REBOOK +
      stated.consistencyScore * TRUST_SCORE_WEIGHTS.DIMENSIONAL_VARIANCE
    );

    const rawScore = behavioralScore * TRUST_SCORE_WEIGHTS.BEHAVIORAL_WEIGHT +
                     statedScore * TRUST_SCORE_WEIGHTS.STATED_WEIGHT;

    // Scale to 0-5 (trust_score is decimal 5,2)
    const score = Math.max(0, Math.min(5, rawScore / 20));

    await db('artist_profiles').where({ id: artistId }).update({
      trust_score: score.toFixed(2),
      completion_rate: behavioral.completionRate.toFixed(2),
      on_time_rate: behavioral.punctuality.toFixed(2),
      rebooking_rate: behavioral.rebookingRate.toFixed(2),
      cancellation_rate: behavioral.cancellationRate.toFixed(2),
      avg_contract_compliance: behavioral.contractCompliance.toFixed(2),
      trust_score_breakdown: JSON.stringify({ behavioral, stated, rawScore, finalScore: score }),
      trust_score_updated_at: new Date(),
    });

    return score;
  }

  private async computeBehavioral(artistId: string) {
    // Completion rate: completed+settled / total confirmed+ bookings
    const bookingStats = await db('bookings')
      .where({ artist_id: artistId })
      .whereIn('state', ['confirmed', 'pre_event', 'event_day', 'completed', 'settled', 'cancelled'])
      .select(
        db.raw(`COUNT(*) FILTER (WHERE state IN ('completed', 'settled')) as completed_count`),
        db.raw(`COUNT(*) as total_count`),
      )
      .first();

    const completionRate = bookingStats?.total_count > 0
      ? (Number(bookingStats.completed_count) / Number(bookingStats.total_count)) * 100
      : 50; // default for new artists

    // Punctuality: from event_day_logs where arrival_verified=true
    const arrivalStats = await db('event_day_logs as edl')
      .join('bookings as b', 'b.id', 'edl.booking_id')
      .where('b.artist_id', artistId)
      .whereNotNull('edl.arrival_at')
      .select(
        db.raw(`COUNT(*) FILTER (WHERE edl.arrival_verified = true) as on_time`),
        db.raw(`COUNT(*) as total`),
      )
      .first();

    const punctuality = arrivalStats?.total > 0
      ? (Number(arrivalStats.on_time) / Number(arrivalStats.total)) * 100
      : 80; // default

    // Response time: from artist_profiles (already tracked)
    const profile = await db('artist_profiles').where({ id: artistId }).select('avg_response_time_hours').first();
    const responseHours = Number(profile?.avg_response_time_hours ?? 12);
    // Score: 100 if ≤1h, linearly decreasing to 0 at 48h
    const responseTime = Math.max(0, Math.min(100, 100 - (responseHours / 48) * 100));

    // Rebooking rate: clients who booked 2+ times / total distinct clients
    const rebookStats = await db('bookings')
      .where({ artist_id: artistId })
      .whereIn('state', ['completed', 'settled', 'confirmed', 'pre_event', 'event_day'])
      .select(
        db.raw(`COUNT(DISTINCT client_id) as total_clients`),
        db.raw(`COUNT(DISTINCT client_id) FILTER (WHERE client_id IN (
          SELECT client_id FROM bookings WHERE artist_id = ? AND state IN ('completed', 'settled')
          GROUP BY client_id HAVING COUNT(*) >= 2
        )) as repeat_clients`, [artistId]),
      )
      .first();

    const rebookingRate = rebookStats?.total_clients > 0
      ? (Number(rebookStats.repeat_clients) / Number(rebookStats.total_clients)) * 100
      : 0;

    // Cancellation rate (by artist, last 12 months)
    const oneYearAgo = new Date(Date.now() - 365 * 86400000).toISOString();
    const cancelStats = await db('cancellation_details as cd')
      .join('bookings as b', 'b.id', 'cd.booking_id')
      .where('b.artist_id', artistId)
      .where('cd.sub_type', 'by_artist')
      .where('cd.created_at', '>=', oneYearAgo)
      .count('cd.id as count')
      .first();

    const totalRecentBookings = await db('bookings')
      .where({ artist_id: artistId })
      .where('created_at', '>=', oneYearAgo)
      .count('id as count')
      .first();

    const cancellationRate = Number(totalRecentBookings?.count) > 0
      ? (Number(cancelStats?.count ?? 0) / Number(totalRecentBookings?.count)) * 100
      : 0;

    // Contract compliance: actual_duration / contracted_duration
    const complianceStats = await db('event_day_logs as edl')
      .join('bookings as b', 'b.id', 'edl.booking_id')
      .where('b.artist_id', artistId)
      .whereNotNull('edl.actual_duration_min')
      .where('edl.actual_duration_min', '>', 0)
      .select(
        db.raw(`AVG(LEAST(edl.actual_duration_min::numeric / (b.duration_hours * 60), 1.0) * 100) as avg_compliance`),
      )
      .first();

    const contractCompliance = complianceStats?.avg_compliance != null
      ? Number(complianceStats.avg_compliance)
      : 100; // default

    return { completionRate, punctuality, responseTime, rebookingRate, cancellationRate, contractCompliance };
  }

  private async computeStated(artistId: string) {
    const profile = await db('artist_profiles').where({ id: artistId }).select('user_id').first();
    if (!profile) return { avgRating: 50, wouldRebook: 50, consistencyScore: 50 };

    // Average rating (scale to 0-100)
    const ratingStats = await db('reviews')
      .where({ reviewee_id: profile.user_id, is_published: true })
      .select(
        db.raw(`AVG(overall_rating) as avg_rating`),
        db.raw(`COUNT(*) as count`),
      )
      .first();

    const avgRating = ratingStats?.count > 0
      ? (Number(ratingStats.avg_rating) / 5) * 100
      : 50;

    // Would rebook percentage
    const rebookStats = await db('reviews')
      .where({ reviewee_id: profile.user_id, is_published: true })
      .whereNotNull('would_rebook')
      .select(
        db.raw(`COUNT(*) FILTER (WHERE would_rebook = true) as yes_count`),
        db.raw(`COUNT(*) as total`),
      )
      .first();

    const wouldRebook = rebookStats?.total > 0
      ? (Number(rebookStats.yes_count) / Number(rebookStats.total)) * 100
      : 50;

    // Dimensional variance (lower = more consistent = higher score)
    const dimStats = await db('reviews')
      .where({ reviewee_id: profile.user_id, is_published: true })
      .select('dimensions')
      .limit(50);

    let consistencyScore = 80; // default
    if (dimStats.length >= 3) {
      const variances: number[] = [];
      for (const review of dimStats) {
        const dims = review.dimensions as Record<string, number>;
        const values = Object.values(dims).filter((v): v is number => typeof v === 'number');
        if (values.length >= 2) {
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
          variances.push(variance);
        }
      }
      if (variances.length > 0) {
        const avgVariance = variances.reduce((a, b) => a + b, 0) / variances.length;
        // Lower variance = higher score. Max variance for 1-5 scale is ~4
        consistencyScore = Math.max(0, Math.min(100, (1 - avgVariance / 4) * 100));
      }
    }

    return { avgRating, wouldRebook, consistencyScore };
  }

  async recomputeRecent(): Promise<number> {
    const oneDayAgo = new Date(Date.now() - 24 * 3600000).toISOString();

    // Find artists with recently completed bookings
    const artists = await db('bookings')
      .whereIn('state', ['completed', 'settled'])
      .where('updated_at', '>=', oneDayAgo)
      .distinct('artist_id');

    let count = 0;
    for (const row of artists) {
      try {
        await this.recompute(row.artist_id);
        count++;
      } catch (err) {
        console.error(`[TRUST] Failed to recompute for artist ${row.artist_id}:`, err);
      }
    }

    return count;
  }
}

export const trustService = new TrustScoreService();
