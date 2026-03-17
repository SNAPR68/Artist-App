import { failureRepository } from './failure.repository.js';

export class FailureService {
  async recordEmptySearch(userId: string | null, sessionId: string | null, searchParams: Record<string, unknown>) {
    return failureRepository.record({
      event_type: 'empty_search',
      user_id: userId ?? undefined,
      session_id: sessionId ?? undefined,
      search_params: searchParams,
    });
  }

  async recordRejectedQuote(bookingId: string, userId: string, reason?: string) {
    return failureRepository.record({
      event_type: 'rejected_quote',
      user_id: userId,
      booking_id: bookingId,
      reason,
    });
  }

  async recordAbandonedFlow(userId: string | null, sessionId: string | null, stage: string, metadata?: Record<string, unknown>) {
    return failureRepository.record({
      event_type: 'abandoned_flow',
      user_id: userId ?? undefined,
      session_id: sessionId ?? undefined,
      stage,
      metadata,
    });
  }

  async recordBookingDropoff(bookingId: string, stage: string) {
    return failureRepository.record({
      event_type: 'booking_dropoff',
      booking_id: bookingId,
      stage,
    });
  }

  async getSupplyGapReport(startDate: string, endDate: string) {
    return failureRepository.getSupplyGaps(startDate, endDate);
  }

  async getConversionFunnel(startDate: string, endDate: string) {
    return failureRepository.getDropoffFunnel(startDate, endDate);
  }
}

export const failureService = new FailureService();
