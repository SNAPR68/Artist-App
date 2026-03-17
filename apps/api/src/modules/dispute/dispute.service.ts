import {
  BookingState,
  DisputeStatus,
  ResolutionType,
  DISPUTE_EVIDENCE_WINDOW_HOURS,
  DISPUTE_APPEAL_WINDOW_DAYS,
  DISPUTE_STATUS_TRANSITIONS,
  BOOKING_STATE_TRANSITIONS,
} from '@artist-booking/shared';
import { disputeRepository } from './dispute.repository.js';
import { bookingRepository } from '../booking/booking.repository.js';
import { paymentService } from '../payment/payment.service.js';
import { db } from '../../infrastructure/database.js';

export class DisputeService {
  async submitDispute(userId: string, data: { booking_id: string; dispute_type: string; description: string }) {
    const booking = await bookingRepository.findByIdWithDetails(data.booking_id);
    if (!booking) {
      throw new DisputeError('NOT_FOUND', 'Booking not found', 404);
    }

    // Verify user is a participant
    if (booking.artist_user_id !== userId && booking.client_user_id !== userId) {
      throw new DisputeError('FORBIDDEN', 'Not a participant in this booking', 403);
    }

    // Verify booking is in a disputable state
    const disputableStates: BookingState[] = [
      BookingState.CONFIRMED, BookingState.PRE_EVENT,
      BookingState.EVENT_DAY, BookingState.COMPLETED,
    ];
    if (!disputableStates.includes(booking.state as BookingState)) {
      throw new DisputeError('INVALID_STATE', `Cannot dispute a booking in ${booking.state} state`, 400);
    }

    // Check no active dispute already exists
    const existing = await disputeRepository.findActiveByBookingId(data.booking_id);
    if (existing) {
      throw new DisputeError('DUPLICATE', 'An active dispute already exists for this booking', 409);
    }

    const evidenceDeadline = new Date();
    evidenceDeadline.setHours(evidenceDeadline.getHours() + DISPUTE_EVIDENCE_WINDOW_HOURS);

    const dispute = await disputeRepository.create({
      booking_id: data.booking_id,
      dispute_type: data.dispute_type,
      initiated_by: userId,
      description: data.description,
      evidence_deadline: evidenceDeadline,
    });

    // Transition booking to DISPUTED
    const currentState = booking.state as BookingState;
    await bookingRepository.updateStatus(data.booking_id, BookingState.DISPUTED);
    await bookingRepository.addEvent(data.booking_id, {
      from_state: currentState,
      to_state: BookingState.DISPUTED,
      triggered_by: userId,
      metadata: { dispute_id: dispute.id, dispute_type: data.dispute_type },
    });

    // Notify both parties
    await this.notifyParties(booking, 'dispute_submitted', {
      dispute_id: dispute.id,
      dispute_type: data.dispute_type,
      evidence_deadline: evidenceDeadline.toISOString(),
    });

    return dispute;
  }

  async addEvidence(disputeId: string, userId: string, data: { evidence_type: string; file_url: string; description?: string }) {
    const dispute = await disputeRepository.findById(disputeId);
    if (!dispute) {
      throw new DisputeError('NOT_FOUND', 'Dispute not found', 404);
    }

    // Verify user is a participant
    if (dispute.artist_user_id !== userId && dispute.client_user_id !== userId) {
      throw new DisputeError('FORBIDDEN', 'Not a participant in this dispute', 403);
    }

    // Verify dispute accepts evidence
    if (dispute.status !== DisputeStatus.SUBMITTED && dispute.status !== DisputeStatus.EVIDENCE_COLLECTION) {
      throw new DisputeError('INVALID_STATE', 'Evidence can no longer be submitted', 400);
    }

    // Verify deadline not passed
    if (dispute.evidence_deadline && new Date(dispute.evidence_deadline) < new Date()) {
      throw new DisputeError('DEADLINE_PASSED', 'Evidence submission deadline has passed', 400);
    }

    const evidence = await disputeRepository.addEvidence({
      dispute_id: disputeId,
      submitted_by: userId,
      evidence_type: data.evidence_type,
      file_url: data.file_url,
      description: data.description,
    });

    // Transition from SUBMITTED to EVIDENCE_COLLECTION if first evidence
    if (dispute.status === DisputeStatus.SUBMITTED) {
      await disputeRepository.updateStatus(disputeId, DisputeStatus.EVIDENCE_COLLECTION);
    }

    return evidence;
  }

