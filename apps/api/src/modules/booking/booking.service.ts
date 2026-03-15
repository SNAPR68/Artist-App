import { BookingState, HOLD_EXPIRY_HOURS } from '@artist-booking/shared';
import { bookingRepository } from './booking.repository.js';
import type { CreateBookingData } from './booking.repository.js';
import { BookingStateMachine } from './state-machine.js';
import { negotiationService } from './negotiation.service.js';
import { calendarRepository } from '../calendar/calendar.repository.js';
import { artistRepository } from '../artist/artist.repository.js';
import { clientRepository } from '../client/client.repository.js';

export class BookingService {
  /**
   * Create a new booking inquiry.
   */
  async createInquiry(userId: string, data: Omit<CreateBookingData, 'client_id'>) {
    // Get client profile
    const client = await clientRepository.findByUserId(userId);
    if (!client) {
      throw new BookingError('CLIENT_NOT_FOUND', 'Client profile not found. Create a profile first.', 404);
    }

    // Verify artist exists
    const artist = await artistRepository.findById(data.artist_id);
    if (!artist) {
      throw new BookingError('ARTIST_NOT_FOUND', 'Artist not found', 404);
    }

    // Check date availability
    const dateStatus = await calendarRepository.getDateStatus(data.artist_id, data.event_date);
    if (dateStatus && dateStatus.status === 'booked') {
      throw new BookingError('DATE_UNAVAILABLE', 'Artist is not available on this date', 409);
    }

    // Create booking
    const booking = await bookingRepository.create({
      ...data,
      client_id: client.id,
    });

    // Place hold on the date (48 hours)
    const holdExpiry = new Date();
    holdExpiry.setHours(holdExpiry.getHours() + HOLD_EXPIRY_HOURS);
    await calendarRepository.setHold(data.artist_id, data.event_date, booking.id, holdExpiry);

    // Log event
    await bookingRepository.addEvent(booking.id, {
      from_status: 'none',
      to_status: BookingState.INQUIRY,
      triggered_by: userId,
      metadata: { event_type: data.event_type, event_date: data.event_date },
    });

    return booking;
  }

  /**
   * Transition a booking to a new state.
   */
  async transitionState(bookingId: string, userId: string, newState: BookingState, metadata?: Record<string, unknown>) {
    const booking = await bookingRepository.findByIdWithDetails(bookingId);
    if (!booking) {
      throw new BookingError('NOT_FOUND', 'Booking not found', 404);
    }

    // Verify user is participant
    if (booking.artist_user_id !== userId && booking.client_user_id !== userId) {
      throw new BookingError('FORBIDDEN', 'Not a participant in this booking', 403);
    }

    const currentState = booking.status as BookingState;
    BookingStateMachine.transition(currentState, newState);

    // Handle state-specific side effects
    if (newState === BookingState.CONFIRMED) {
      await this.onConfirmed(booking);
    } else if (newState === BookingState.CANCELLED) {
      await this.onCancelled(booking);
    }

    const updated = await bookingRepository.updateStatus(bookingId, newState);

    await bookingRepository.addEvent(bookingId, {
      from_status: currentState,
      to_status: newState,
      triggered_by: userId,
      metadata,
    });

    return updated;
  }

  /**
   * Get booking by ID with full details.
   */
  async getBooking(bookingId: string, userId: string) {
    const booking = await bookingRepository.findByIdWithDetails(bookingId);
    if (!booking) {
      throw new BookingError('NOT_FOUND', 'Booking not found', 404);
    }

    if (booking.artist_user_id !== userId && booking.client_user_id !== userId) {
      throw new BookingError('FORBIDDEN', 'Not a participant in this booking', 403);
    }

    const quotes = await negotiationService.getQuoteHistory(bookingId);
    const events = await bookingRepository.getEvents(bookingId);

    return { ...booking, quotes, events };
  }

