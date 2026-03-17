import { eventContextRepository } from './event-context.repository.js';
import { bookingRepository } from '../booking/booking.repository.js';
import { BookingState } from '@artist-booking/shared';

class EventContextError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'EventContextError';
  }
}

export class EventContextService {
  async submitEventContext(bookingId: string, userId: string, data: {
    crowd_size_estimate: number;
    crowd_energy: string;
    primary_age_group: string;
    secondary_age_group?: string;
    gender_ratio_male_pct: number;
    vibe_tags: string[];
    genre_reception: Record<string, number>;
    set_highlights?: string;
    would_rebook_artist: boolean;
    venue_acoustics_rating?: number;
    venue_crowd_flow_rating?: number;
    audience_requests: string[];
    weather_conditions?: string;
  }) {
    // Verify booking exists and user is a participant
    const booking = await bookingRepository.findByIdWithDetails(bookingId);
    if (!booking) {
      throw new EventContextError('NOT_FOUND', 'Booking not found', 404);
    }

    if (booking.artist_user_id !== userId && booking.client_user_id !== userId) {
      throw new EventContextError('FORBIDDEN', 'Not a participant in this booking', 403);
    }

    // Only allow for completed/settled bookings
    const allowedStates = [BookingState.COMPLETED, BookingState.SETTLED];
    if (!allowedStates.includes(booking.state as BookingState)) {
      throw new EventContextError(
        'INVALID_STATE',
        'Event context can only be submitted for completed or settled bookings',
        400,
      );
    }

    // Check if already submitted
    const existing = await eventContextRepository.findByBookingId(bookingId);
    if (existing) {
      throw new EventContextError('ALREADY_EXISTS', 'Event context already submitted for this booking', 409);
    }

    return eventContextRepository.create({
      booking_id: bookingId,
      submitted_by: userId,
      ...data,
    });
  }

  async getEventContext(bookingId: string, userId: string) {
    const booking = await bookingRepository.findByIdWithDetails(bookingId);
    if (!booking) {
      throw new EventContextError('NOT_FOUND', 'Booking not found', 404);
    }

    if (booking.artist_user_id !== userId && booking.client_user_id !== userId) {
      throw new EventContextError('FORBIDDEN', 'Not a participant in this booking', 403);
    }

    const context = await eventContextRepository.findByBookingId(bookingId);
    if (!context) {
      throw new EventContextError('NOT_FOUND', 'Event context not found for this booking', 404);
    }

    return context;
  }

  async getAggregatedStats(filters: { city?: string; genre?: string; event_type?: string }) {
    return eventContextRepository.getAggregatedStats(filters);
  }
}

export const eventContextService = new EventContextService();
