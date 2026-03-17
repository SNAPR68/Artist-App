import { PayoutStatus, PAYOUT_MAX_RETRY_COUNT } from '@artist-booking/shared';
import { payoutRepository } from './payout.repository.js';
import { paymentRepository } from './payment.repository.js';
import { bookingRepository } from '../booking/booking.repository.js';
import { bankAccountRepository } from '../artist/bank-account.repository.js';
import { db } from '../../infrastructure/database.js';

class PayoutError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'PayoutError';
  }
}

export class PayoutService {
  async createPayout(settlementId: string) {
    // Get settlement record
    const settlement = await db('payment_settlements').where({ id: settlementId }).first();
    if (!settlement) {
      throw new PayoutError('NOT_FOUND', 'Settlement not found', 404);
    }

    // Check if payout already exists
    const existing = await payoutRepository.findBySettlementId(settlementId);
    if (existing) return existing;

    // Get artist_id from the booking chain
    const payment = await paymentRepository.findById(settlement.payment_id);
    if (!payment) {
      throw new PayoutError('NOT_FOUND', 'Payment not found', 404);
    }

    const booking = await bookingRepository.findById(payment.booking_id);
    if (!booking) {
      throw new PayoutError('NOT_FOUND', 'Booking not found', 404);
    }

    // Check if artist has bank account
    const bankAccount = await bankAccountRepository.findPrimaryByArtistId(booking.artist_id);
    if (!bankAccount) {
      console.warn(`[PAYOUT] Artist ${booking.artist_id} has no bank account. Payout created as pending.`);
    }

    return payoutRepository.create({
      settlement_id: settlementId,
      artist_id: booking.artist_id,
      amount_paise: settlement.artist_payout_paise,
    });
  }

  async markAsPaid(payoutId: string, _adminUserId: string, reference: string) {
    const payout = await payoutRepository.findById(payoutId);
    if (!payout) {
      throw new PayoutError('NOT_FOUND', 'Payout not found', 404);
    }

    if (payout.status !== PayoutStatus.PENDING && payout.status !== PayoutStatus.INITIATED) {
      throw new PayoutError('INVALID_STATE', `Cannot mark ${payout.status} payout as paid`, 400);
    }

    return payoutRepository.updateStatus(payoutId, PayoutStatus.COMPLETED, {
      transfer_reference: reference,
    });
  }

  async markAsFailed(payoutId: string, reason: string) {
    const payout = await payoutRepository.findById(payoutId);
    if (!payout) {
      throw new PayoutError('NOT_FOUND', 'Payout not found', 404);
    }

    await payoutRepository.incrementRetry(payoutId);
    return payoutRepository.updateStatus(payoutId, PayoutStatus.FAILED, {
      failed_reason: reason,
    });
  }

  async listPendingPayouts() {
    return payoutRepository.findPending();
  }

  async getArtistPayouts(userId: string, page: number, perPage: number) {
    // Get artist_id from user_id
    const artist = await db('artist_profiles').where({ user_id: userId }).first();
    if (!artist) {
      throw new PayoutError('ARTIST_NOT_FOUND', 'Artist profile not found', 404);
    }

    return payoutRepository.findByArtistId(artist.id, page, perPage);
  }
}

export const payoutService = new PayoutService();
