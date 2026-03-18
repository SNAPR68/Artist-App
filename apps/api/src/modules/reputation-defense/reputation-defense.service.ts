import { reputationDefenseRepository } from './reputation-defense.repository.js';
import {
  VENUE_ISSUE_REVIEW_WEIGHT_REDUCTION,
  VENUE_ISSUE_FLAG_THRESHOLD,
} from '@artist-booking/shared';
import { db } from '../../infrastructure/database.js';

// ─── Error Class ───────────────────────────────────────────────

export class ReputationDefenseError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'ReputationDefenseError';
  }
}

// ─── Service ───────────────────────────────────────────────────

export class ReputationDefenseService {

  // ─── Review Disputes ───────────────────────────────────────────

  /**
   * Submit a dispute against a review.
   * Only the reviewee (artist being reviewed) may dispute.
   */
  async submitDispute(userId: string, reviewId: string, data: {
    reason: string;
    evidence?: string;
  }) {
    // 1. Verify the review exists and is published
    const review = await db('reviews')
      .where({ id: reviewId, is_published: true, deleted_at: null })
      .first();

    if (!review) {
      throw new ReputationDefenseError('NOT_FOUND', 'Review not found or not published', 404);
    }

    // 2. Verify the user is the reviewee (artist being reviewed)
    if (review.reviewee_id !== userId) {
      throw new ReputationDefenseError('FORBIDDEN', 'Only the reviewed party can dispute a review', 403);
    }

    // 3. Check no existing dispute for this review
    const existingDispute = await reputationDefenseRepository.getDisputeByReviewId(reviewId);
    if (existingDispute) {
      throw new ReputationDefenseError('ALREADY_DISPUTED', 'A dispute already exists for this review', 409);
    }

    // 4. Create dispute with status SUBMITTED
    const dispute = await reputationDefenseRepository.createDispute({
      review_id: reviewId,
      disputed_by: userId,
      reason: data.reason,
      evidence: data.evidence,
      status: 'submitted',
    });

    return dispute;
  }

  /**
   * Get all disputes submitted by the current user.
   */
  async getMyDisputes(userId: string) {
    return reputationDefenseRepository.getDisputesByUser(userId);
  }

  /**
   * Get a single dispute by ID.
   */
  async getDispute(disputeId: string) {
    const dispute = await reputationDefenseRepository.getDispute(disputeId);
    if (!dispute) {
      throw new ReputationDefenseError('NOT_FOUND', 'Dispute not found', 404);
    }
    return dispute;
  }

  /**
   * Admin resolves a dispute: upheld, overturned, or dismissed.
   * If overturned, the review is unpublished and its weight set to 0.
   */
  async resolveDispute(disputeId: string, adminUserId: string, resolution: string, adminNotes?: string) {
    // 1. Get dispute, verify status is submitted or under_review
    const dispute = await reputationDefenseRepository.getDispute(disputeId);
    if (!dispute) {
      throw new ReputationDefenseError('NOT_FOUND', 'Dispute not found', 404);
    }

    if (dispute.status !== 'submitted' && dispute.status !== 'under_review') {
      throw new ReputationDefenseError(
        'INVALID_STATE',
        `Dispute cannot be resolved from status "${dispute.status}"`,
        400,
      );
    }

    // 2. Update status to resolution
    const updated = await reputationDefenseRepository.updateDispute(disputeId, {
      status: resolution,
      resolution,
      admin_notes: adminNotes || undefined,
      resolved_by: adminUserId,
      resolved_at: new Date(),
    });

    // 3. If OVERTURNED: unpublish the review
    if (resolution === 'overturned') {
      await db('reviews')
        .where({ id: dispute.review_id })
        .update({ is_published: false, updated_at: new Date() });

      // 4. If OVERTURNED: set venue_review_weight to 0 for that review
      const booking = await db('bookings')
        .where({ id: (await db('reviews').where({ id: dispute.review_id }).first()).booking_id })
        .first();

      if (booking?.venue_id) {
        await reputationDefenseRepository.upsertWeight(
          booking.venue_id,
          dispute.review_id,
          0,
          'dispute_overturned',
        );
      }
    }

    return updated;
  }

  // ─── Artist Response ───────────────────────────────────────────

