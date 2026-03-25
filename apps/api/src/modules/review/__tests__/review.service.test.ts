import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../review.repository.js', () => ({
  reviewRepository: {
    findByBookingAndReviewer: vi.fn(),
    create: vi.fn(),
    findByBookingId: vi.fn(),
    findPublishedByReviewee: vi.fn(),
    publishDueReviews: vi.fn(),
  },
}));

vi.mock('../../booking/booking.repository.js', () => ({
  bookingRepository: {
    findByIdWithDetails: vi.fn(),
  },
}));

import { reviewRepository } from '../review.repository.js';
import { bookingRepository } from '../../booking/booking.repository.js';
import { ReviewService, ReviewError } from '../review.service.js';

const mockReviewRepo = reviewRepository as unknown as Record<string, ReturnType<typeof vi.fn>>;
const mockBookingRepo = bookingRepository as unknown as Record<string, ReturnType<typeof vi.fn>>;

describe('ReviewService', () => {
  let service: ReviewService;

  const mockBooking = {
    id: 'booking-1',
    state: 'completed',
    artist_user_id: 'artist-user-1',
    client_user_id: 'client-user-1',
    artist_id: 'artist-profile-1',
    client_id: 'client-profile-1',
  };

  beforeEach(() => {
    service = new ReviewService();
    vi.clearAllMocks();
  });

  describe('submitReview', () => {
    it('should submit a client review for completed booking', async () => {
      mockBookingRepo.findByIdWithDetails.mockResolvedValue(mockBooking);
      mockReviewRepo.findByBookingAndReviewer.mockResolvedValue(null);
      mockReviewRepo.create.mockResolvedValue({ id: 'review-1', overall_rating: 5 });

      const result = await service.submitReview('client-user-1', {
        booking_id: 'booking-1',
        overall_rating: 5,
        dimensions: { professionalism: 5, punctuality: 5 },
        comment: 'Great show!',
      });

      expect(result.id).toBe('review-1');
      expect(mockReviewRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reviewer_role: 'client',
          reviewee_id: 'artist-profile-1',
        }),
      );
    });

    it('should submit an artist review for completed booking', async () => {
      mockBookingRepo.findByIdWithDetails.mockResolvedValue(mockBooking);
      mockReviewRepo.findByBookingAndReviewer.mockResolvedValue(null);
      mockReviewRepo.create.mockResolvedValue({ id: 'review-2', overall_rating: 4 });

      await service.submitReview('artist-user-1', {
        booking_id: 'booking-1',
        overall_rating: 4,
        dimensions: {},
      });

      expect(mockReviewRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reviewer_role: 'artist',
          reviewee_id: 'client-profile-1',
        }),
      );
    });

    it('should reject review for non-completed booking', async () => {
      mockBookingRepo.findByIdWithDetails.mockResolvedValue({ ...mockBooking, state: 'confirmed' });

      await expect(
        service.submitReview('client-user-1', {
          booking_id: 'booking-1',
          overall_rating: 5,
          dimensions: {},
        }),
      ).rejects.toThrow('must be completed');
    });

    it('should reject review from non-participant', async () => {
      mockBookingRepo.findByIdWithDetails.mockResolvedValue(mockBooking);

      await expect(
        service.submitReview('random-user', {
          booking_id: 'booking-1',
          overall_rating: 5,
          dimensions: {},
        }),
      ).rejects.toThrow('Not a participant');
    });

    it('should reject duplicate review', async () => {
      mockBookingRepo.findByIdWithDetails.mockResolvedValue(mockBooking);
      mockReviewRepo.findByBookingAndReviewer.mockResolvedValue({ id: 'existing-review' });

      await expect(
        service.submitReview('client-user-1', {
          booking_id: 'booking-1',
          overall_rating: 5,
          dimensions: {},
        }),
      ).rejects.toThrow('already reviewed');
    });

    it('should reject invalid rating', async () => {
      mockBookingRepo.findByIdWithDetails.mockResolvedValue(mockBooking);
      mockReviewRepo.findByBookingAndReviewer.mockResolvedValue(null);

      await expect(
        service.submitReview('client-user-1', {
          booking_id: 'booking-1',
          overall_rating: 6,
          dimensions: {},
        }),
      ).rejects.toThrow('between 1 and 5');
    });

    it('should reject for non-existent booking', async () => {
      mockBookingRepo.findByIdWithDetails.mockResolvedValue(null);

      await expect(
        service.submitReview('client-user-1', {
          booking_id: 'nonexistent',
          overall_rating: 5,
          dimensions: {},
        }),
      ).rejects.toThrow('not found');
    });
  });

  describe('publishDueReviews', () => {
    it('should delegate to repository', async () => {
      mockReviewRepo.publishDueReviews.mockResolvedValue(3);

      const count = await service.publishDueReviews();
      expect(count).toBe(3);
    });
  });
});
