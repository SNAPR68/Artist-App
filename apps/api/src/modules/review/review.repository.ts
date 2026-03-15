import { db } from '../../infrastructure/database.js';

export class ReviewRepository {
  async create(data: {
    booking_id: string;
    reviewer_id: string;
    reviewee_id: string;
    reviewer_role: 'artist' | 'client';
    overall_rating: number;
    dimensions: Record<string, number>;
    comment?: string;
  }) {
    const [review] = await db('reviews')
      .insert({
        booking_id: data.booking_id,
        reviewer_id: data.reviewer_id,
        reviewee_id: data.reviewee_id,
        reviewer_role: data.reviewer_role,
        overall_rating: data.overall_rating,
        dimensions: JSON.stringify(data.dimensions),
        comment: data.comment ?? null,
        is_published: false,
        publish_after: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
      })
      .returning('*');
    return review;
  }

  async findByBookingAndReviewer(bookingId: string, reviewerId: string) {
    return db('reviews')
      .where({ booking_id: bookingId, reviewer_id: reviewerId, deleted_at: null })
      .first();
  }

  async findByBookingId(bookingId: string) {
    return db('reviews')
      .where({ booking_id: bookingId, deleted_at: null });
  }

  async findPublishedByReviewee(revieweeId: string, page: number, perPage: number) {
    const offset = (page - 1) * perPage;
    const [countResult] = await db('reviews')
      .where({ reviewee_id: revieweeId, is_published: true, deleted_at: null })
      .count('id as count');

    const reviews = await db('reviews')
      .where({ reviewee_id: revieweeId, is_published: true, deleted_at: null })
      .orderBy('created_at', 'desc')
      .offset(offset)
      .limit(perPage);

    return {
      data: reviews,
      total: Number(countResult.count),
      page,
      per_page: perPage,
    };
  }

  async publishDueReviews() {
    const now = new Date();
    const updated = await db('reviews')
      .where('is_published', false)
      .where('publish_after', '<=', now)
      .where({ deleted_at: null })
      .update({ is_published: true, published_at: now, updated_at: now });
    return updated;
  }

  async getAverageRating(revieweeId: string) {
    const result = await db('reviews')
      .where({ reviewee_id: revieweeId, is_published: true, deleted_at: null })
      .avg('overall_rating as avg_rating')
      .count('id as count')
      .first();
    return {
      average: result?.avg_rating ? Number(Number(result.avg_rating).toFixed(2)) : 0,
      count: Number(result?.count ?? 0),
    };
  }
}

export const reviewRepository = new ReviewRepository();