  /**
   * Allow an artist to post a public response to a review.
   * Stored as a review_dispute entry with status='response'.
   */
  async submitResponse(userId: string, reviewId: string, responseText: string) {
    // 1. Verify review exists and is published
    const review = await db('reviews')
      .where({ id: reviewId, is_published: true, deleted_at: null })
      .first();

    if (!review) {
      throw new ReputationDefenseError('NOT_FOUND', 'Review not found or not published', 404);
    }

    // 2. Verify user is the reviewee
    if (review.reviewee_id !== userId) {
      throw new ReputationDefenseError('FORBIDDEN', 'Only the reviewed party can respond to a review', 403);
    }

    // 3. Check for existing response
    const existingResponse = await db('review_disputes')
      .where({ review_id: reviewId, status: 'response' })
      .first();

    if (existingResponse) {
      throw new ReputationDefenseError('ALREADY_RESPONDED', 'You have already responded to this review', 409);
    }

    // 4. Create a review_dispute entry with status='response'
    const response = await reputationDefenseRepository.createDispute({
      review_id: reviewId,
      disputed_by: userId,
      reason: responseText,
      status: 'response',
    });

    return response;
  }

  // ─── Venue Issue Flags ─────────────────────────────────────────

  /**
   * Report a venue issue (e.g., poor acoustics, crowd flow problems).
   * If the venue crosses the flag threshold, generate an auto_advisory.
   */
  async reportVenueIssue(userId: string, data: {
    venue_id: string;
    issue_type: string;
    description?: string;
    booking_id?: string;
  }) {
    // 1. Verify venue exists
    const venue = await db('venues').where({ id: data.venue_id }).first();
    if (!venue) {
      throw new ReputationDefenseError('NOT_FOUND', 'Venue not found', 404);
    }

    // 2. Create venue_issue_flag
    const flag = await reputationDefenseRepository.createIssueFlag({
      venue_id: data.venue_id,
      flagged_by: userId,
      issue_type: data.issue_type,
      description: data.description,
      booking_id: data.booking_id,
    });

    // 3. Check if venue now has >= VENUE_ISSUE_FLAG_THRESHOLD verified flags
    const verifiedCount = await reputationDefenseRepository.getVerifiedFlagCount(data.venue_id);

    // 4. If threshold reached, generate auto_advisory text
    if (verifiedCount >= VENUE_ISSUE_FLAG_THRESHOLD) {
      const venueName = venue.name || 'this venue';
      const advisory = `Multiple issues reported at ${venueName} — review venue conditions before booking`;
      await reputationDefenseRepository.updateIssueFlag(flag.id, {
        auto_advisory: advisory,
      });
      flag.auto_advisory = advisory;
    }

    return flag;
  }

  /**
   * Get all issue flags for a venue.
   */
  async getVenueIssues(venueId: string) {
    return reputationDefenseRepository.getIssueFlagsByVenue(venueId);
  }

  /**
   * Admin verifies a venue issue flag.
   * If verified, triggers weight recomputation for the venue.
   */
  async verifyVenueIssue(issueId: string, adminUserId: string, isVerified: boolean, autoAdvisory?: string) {
    // 1. Update the flag
    const updated = await reputationDefenseRepository.updateIssueFlag(issueId, {
      is_verified: isVerified,
      verified_by: adminUserId,
      auto_advisory: autoAdvisory,
    });

    if (!updated) {
      throw new ReputationDefenseError('NOT_FOUND', 'Venue issue flag not found', 404);
    }

    // 2. If now verified, trigger weight recomputation for this venue
    if (isVerified) {
      await this.recomputeWeightsForVenue(updated.venue_id);
    }

    return updated;
  }

  // ─── Venue-Adjusted Review Weighting ───────────────────────────

  /**
   * Compute the venue-adjusted weighted rating for an artist.
   * Reviews from venues with verified issues are down-weighted.
   */
  async getWeightedRating(userId: string) {
    // 1. Resolve artist_id (userId is the artist's user_id, reviewee_id in reviews)
    const artistId = userId;

    // 2. Get all published reviews for this artist with venue_review_weights
    const reviews = await reputationDefenseRepository.getWeightedReviews(artistId);

    if (reviews.length === 0) {
      return {
        weighted_avg_rating: 0,
        total_reviews: 0,
        adjusted_reviews: 0,
        unadjusted_avg_rating: 0,
      };
    }

    // 3. Compute weighted average: SUM(overall_rating * weight) / SUM(weight)
    let weightedSum = 0;
    let weightTotal = 0;
    let unadjustedSum = 0;
    let adjustedCount = 0;

    for (const review of reviews) {
      const weight = Number(review.venue_weight) || 1.0;
      weightedSum += Number(review.overall_rating) * weight;
      weightTotal += weight;
      unadjustedSum += Number(review.overall_rating);
      if (weight < 1.0) {
        adjustedCount++;
      }
    }

    const weightedAvg = weightTotal > 0 ? weightedSum / weightTotal : 0;
    const unadjustedAvg = unadjustedSum / reviews.length;

    return {
      weighted_avg_rating: Number(weightedAvg.toFixed(2)),
      total_reviews: reviews.length,
      adjusted_reviews: adjustedCount,
      unadjusted_avg_rating: Number(unadjustedAvg.toFixed(2)),
    };
  }

