import type { FastifyInstance } from 'fastify';
import { bookingService } from './booking.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validateBody } from '../../middleware/validation.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import { createBookingSchema, submitQuoteSchema, BookingState } from '@artist-booking/shared';
import { generateContract } from '../document/contract.generator.js';

export async function bookingRoutes(app: FastifyInstance) {
  /**
   * POST /v1/bookings — Create booking inquiry
   */
  app.post('/v1/bookings', {
    preHandler: [
      authMiddleware,
      requirePermission('booking:create'),
      rateLimit('WRITE'),
      validateBody(createBookingSchema),
    ],
  }, async (request, reply) => {
    const booking = await bookingService.createInquiry(request.user!.user_id, request.body as never);

    return reply.status(201).send({
      success: true,
      data: booking,
      errors: [],
    });
  });

  /**
   * GET /v1/bookings — List bookings for current user
   */
  app.get('/v1/bookings', {
    preHandler: [authMiddleware, requirePermission('booking:read_own')],
  }, async (request, reply) => {
    const query = request.query as { status?: string; role?: string };
    const role = query.role === 'artist' ? 'artist' : 'client';
    const bookings = await bookingService.listBookings(request.user!.user_id, role as 'artist' | 'client', {
      status: query.status,
    });

    return reply.send({
      success: true,
      data: bookings,
      errors: [],
    });
  });

  /**
   * GET /v1/bookings/:id — Get booking details
   */
  app.get('/v1/bookings/:id', {
    preHandler: [authMiddleware, requirePermission('booking:read_own')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const booking = await bookingService.getBooking(id, request.user!.user_id);

    return reply.send({
      success: true,
      data: booking,
      errors: [],
    });
  });

  /**
   * POST /v1/bookings/:id/transition — Transition booking state
   */
  app.post('/v1/bookings/:id/transition', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { state, metadata } = request.body as { state: BookingState; metadata?: Record<string, unknown> };

    const booking = await bookingService.transitionState(id, request.user!.user_id, state, metadata);

    return reply.send({
      success: true,
      data: booking,
      errors: [],
    });
  });

  /**
   * POST /v1/bookings/:id/quotes — Submit quote/counter-offer
   */
  app.post('/v1/bookings/:id/quotes', {
    preHandler: [
      authMiddleware,
      rateLimit('WRITE'),
      validateBody(submitQuoteSchema),
    ],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { amount_paise, notes } = request.body as { amount_paise: number; notes?: string };

    const quote = await bookingService.submitQuote(id, request.user!.user_id, amount_paise, notes);

    return reply.status(201).send({
      success: true,
      data: quote,
      errors: [],
    });
  });

  /**
   * GET /v1/bookings/:id/auto-quote — Generate auto-quote
   */
  app.get('/v1/bookings/:id/auto-quote', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const breakdown = await bookingService.generateAutoQuote(id);

    return reply.send({
      success: true,
      data: breakdown,
      errors: [],
    });
  });

  /**
   * GET /v1/bookings/:id/contract — Generate booking contract
   */
  app.get('/v1/bookings/:id/contract', {
    preHandler: [authMiddleware, requirePermission('booking:read_own')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const booking = await bookingService.getBooking(id, request.user!.user_id);

    if (!booking.final_amount_paise) {
      return reply.status(400).send({
        success: false,
        data: null,
        errors: [{ code: 'NO_FINAL_AMOUNT', message: 'Booking must be confirmed with a final amount before generating a contract.' }],
      });
    }

    const contract = generateContract({
      booking_id: booking.id,
      artist_name: booking.artist_name ?? 'Artist',
      client_name: booking.client_name ?? 'Client',
      event_type: booking.event_type,
      event_date: booking.event_date,
      event_city: booking.event_city,
      event_venue: booking.event_venue,
      event_duration_hours: booking.event_duration_hours,
      final_amount_paise: booking.final_amount_paise,
      platform_fee_paise: booking.platform_fee_paise ?? 0,
      artist_payout_paise: booking.artist_payout_paise ?? 0,
      tds_paise: booking.tds_amount_paise ?? 0,
      gst_paise: booking.gst_amount_paise ?? 0,
    });

    return reply.send({
      success: true,
      data: contract,
      errors: [],
    });
  });
}
