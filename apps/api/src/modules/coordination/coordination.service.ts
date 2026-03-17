import { coordinationRepository } from './coordination.repository.js';
import { bookingRepository } from '../booking/booking.repository.js';
import {
  COORDINATION_CHECKPOINTS,
  COORDINATION_ESCALATION_THRESHOLDS,
} from '@artist-booking/shared';

class CoordinationError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'CoordinationError';
  }
}

export class CoordinationService {
  async initializeChecklist(bookingId: string) {
    const existing = await coordinationRepository.findByBookingId(bookingId);
    if (existing) return existing;
    return coordinationRepository.create(bookingId);
  }

  async getChecklist(bookingId: string, userId: string) {
    const booking = await bookingRepository.findByIdWithDetails(bookingId);
    if (!booking) {
      throw new CoordinationError('NOT_FOUND', 'Booking not found', 404);
    }

    if (booking.artist_user_id !== userId && booking.client_user_id !== userId) {
      throw new CoordinationError('FORBIDDEN', 'Not a participant', 403);
    }

    const checklist = await coordinationRepository.findByBookingId(bookingId);
    if (!checklist) {
      throw new CoordinationError('NOT_FOUND', 'Coordination checklist not found', 404);
    }

    // Compute deadlines from event_date
    const eventDate = new Date(booking.event_date as string);
    const deadlines = {
      rider_confirm_by: new Date(eventDate.getTime() - COORDINATION_CHECKPOINTS.RIDER_CONFIRM_DAYS_BEFORE * 86400000).toISOString(),
      logistics_confirm_by: new Date(eventDate.getTime() - COORDINATION_CHECKPOINTS.LOGISTICS_CONFIRM_DAYS_BEFORE * 86400000).toISOString(),
      final_confirm_by: new Date(eventDate.getTime() - COORDINATION_CHECKPOINTS.FINAL_CONFIRM_DAYS_BEFORE * 86400000).toISOString(),
      briefing_by: new Date(eventDate.getTime() - COORDINATION_CHECKPOINTS.BRIEFING_DAYS_BEFORE * 86400000).toISOString(),
    };

    return { ...checklist, deadlines, event_date: booking.event_date };
  }

  async confirmCheckpoint(bookingId: string, userId: string, checkpoint: string) {
    const booking = await bookingRepository.findByIdWithDetails(bookingId);
    if (!booking) {
      throw new CoordinationError('NOT_FOUND', 'Booking not found', 404);
    }

    const isSystem = userId.startsWith('system:');
    if (!isSystem && booking.artist_user_id !== userId && booking.client_user_id !== userId) {
      throw new CoordinationError('FORBIDDEN', 'Not a participant', 403);
    }

    const validCheckpoints = ['rider_confirmed', 'logistics_confirmed', 'final_confirmed', 'briefing_sent'];
    if (!validCheckpoints.includes(checkpoint)) {
      throw new CoordinationError('INVALID_CHECKPOINT', `Invalid checkpoint: ${checkpoint}`, 400);
    }

    const updated = await coordinationRepository.updateCheckpoint(bookingId, checkpoint, true);

    await bookingRepository.addEvent(bookingId, {
      from_state: booking.state as string,
      to_state: booking.state as string,
      triggered_by: userId,
      metadata: { action: 'checkpoint_confirmed', checkpoint },
    });

    return updated;
  }

  async updateLogistics(bookingId: string, userId: string, data: {
    travel_mode?: string;
    hotel_booked?: boolean;
    hotel_details?: Record<string, unknown>;
    parking_arranged?: boolean;
    special_rider_notes?: string;
  }) {
    const booking = await bookingRepository.findByIdWithDetails(bookingId);
    if (!booking) {
      throw new CoordinationError('NOT_FOUND', 'Booking not found', 404);
    }

    if (booking.artist_user_id !== userId && booking.client_user_id !== userId) {
      throw new CoordinationError('FORBIDDEN', 'Not a participant', 403);
    }

    return coordinationRepository.updateLogistics(bookingId, data);
  }

  async checkEscalations(): Promise<number> {
    const now = new Date();
    let escalatedCount = 0;

    // Check rider (T-5 threshold)
    const riderCutoff = new Date(now.getTime() + COORDINATION_ESCALATION_THRESHOLDS.RIDER_ESCALATE_DAYS_BEFORE * 86400000);
    const overdueRider = await coordinationRepository.findOverdueCheckpoints('rider_confirmed', riderCutoff);
    for (const item of overdueRider) {
      if (item.escalation_level < 1) {
        await coordinationRepository.setEscalationLevel(item.booking_id, 1);
        escalatedCount++;
      }
    }

    // Check logistics (T-4 threshold)
    const logisticsCutoff = new Date(now.getTime() + COORDINATION_ESCALATION_THRESHOLDS.LOGISTICS_ESCALATE_DAYS_BEFORE * 86400000);
    const overdueLogistics = await coordinationRepository.findOverdueCheckpoints('logistics_confirmed', logisticsCutoff);
    for (const item of overdueLogistics) {
      if (item.escalation_level < 1) {
        await coordinationRepository.setEscalationLevel(item.booking_id, 1);
        escalatedCount++;
      }
    }

    // Check final confirmation (T-2 threshold — critical)
    const finalCutoff = new Date(now.getTime() + COORDINATION_ESCALATION_THRESHOLDS.FINAL_ESCALATE_DAYS_BEFORE * 86400000);
    const overdueFinal = await coordinationRepository.findOverdueCheckpoints('final_confirmed', finalCutoff);
    for (const item of overdueFinal) {
      if (item.escalation_level < 2) {
        await coordinationRepository.setEscalationLevel(item.booking_id, 2);
        escalatedCount++;
      }
    }

    return escalatedCount;
  }
}

export const coordinationService = new CoordinationService();