  /**
   * List bookings for the current user (artist or client).
   */
  async listBookings(userId: string, role: 'artist' | 'client', filters?: { status?: string }) {
    if (role === 'artist') {
      return bookingRepository.listByArtistUserId(userId, filters);
    }
    return bookingRepository.listByClientUserId(userId, filters);
  }

  /**
   * Submit a quote or counter-offer.
   */
  async submitQuote(bookingId: string, userId: string, amountPaise: number, notes?: string) {
    const booking = await bookingRepository.findByIdWithDetails(bookingId);
    if (!booking) {
      throw new BookingError('NOT_FOUND', 'Booking not found', 404);
    }

    if (booking.artist_user_id !== userId && booking.client_user_id !== userId) {
      throw new BookingError('FORBIDDEN', 'Not a participant in this booking', 403);
    }

    const currentState = booking.status as BookingState;
    if (currentState !== BookingState.INQUIRY &&
        currentState !== BookingState.QUOTED &&
        currentState !== BookingState.NEGOTIATING) {
      throw new BookingError('INVALID_STATE', `Cannot submit quotes in ${currentState} state`, 400);
    }

    const quote = await negotiationService.submitQuote(bookingId, userId, amountPaise, notes);

    // Auto-transition to quoted/negotiating
    if (currentState === BookingState.INQUIRY) {
      await bookingRepository.updateStatus(bookingId, BookingState.QUOTED);
      await bookingRepository.addEvent(bookingId, {
        from_status: currentState,
        to_status: BookingState.QUOTED,
        triggered_by: userId,
        metadata: { quote_round: quote.round },
      });
    } else if (currentState === BookingState.QUOTED && quote.round > 1) {
      await bookingRepository.updateStatus(bookingId, BookingState.NEGOTIATING);
      await bookingRepository.addEvent(bookingId, {
        from_status: currentState,
        to_status: BookingState.NEGOTIATING,
        triggered_by: userId,
        metadata: { quote_round: quote.round },
      });
    }

    // Update booking amounts
    await bookingRepository.updateAmounts(bookingId, {
      quoted_amount_paise: amountPaise,
      platform_fee_paise: quote.breakdown.platform_fee_paise,
      tds_amount_paise: quote.breakdown.tds_paise,
      gst_amount_paise: quote.breakdown.gst_on_platform_fee_paise,
    });

    return quote;
  }

  /**
   * Generate an auto-quote based on artist pricing.
   */
  async generateAutoQuote(bookingId: string) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new BookingError('NOT_FOUND', 'Booking not found', 404);
    }

    return negotiationService.generateAutoQuote(
      booking.artist_id,
      booking.event_type,
      'tier_1', // Default, could be derived from event_city
    );
  }

  // ─── Side Effects ────────────────────────────────────────────

  private async onConfirmed(booking: Record<string, unknown>) {
    // Convert hold to confirmed booking on calendar
    await calendarRepository.confirmBooking(
      booking.artist_id as string,
      booking.event_date as string,
      booking.id as string,
    );

    // Set final amounts from latest quote
    const latestQuote = await negotiationService.getLatestQuote(booking.id as string);
    if (latestQuote) {
      await bookingRepository.updateAmounts(booking.id as string, {
        final_amount_paise: latestQuote.amount_paise,
        platform_fee_paise: latestQuote.breakdown.platform_fee_paise,
        artist_payout_paise: latestQuote.breakdown.artist_receives_paise,
        tds_amount_paise: latestQuote.breakdown.tds_paise,
        gst_amount_paise: latestQuote.breakdown.gst_on_platform_fee_paise,
      });
    }
  }

  private async onCancelled(booking: Record<string, unknown>) {
    // Release the calendar date
    await calendarRepository.releaseDate(
      booking.artist_id as string,
      booking.event_date as string,
    );
  }
}

export class BookingError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'BookingError';
  }
}

export const bookingService = new BookingService();
