import { reviewRepository } from './review.repository.js';
import { bookingRepository } from '../booking/booking.repository.js';
import { BookingState } from '@artist-booking/shared';

export class ReviewService {
  async submitReview(userId: string, data: {
    booking_id: string;
    overall_rating: number;
    dimensions: Record<string, number>;
    comment?: string;
  }) {
    const booking = await bookingRepository.findByIdWithDetails(data.booking_id);
    if (!booking) {
      throw new ReviewError('NOT_FOUND', 'Booking not found', 404);
    }

    // Must be completed or settled
    if (booking.status !== BookingState.COMPLETED && booking.status !== BookingState.SETTLED) {
      throw new ReviewError('INVALID_STATE', 'Booking must be completed before reviewing', 400);
    }

    // Determine role
    let reviewerRole: 'artist' | 'client';
    let revieweeId: string;
    if (booking.artist_user_id === userId) {
      reviewerRole = 'artist';
      revieweeId = booking.client_id;
    } else if (booking.client_user_id === userId) {
      reviewerRole = 'client';
      revieweeId = booking.artist_id;
    } else {
      throw new ReviewError('FORBIDDEN', 'Not a participant in this booking', 403);
    }

    // Check for duplicate
    const existing = await reviewRepository.findByBookingAndReviewer(data.booking_id, userId);
    if (existing) {
      throw new ReviewError('ALREADY_REVIEWED', 'You have already reviewed this booking', 409);
    }

    // Validate rating
    if (data.overall_rating < 1 || data.overall_rating > 5) {
      throw new ReviewError('INVALID_RATING', 'Rating must be between 1 and 5', 400);
    }

    return reviewRepository.create({
      booking_id: data.booking_id,
      reviewer_id: userId,
      reviewee_id: revieweeId,
      reviewer_role: reviewerRole,
      overall_rating: data.overall_rating,
      dimensions: data.dimensions,
      comment: data.comment,
    });
  }

  async getBookingReviews(bookingId: string, userId: string) {
    const booking = await bookingRepository.findByIdWithDetails(bookingId);
    if (!booking) {
      throw new ReviewError('NOT_FOUND', 'Booking not found', 404);
    }

    if (booking.artist_user_id !== userId && booking.client_user_id !== userId) {
      throw new ReviewError('FORBIDDEN', 'Not a participant in this booking', 403);
    }

    return reviewRepository.findByBookingId(bookingId);
  }

  async getArtistReviews(artistId: string, page = 1, perPage = 10) {
    return reviewRepository.findPublishedByReviewee(artistId, page, perPage);
  }

  async publishDueReviews() {
    return reviewRepository.publishDueReviews();
  }
}

export class ReviewError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'ReviewError';
  }
}

export const reviewService = new ReviewService();
