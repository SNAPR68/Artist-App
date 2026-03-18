import { db } from '../../infrastructure/database.js';

// ─── Interfaces ────────────────────────────────────────────────

export interface CreateDisputeData {
  review_id: string;
  disputed_by: string;
  reason: string;
  evidence?: string;
  status: string;
}

export interface UpdateDisputeData {
  status?: string;
  resolution?: string;
  admin_notes?: string;
  resolved_by?: string;
  resolved_at?: Date;
}

export interface CreateIssueFlagData {
  venue_id: string;
  flagged_by: string;
  issue_type: string;
  description?: string;
  booking_id?: string;
  is_verified?: boolean;
  auto_advisory?: string;
}

export interface UpdateIssueFlagData {
  is_verified?: boolean;
  verified_by?: string;
  auto_advisory?: string;
}

export interface UpsertWeightData {
  venue_id: string;
  review_id: string;
  weight: number;
  reason: string;
}

// ─── Repository ────────────────────────────────────────────────

export class ReputationDefenseRepository {

  // ─── Review Disputes ───────────────────────────────────────────

  async createDispute(data: CreateDisputeData) {
    const [row] = await db('review_disputes')
      .insert({
        review_id: data.review_id,
        disputed_by: data.disputed_by,
        reason: data.reason,
        evidence: data.evidence ?? null,
        status: data.status,
      })
      .returning('*');
    return row;
  }

  async getDispute(id: string) {
    return db('review_disputes')
      .where({ id })
      .first();
  }

  async getDisputesByUser(userId: string) {
    return db('review_disputes')
      .where({ disputed_by: userId })
      .orderBy('created_at', 'desc');
  }

  async getDisputesByStatus(status: string) {
    return db('review_disputes')
      .where({ status })
      .orderBy('created_at', 'desc');
  }

  async updateDispute(id: string, data: UpdateDisputeData) {
    const [row] = await db('review_disputes')
      .where({ id })
      .update({
        ...data,
        updated_at: new Date(),
      })
      .returning('*');
    return row;
  }

  async getDisputeByReviewId(reviewId: string) {
    return db('review_disputes')
      .where({ review_id: reviewId })
      .whereNot({ status: 'response' })
      .first();
  }

  // ─── Venue Issue Flags ─────────────────────────────────────────

  async createIssueFlag(data: CreateIssueFlagData) {
    const [row] = await db('venue_issue_flags')
      .insert({
        venue_id: data.venue_id,
        flagged_by: data.flagged_by,
        issue_type: data.issue_type,
        description: data.description ?? null,
        booking_id: data.booking_id ?? null,
        is_verified: data.is_verified ?? false,
        auto_advisory: data.auto_advisory ?? null,
      })
      .returning('*');
    return row;
  }

  async getIssueFlagsByVenue(venueId: string) {
    return db('venue_issue_flags')
      .where({ venue_id: venueId })
      .orderBy('created_at', 'desc');
  }

  async getVerifiedFlagCount(venueId: string) {
    const [result] = await db('venue_issue_flags')
      .where({ venue_id: venueId, is_verified: true })
      .count('id as count');
    return Number(result.count);
  }

  async updateIssueFlag(id: string, data: UpdateIssueFlagData) {
    const [row] = await db('venue_issue_flags')
      .where({ id })
      .update({
        ...data,
        updated_at: new Date(),
      })
      .returning('*');
    return row;
  }

  async getVenuesWithIssues(minFlags: number) {
    const rows = await db('venue_issue_flags')
      .select('venue_id')
      .where({ is_verified: true })
      .groupBy('venue_id')
      .havingRaw('COUNT(id) >= ?', [minFlags]);
    return rows.map((r: { venue_id: string }) => r.venue_id);
  }

  // ─── Venue Review Weights ──────────────────────────────────────

  async upsertWeight(venueId: string, reviewId: string, weight: number, reason: string) {
    const [row] = await db('venue_review_weights')
      .insert({
        venue_id: venueId,
        review_id: reviewId,
        weight,
        reason,
      })
      .onConflict(['venue_id', 'review_id'])
      .merge({
        weight,
        reason,
        updated_at: new Date(),
      })
      .returning('*');
    return row;
  }

  async getWeightedReviews(artistId: string) {
    return db('reviews as r')
      .leftJoin('venue_review_weights as vrw', 'r.id', 'vrw.review_id')
      .join('bookings as b', 'r.booking_id', 'b.id')
      .where({ 'r.reviewee_id': artistId, 'r.is_published': true, 'r.deleted_at': null })
      .select(
        'r.*',
        db.raw('COALESCE(vrw.weight, 1.0) as venue_weight'),
        'vrw.reason as weight_reason',
        'b.venue_id',
      )
      .orderBy('r.created_at', 'desc');
  }

  async getWeightsForVenue(venueId: string) {
    return db('venue_review_weights')
      .where({ venue_id: venueId });
  }

  async deleteWeightsForVenue(venueId: string) {
    return db('venue_review_weights')
      .where({ venue_id: venueId })
      .del();
  }

  // ─── Auto-flagging Queries ─────────────────────────────────────

  async getRecentLowRatedVenueEvents() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return db('event_context_data as ecd')
      .join('bookings as b', 'ecd.booking_id', 'b.id')
      .where(function () {
        this.where('ecd.venue_acoustics_rating', '<=', 2)
          .orWhere('ecd.venue_crowd_flow_rating', '<=', 2);
      })
      .where('ecd.created_at', '>=', twentyFourHoursAgo)
      .select(
        'ecd.*',
        'b.venue_id',
        'b.id as booking_id',
      );
  }
}

export const reputationDefenseRepository = new ReputationDefenseRepository();