  /**
   * Recompute venue review weights for a single venue.
   */
  private async recomputeWeightsForVenue(venueId: string) {
    const verifiedCount = await reputationDefenseRepository.getVerifiedFlagCount(venueId);

    if (verifiedCount < VENUE_ISSUE_FLAG_THRESHOLD) {
      // Remove existing weights — venue no longer flagged
      await reputationDefenseRepository.deleteWeightsForVenue(venueId);
      return;
    }

    // Get all reviews linked to bookings at this venue
    const reviews = await db('reviews as r')
      .join('bookings as b', 'r.booking_id', 'b.id')
      .where({ 'b.venue_id': venueId, 'r.deleted_at': null })
      .select('r.id as review_id');

    for (const review of reviews) {
      await reputationDefenseRepository.upsertWeight(
        venueId,
        review.review_id,
        VENUE_ISSUE_REVIEW_WEIGHT_REDUCTION,
        'venue_issue_flags',
      );
    }
  }

  /**
   * Batch recompute venue weights for all flagged venues.
   * Intended to be called as a cron job.
   */
  async recomputeVenueWeights() {
    // 1. Get all venues with >= VENUE_ISSUE_FLAG_THRESHOLD verified flags
    const venueIds = await reputationDefenseRepository.getVenuesWithIssues(VENUE_ISSUE_FLAG_THRESHOLD);

    // 2. For each venue: set weight = VENUE_ISSUE_REVIEW_WEIGHT_REDUCTION
    for (const venueId of venueIds) {
      const reviews = await db('reviews as r')
        .join('bookings as b', 'r.booking_id', 'b.id')
        .where({ 'b.venue_id': venueId, 'r.deleted_at': null })
        .select('r.id as review_id');

      for (const review of reviews) {
        await reputationDefenseRepository.upsertWeight(
          venueId,
          review.review_id,
          VENUE_ISSUE_REVIEW_WEIGHT_REDUCTION,
          'venue_issue_flags',
        );
      }
    }

    // 3. Return count of venues processed
    return { venues_processed: venueIds.length };
  }

  // ─── Auto-flagging ─────────────────────────────────────────────

  /**
   * Auto-flag venue issues based on recently submitted event context data.
   * Called after event context submission or as a cron job.
   */
  async autoFlagVenueIssues() {
    // 1. Get recent low-rated venue events from repository
    const events = await reputationDefenseRepository.getRecentLowRatedVenueEvents();
    let flagsCreated = 0;

    // 2. For each low-rated event
    for (const event of events) {
      const issueTypes: string[] = [];

      // Determine issue_type from ratings
      if (event.venue_acoustics_rating && Number(event.venue_acoustics_rating) <= 2) {
        issueTypes.push('poor_acoustics');
      }
      if (event.venue_crowd_flow_rating && Number(event.venue_crowd_flow_rating) <= 2) {
        issueTypes.push('poor_crowd_flow');
      }

      for (const issueType of issueTypes) {
        // Create venue_issue_flag with flagged_by = 'system:auto_flag'
        const flag = await reputationDefenseRepository.createIssueFlag({
          venue_id: event.venue_id,
          flagged_by: 'system:auto_flag',
          issue_type: issueType,
          description: `Auto-flagged from event context data (booking ${event.booking_id})`,
          booking_id: event.booking_id,
          is_verified: false,
        });
        flagsCreated++;

        // If venue now has 3+ flags of same type, generate auto_advisory
        const sameFlagsCount = await db('venue_issue_flags')
          .where({ venue_id: event.venue_id, issue_type: issueType })
          .count('id as count')
          .first();

        if (sameFlagsCount && Number(sameFlagsCount.count) >= 3) {
          const venue = await db('venues').where({ id: event.venue_id }).first();
          const venueName = venue?.name || 'this venue';

          let advisory: string;
          if (issueType === 'poor_acoustics') {
            advisory = `PA issues reported at ${venueName} — consider bringing own PA or confirm venue upgrade`;
          } else {
            advisory = `Crowd flow issues reported at ${venueName} — confirm venue capacity and layout before booking`;
          }

          await reputationDefenseRepository.updateIssueFlag(flag.id, {
            auto_advisory: advisory,
          });
        }
      }
    }

    return { flags_created: flagsCreated };
  }
}

export const reputationDefenseService = new ReputationDefenseService();