  async updateStatus(disputeId: string, adminUserId: string, newStatus: DisputeStatus) {
    const dispute = await disputeRepository.findById(disputeId);
    if (!dispute) {
      throw new DisputeError('NOT_FOUND', 'Dispute not found', 404);
    }

    const currentStatus = dispute.status as DisputeStatus;
    const allowed = DISPUTE_STATUS_TRANSITIONS[currentStatus];
    if (!allowed.includes(newStatus)) {
      throw new DisputeError('INVALID_TRANSITION', `Cannot transition from ${currentStatus} to ${newStatus}`, 400);
    }

    return disputeRepository.updateStatus(disputeId, newStatus);
  }

  async resolveDispute(disputeId: string, adminUserId: string, resolution: {
    resolution_type: string;
    resolution_notes: string;
    financial_resolution?: { refund_amount_paise?: number; artist_payout_paise?: number; platform_absorbs_paise?: number };
    trust_impact?: { artist_adjustment?: number; client_adjustment?: number };
  }) {
    const dispute = await disputeRepository.findById(disputeId);
    if (!dispute) {
      throw new DisputeError('NOT_FOUND', 'Dispute not found', 404);
    }

    if (dispute.status !== DisputeStatus.UNDER_REVIEW && dispute.status !== DisputeStatus.EVIDENCE_COLLECTION) {
      throw new DisputeError('INVALID_STATE', `Cannot resolve dispute in ${dispute.status} state`, 400);
    }

    // Resolve the dispute
    const resolved = await disputeRepository.resolve(disputeId, {
      resolution_type: resolution.resolution_type,
      resolution_notes: resolution.resolution_notes,
      resolved_by: adminUserId,
      financial_resolution: resolution.financial_resolution,
      trust_impact: resolution.trust_impact,
    });

    // Handle financial resolution
    if (resolution.financial_resolution?.refund_amount_paise && resolution.financial_resolution.refund_amount_paise > 0) {
      try {
        await paymentService.processPartialRefund(
          dispute.booking_id,
          resolution.financial_resolution.refund_amount_paise,
        );
      } catch (err) {
        console.error(`[DISPUTE] Failed to process refund for dispute ${disputeId}:`, err);
      }
    }

    // Handle trust score impact
    if (resolution.trust_impact) {
      if (resolution.trust_impact.artist_adjustment && dispute.artist_id) {
        await db('artist_profiles')
          .where({ id: dispute.artist_id })
          .increment('trust_score', resolution.trust_impact.artist_adjustment);
      }
    }

    // Transition booking based on resolution
    const bookingState = resolution.resolution_type === ResolutionType.FULL_REFUND
      ? BookingState.CANCELLED
      : BookingState.SETTLED;

    await bookingRepository.updateStatus(dispute.booking_id, bookingState);
    await bookingRepository.addEvent(dispute.booking_id, {
      from_state: BookingState.DISPUTED,
      to_state: bookingState,
      triggered_by: `admin:${adminUserId}`,
      metadata: {
        dispute_id: disputeId,
        resolution_type: resolution.resolution_type,
      },
    });

    // Notify both parties
    await this.notifyParties(dispute, 'dispute_resolved', {
      dispute_id: disputeId,
      resolution_type: resolution.resolution_type,
      resolution_notes: resolution.resolution_notes,
    });

    return resolved;
  }

