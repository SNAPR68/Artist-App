import {
  BookingState,
  CancellationSubType,
  CANCELLATION_TRUST_PENALTY_THRESHOLD_DAYS,
  CANCELLATION_TRUST_PENALTY_POINTS,
} from '@artist-booking/shared';
import { cancellationRepository } from './cancellation.repository.js';
import { bookingRepository } from './booking.repository.js';
import { calendarRepository } from '../calendar/calendar.repository.js';
import { paymentService } from '../payment/payment.service.js';
import { db } from '../../infrastructure/database.js';
import { BookingError } from './booking.service.js';

// Import shared util for refund calculation
import { calculateRefund } from '../payment/split-calculator.js';

export class CancellationService {
  async cancelBooking(
    bookingId: string,
    userId: string,
    subType: CancellationSubType,
    reason: string,
  ) {
    const booking = await bookingRepository.findByIdWithDetails(bookingId);
    if (!booking) {
      throw new BookingError('NOT_FOUND', 'Booking not found', 404);
    }

    // Verify user is participant (or admin via route-level RBAC)
    if (booking.artist_user_id !== userId && booking.client_user_id !== userId) {
      throw new BookingError('FORBIDDEN', 'Not a participant in this booking', 403);
    }

    // Verify cancellable state
    const cancellableStates: BookingState[] = [
      BookingState.INQUIRY, BookingState.SHORTLISTED,
      BookingState.QUOTED, BookingState.NEGOTIATING,
      BookingState.CONFIRMED, BookingState.PRE_EVENT,
    ];
    const currentState = booking.state as BookingState;
    if (!cancellableStates.includes(currentState)) {
      throw new BookingError('INVALID_STATE', `Cannot cancel a booking in ${currentState} state`, 400);
    }

    // Validate sub_type matches the initiator
    if (subType === CancellationSubType.BY_ARTIST && booking.artist_user_id !== userId) {
      throw new BookingError('INVALID_SUBTYPE', 'Only the artist can cancel as BY_ARTIST', 400);
    }
    if (subType === CancellationSubType.BY_CLIENT && booking.client_user_id !== userId) {
      throw new BookingError('INVALID_SUBTYPE', 'Only the client can cancel as BY_CLIENT', 400);
    }

    // Calculate refund (only if payment exists)
    let refundAmountPaise = 0;
    let artistAmountPaise = 0;
    // User is already verified as participant above — determine role for payment access control
    const callerRole = booking.artist_user_id === userId ? 'artist' : 'client';
    const payment = await paymentService.getPaymentDetails(bookingId, userId, callerRole);

    if (payment && (payment.status === 'in_escrow' || payment.status === 'captured')) {
      const refund = calculateRefund({
        totalPaidPaise: payment.amount_paise,
        eventDate: booking.event_date,
        cancelDate: new Date().toISOString(),
      });
      refundAmountPaise = refund.refundAmountPaise;
      artistAmountPaise = Math.round(payment.amount_paise * (refund.artistPercent / 100));
    }

    // Calculate trust impact for artist cancellations
    let trustImpact: Record<string, unknown> | undefined;
    if (subType === CancellationSubType.BY_ARTIST) {
      const eventDate = new Date(booking.event_date);
      const daysBefore = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      if (daysBefore < CANCELLATION_TRUST_PENALTY_THRESHOLD_DAYS) {
        trustImpact = {
          artist_adjustment: CANCELLATION_TRUST_PENALTY_POINTS,
          reason: `Cancelled ${daysBefore} days before event (threshold: ${CANCELLATION_TRUST_PENALTY_THRESHOLD_DAYS} days)`,
        };

        // Apply trust penalty
        await db('artist_profiles')
          .where({ id: booking.artist_id })
          .increment('trust_score', CANCELLATION_TRUST_PENALTY_POINTS);
      }
    }

    // Create cancellation record
    const cancellation = await cancellationRepository.create({
      booking_id: bookingId,
      sub_type: subType,
      initiated_by: userId,
      reason,
      backup_artist_triggered: subType === CancellationSubType.BY_ARTIST,
      refund_amount_paise: refundAmountPaise,
      artist_amount_paise: artistAmountPaise,
      trust_impact: trustImpact,
    });

    // Transition booking to CANCELLED
    await bookingRepository.updateStatus(bookingId, BookingState.CANCELLED);
    await bookingRepository.addEvent(bookingId, {
      from_state: currentState,
      to_state: BookingState.CANCELLED,
      triggered_by: userId,
      metadata: {
        cancellation_id: cancellation.id,
        sub_type: subType,
        refund_amount_paise: refundAmountPaise,
        artist_amount_paise: artistAmountPaise,
      },
    });

    // Release calendar date
    await calendarRepository.releaseDate(booking.artist_id, booking.event_date);

    // Process refund if applicable
    if (payment && refundAmountPaise > 0) {
      try {
        await paymentService.processCancellation(bookingId, userId);
      } catch (err) {
        console.error(`[CANCEL] Failed to process refund for booking ${bookingId}:`, err);
      }
    }

    // Notify both parties
    await this.notifyParties(booking, subType, {
      cancellation_id: cancellation.id,
      sub_type: subType,
      reason,
      refund_amount_paise: refundAmountPaise,
    });

    return {
      cancellation,
      refund: {
        refund_amount_paise: refundAmountPaise,
        artist_amount_paise: artistAmountPaise,
      },
      trust_impact: trustImpact ?? null,
    };
  }

  async getCancellationDetails(bookingId: string) {
    return cancellationRepository.findByBookingId(bookingId);
  }

  private async notifyParties(
    booking: Record<string, unknown>,
    subType: string,
    metadata: Record<string, unknown>,
  ) {
    const notifications = [];
    const title = `Booking Cancelled (${subType.replace('by_', 'by ')})`;

    if (booking.artist_user_id) {
      notifications.push({
        user_id: booking.artist_user_id,
        channel: 'email',
        event_type: 'booking_cancelled',
        title,
        body: JSON.stringify(metadata),
        metadata: JSON.stringify(metadata),
      });
    }
    if (booking.client_user_id) {
      notifications.push({
        user_id: booking.client_user_id,
        channel: 'email',
        event_type: 'booking_cancelled',
        title,
        body: JSON.stringify(metadata),
        metadata: JSON.stringify(metadata),
      });
    }
    if (notifications.length > 0) {
      await db('notifications').insert(notifications).catch((err: unknown) => {
        console.error('[CANCEL] Failed to create notifications:', err);
      });
    }
  }
}

export const cancellationService = new CancellationService();
