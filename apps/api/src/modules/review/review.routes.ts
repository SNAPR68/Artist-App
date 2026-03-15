import type { FastifyInstance } from 'fastify';
import { reviewService } from './review.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';

export async function reviewRoutes(app: FastifyInstance) {
  /** POST /v1/reviews — Submit a review for a booking */
  app.post('/v1/reviews', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const body = request.body as {
      booking_id: string;
      overall_rating: number;
      dimensions: Record<string, number>;
      comment?: string;
    };

    const review = await reviewService.submitReview(request.user!.user_id, body);

    return reply.status(201).send({
      success: true,
      data: review,
      errors: [],
    });
  });

  /** GET /v1/reviews/booking/:bookingId — Get reviews for a booking */
  app.get('/v1/reviews/booking/:bookingId', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { bookingId } = request.params as { bookingId: string };
    const reviews = await reviewService.getBookingReviews(bookingId, request.user!.user_id);

    return reply.send({
      success: true,
      data: reviews,
      errors: [],
    });
  });

  /** GET /v1/reviews/artist/:artistId — Get published reviews for an artist */
  app.get('/v1/reviews/artist/:artistId', async (request, reply) => {
    const { artistId } = request.params as { artistId: string };
    const query = request.query as { page?: string; per_page?: string };
    const page = parseInt(query.page ?? '1', 10);
    const perPage = parseInt(query.per_page ?? '10', 10);

    const reviews = await reviewService.getArtistReviews(artistId, page, perPage);

    return reply.send({
      success: true,
      ...reviews,
      errors: [],
    });
  });
}