  async appealDispute(disputeId: string, userId: string, reason: string) {
    const dispute = await disputeRepository.findById(disputeId);
    if (!dispute) {
      throw new DisputeError('NOT_FOUND', 'Dispute not found', 404);
    }

    if (dispute.artist_user_id !== userId && dispute.client_user_id !== userId) {
      throw new DisputeError('FORBIDDEN', 'Not a participant in this dispute', 403);
    }

    if (dispute.status !== DisputeStatus.RESOLVED) {
      throw new DisputeError('INVALID_STATE', 'Can only appeal resolved disputes', 400);
    }

    // Check appeal window
    const resolvedAt = new Date(dispute.resolved_at);
    const appealDeadline = new Date(resolvedAt);
    appealDeadline.setDate(appealDeadline.getDate() + DISPUTE_APPEAL_WINDOW_DAYS);
    if (new Date() > appealDeadline) {
      throw new DisputeError('APPEAL_EXPIRED', `Appeal window (${DISPUTE_APPEAL_WINDOW_DAYS} days) has passed`, 400);
    }

    const updated = await disputeRepository.updateStatus(disputeId, DisputeStatus.APPEALED, {
      resolution_notes: db.raw(`resolution_notes || '\n\n--- APPEAL ---\n' || ?`, [reason]),
    });

    await bookingRepository.addEvent(dispute.booking_id, {
      from_state: null,
      to_state: BookingState.DISPUTED,
      triggered_by: userId,
      metadata: { dispute_id: disputeId, action: 'appeal', reason },
    });

    return updated;
  }

  async getDispute(disputeId: string, userId: string) {
    const dispute = await disputeRepository.findById(disputeId);
    if (!dispute) {
      throw new DisputeError('NOT_FOUND', 'Dispute not found', 404);
    }

    // Verify access (participant or admin checked at route level)
    if (dispute.artist_user_id !== userId && dispute.client_user_id !== userId) {
      throw new DisputeError('FORBIDDEN', 'Not a participant in this dispute', 403);
    }

    const evidence = await disputeRepository.getEvidence(disputeId);
    return { ...dispute, evidence };
  }

  async getDisputeAsAdmin(disputeId: string) {
    const dispute = await disputeRepository.findById(disputeId);
    if (!dispute) {
      throw new DisputeError('NOT_FOUND', 'Dispute not found', 404);
    }
    const evidence = await disputeRepository.getEvidence(disputeId);
    return { ...dispute, evidence };
  }

  async listUserDisputes(userId: string, page: number, perPage: number) {
    return disputeRepository.listByUserId(userId, page, perPage);
  }

  async listAllDisputes(page: number, perPage: number, status?: string) {
    if (status) {
      return disputeRepository.listByStatus(status, page, perPage);
    }
    return disputeRepository.listAll(page, perPage);
  }

  async autoCloseEvidenceWindows(): Promise<number> {
    const expired = await disputeRepository.findExpiredEvidenceWindows();
    let count = 0;
    for (const dispute of expired) {
      try {
        await disputeRepository.updateStatus(dispute.id, DisputeStatus.UNDER_REVIEW);
        count++;
      } catch (err) {
        console.error(`[CRON] Failed to auto-close evidence window for dispute ${dispute.id}:`, err);
      }
    }
    return count;
  }

  private async notifyParties(
    booking: Record<string, unknown>,
    eventType: string,
    metadata: Record<string, unknown>,
  ) {
    const notifications = [];
    if (booking.artist_user_id) {
      notifications.push({
        user_id: booking.artist_user_id,
        channel: 'email',
        event_type: eventType,
        title: eventType === 'dispute_submitted' ? 'Dispute Filed' : 'Dispute Resolved',
        body: JSON.stringify(metadata),
        metadata: JSON.stringify(metadata),
      });
    }
    if (booking.client_user_id) {
      notifications.push({
        user_id: booking.client_user_id,
        channel: 'email',
        event_type: eventType,
        title: eventType === 'dispute_submitted' ? 'Dispute Filed' : 'Dispute Resolved',
        body: JSON.stringify(metadata),
        metadata: JSON.stringify(metadata),
      });
    }
    if (notifications.length > 0) {
      await db('notifications').insert(notifications).catch((err: unknown) => {
        console.error('[DISPUTE] Failed to create notifications:', err);
      });
    }
  }
}

export class DisputeError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'DisputeError';
  }
}

export const disputeService = new DisputeService();
