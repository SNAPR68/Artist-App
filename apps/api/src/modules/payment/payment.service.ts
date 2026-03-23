import { razorpayClient } from './razorpay.client.js';
import { payoutService } from './payout.service.js';
import { paymentRepository } from './payment.repository.js';
import { bookingRepository } from '../booking/booking.repository.js';
import { bookingService } from '../booking/booking.service.js';
import { calculatePaymentSplit, calculateRefund } from './split-calculator.js';
import { BookingState, PaymentStatus, FINANCIAL } from '@artist-booking/shared';
import { db } from '../../infrastructure/database.js';
export class PaymentService {
  /**
   * Create a Razorpay order for a confirmed booking.
   */
  async createOrder(bookingId: string, userId: string) {
    const booking = await bookingRepository.findByIdWithDetails(bookingId);
    if (!booking) {
      throw new PaymentError('NOT_FOUND', 'Booking not found', 404);
    }

    if (booking.client_user_id !== userId) {
      throw new PaymentError('FORBIDDEN', 'Only the client can initiate payment', 403);
    }

    if (booking.state !== BookingState.CONFIRMED) {
      throw new PaymentError('INVALID_STATE', 'Booking must be confirmed before payment', 400);
    }

    // Idempotency: check if order already exists
    const idempotencyKey = `pay:${bookingId}`;
    const existing = await paymentRepository.findByIdempotencyKey(idempotencyKey);
    if (existing && existing.status === 'pending') {
      return existing;
    }

    const split = calculatePaymentSplit({
      baseAmountPaise: booking.final_amount_paise,
    });

    const order = await razorpayClient.createOrder({
      amount_paise: split.total_client_pays_paise,
      currency: FINANCIAL.CURRENCY,
      receipt: `booking_${bookingId}`,
      notes: { booking_id: bookingId },
    });

    const payment = await paymentRepository.create({
      booking_id: bookingId,
      razorpay_order_id: order.id,
      amount_paise: split.total_client_pays_paise,
      currency: FINANCIAL.CURRENCY,
      platform_fee_paise: split.platform_fee_paise,
      gst_paise: split.gst_on_platform_fee_paise,
      tds_paise: split.tds_paise,
      artist_payout_paise: split.artist_net_paise,
      idempotency_key: idempotencyKey,
    });

    return {
      payment_id: payment.id,
      razorpay_order_id: order.id,
      amount_paise: split.total_client_pays_paise,
      currency: FINANCIAL.CURRENCY,
      key_id: process.env.RAZORPAY_KEY_ID,
    };
  }

  /**
   * Verify payment after Razorpay checkout.
   */
  async verifyPayment(params: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) {
    const isValid = razorpayClient.verifySignature(params);
    if (!isValid) {
      throw new PaymentError('INVALID_SIGNATURE', 'Payment signature verification failed', 400);
    }

    const payment = await paymentRepository.findByOrderId(params.razorpay_order_id);
    if (!payment) {
      throw new PaymentError('NOT_FOUND', 'Payment not found', 404);
    }

    // Update payment: captured → in_escrow (funds held until event completion + 3 days)
    await paymentRepository.updateStatus(payment.id, PaymentStatus.IN_ESCROW, params.razorpay_payment_id);

    // Transition booking to pre_event (triggers onPreEvent side effects)
    const booking = await bookingRepository.findById(payment.booking_id);
    if (booking && booking.state === BookingState.CONFIRMED) {
      await bookingService.transitionState(payment.booking_id, 'system:payment', BookingState.PRE_EVENT, {
        razorpay_payment_id: params.razorpay_payment_id,
      });
    }

    return payment;
  }

  /**
   * Handle Razorpay webhook events.
   */
  async handleWebhook(event: string, payload: Record<string, unknown>) {
    const paymentObj = payload.payment as { entity?: Record<string, unknown> } | undefined;
    switch (event) {
      case 'payment.captured': {
        const entity = paymentObj?.entity as { order_id: string; id: string } | undefined;
        if (entity) {
          const payment = await paymentRepository.findByOrderId(entity.order_id);
          if (payment) {
            await paymentRepository.updateStatus(payment.id, PaymentStatus.CAPTURED, entity.id);
          }
        }
        break;
      }
      case 'payment.failed': {
        const entity = paymentObj?.entity as { order_id: string } | undefined;
        if (entity) {
          const payment = await paymentRepository.findByOrderId(entity.order_id);
          if (payment) {
            await paymentRepository.updateStatus(payment.id, PaymentStatus.FAILED);
          }
        }
        break;
      }
      case 'refund.processed': {
        const refundEntity = (payload.refund as { entity?: Record<string, unknown> })?.entity as
          { payment_id: string; amount: number; id: string } | undefined;
        if (refundEntity) {
          const payment = await paymentRepository.findByRazorpayPaymentId(refundEntity.payment_id);
          if (payment) {
            // Full refund if refund amount equals payment amount, otherwise partial
            const newStatus = refundEntity.amount >= payment.amount_paise
              ? PaymentStatus.REFUNDED
              : PaymentStatus.PARTIALLY_REFUNDED;
            await paymentRepository.updateStatus(payment.id, newStatus);
            console.log(`[WEBHOOK] Refund processed: ${refundEntity.id} → ${newStatus}`);

            // Transition booking to cancelled if full refund
            if (newStatus === PaymentStatus.REFUNDED) {
              const booking = await bookingRepository.findById(payment.booking_id);
              if (booking && booking.state !== BookingState.CANCELLED) {
                await bookingService.transitionState(payment.booking_id, 'system:refund', BookingState.CANCELLED, {
                  refund_id: refundEntity.id,
                  refund_amount_paise: refundEntity.amount,
                });
              }
            }
          }
        }
        break;
      }
      case 'refund.failed': {
        const refundEntity = (payload.refund as { entity?: Record<string, unknown> })?.entity as
          { payment_id: string; id: string } | undefined;
        if (refundEntity) {
          const payment = await paymentRepository.findByRazorpayPaymentId(refundEntity.payment_id);
          if (payment && payment.status === PaymentStatus.REFUND_INITIATED) {
            // Revert to previous captured/in_escrow state
            await paymentRepository.updateStatus(payment.id, PaymentStatus.CAPTURED);
            console.error(`[WEBHOOK] Refund failed: ${refundEntity.id} for payment ${payment.id}`);
          }
        }
        break;
      }
    }
  }

  /**
   * Process cancellation and refund.
   */
  async processCancellation(bookingId: string, _userId: string) {
    const booking = await bookingRepository.findByIdWithDetails(bookingId);
    if (!booking) {
      throw new PaymentError('NOT_FOUND', 'Booking not found', 404);
    }

    const payment = await paymentRepository.findByBookingId(bookingId);
    if (!payment || payment.status !== PaymentStatus.CAPTURED) {
      return { refund_amount_paise: 0, refund_percent: 0 };
    }

    const refund = calculateRefund({
      totalPaidPaise: payment.amount_paise,
      eventDate: booking.event_date,
      cancelDate: new Date().toISOString(),
    });

    if (refund.refundAmountPaise > 0) {
      await razorpayClient.initiateRefund(payment.razorpay_payment_id, refund.refundAmountPaise, {
        booking_id: bookingId,
        reason: 'cancellation',
      });
      await paymentRepository.updateStatus(payment.id, PaymentStatus.REFUND_INITIATED);
    }

    return refund;
  }

  /**
   * Process a partial refund (used by dispute resolution).
   * Uses idempotency key to prevent duplicate refunds.
   */
  async processPartialRefund(bookingId: string, refundAmountPaise: number) {
    const payment = await paymentRepository.findByBookingId(bookingId);
    if (!payment || !payment.razorpay_payment_id) {
      return { refund_amount_paise: 0 };
    }

    if (refundAmountPaise > 0) {
      // Generate idempotency key for this refund
      const idempotencyKey = `refund:${payment.id}:${refundAmountPaise}`;

      // Check if this refund has already been processed
      const existingRefund = await paymentRepository.findByIdempotencyKey(idempotencyKey);
      if (existingRefund) {
        return { refund_amount_paise: refundAmountPaise };
      }

      await razorpayClient.initiateRefund(payment.razorpay_payment_id, refundAmountPaise, {
        booking_id: bookingId,
        reason: 'dispute_resolution',
        idempotency_key: idempotencyKey,
      });
      await paymentRepository.updateStatus(payment.id, PaymentStatus.PARTIALLY_REFUNDED);
    }

    return { refund_amount_paise: refundAmountPaise };
  }

  /**
   * Get payment details for a booking.
   */
  async getPaymentDetails(bookingId: string) {
    return paymentRepository.findByBookingId(bookingId);
  }

  /**
   * Get earnings summary for an artist.
   */
  async getEarningsSummary(userId: string, startDate: string, endDate: string) {
    return paymentRepository.getEarningsSummary(userId, startDate, endDate);
  }

  /**
   * Get payment history for a user.
   */
  async getPaymentHistory(userId: string, role: 'artist' | 'client') {
    return paymentRepository.listByUserId(userId, role);
  }

  /**
   * Generate GST invoice for a payment.
   */
  async generateInvoice(paymentId: string) {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) {
      throw new PaymentError('NOT_FOUND', 'Payment not found', 404);
    }

    const booking = await bookingRepository.findByIdWithDetails(payment.booking_id);

    const { generateInvoice: genInvoice, formatInvoiceDocument } = await import('../document/invoice.generator.js');

    const invoice = genInvoice({
      payment_id: payment.id,
      booking_id: payment.booking_id,
      platform_fee_paise: payment.platform_fee_paise,
      gst_paise: payment.gst_paise,
      recipient_name: booking?.client_name ?? 'Client',
      recipient_gstin: undefined,
      recipient_state: undefined,
      event_description: `Live entertainment booking - ${booking?.event_type ?? 'event'} at ${booking?.event_city ?? 'city'}`,
    });

    return formatInvoiceDocument(invoice);
  }

  /**
   * Settle a payment: release funds from escrow to artist.
   * Called by cron (auto-settle 3 days after event) or admin (manual).
   * Uses database transaction to ensure atomic booking state + payment updates.
   */
  async settlePayment(paymentId: string) {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) {
      throw new PaymentError('NOT_FOUND', 'Payment not found', 404);
    }

    if (payment.status !== PaymentStatus.IN_ESCROW) {
      throw new PaymentError('INVALID_STATE', `Cannot settle payment in ${payment.status} status`, 400);
    }

    // Atomic transaction: update payment + booking state together
    const result = await db.transaction(async (trx) => {
      // Lock the payment row to prevent concurrent settlement attempts
      const lockedPayment = await trx('payments')
        .where({ id: payment.id })
        .forUpdate()
        .first();

      if (!lockedPayment || lockedPayment.status !== PaymentStatus.IN_ESCROW) {
        throw new PaymentError('CONFLICT', 'Payment status changed during settlement', 409);
      }

      // Update payment to settled
      await trx('payments')
        .where({ id: payment.id })
        .update({
          status: PaymentStatus.SETTLED,
          updated_at: new Date(),
        });

      const settlement = await trx('payment_settlements')
        .insert({
          payment_id: payment.id,
          artist_payout_paise: payment.artist_payout_paise,
          platform_fee_paise: payment.platform_fee_paise,
          tds_paise: payment.tds_paise,
          settled_at: new Date(),
        })
        .returning('*')
        .then((rows: any[]) => rows[0]);

      // Get booking and transition to settled if completed
      const booking = await trx('bookings')
        .where({ id: payment.booking_id })
        .first();

      if (booking && booking.state === BookingState.COMPLETED) {
        await trx('bookings')
          .where({ id: payment.booking_id })
          .update({
            state: BookingState.SETTLED,
            updated_at: new Date(),
          });

        await trx('booking_events')
          .insert({
            booking_id: payment.booking_id,
            from_state: BookingState.COMPLETED,
            to_state: BookingState.SETTLED,
            triggered_by: 'system:settlement',
            metadata: JSON.stringify({ payment_id: paymentId, artist_payout_paise: payment.artist_payout_paise }),
            created_at: new Date(),
          });
      }

      return settlement;
    });

    // Auto-create payout transfer record (outside transaction)
    try {
      await payoutService.createPayout(result.id);
    } catch (err) {
      console.error(`[SETTLEMENT] Failed to create payout for settlement ${result.id}:`, err);
    }

    return {
      payment_id: payment.id,
      booking_id: payment.booking_id,
      artist_payout_paise: payment.artist_payout_paise,
      status: PaymentStatus.SETTLED,
    };
  }

  /**
   * Reconcile stale pending payments by checking Razorpay status.
   * Runs every 15 minutes to catch payments where webhook was missed.
   */
  async reconcileStalePending(): Promise<number> {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const stalePayments = await paymentRepository.findStalePending(thirtyMinutesAgo);

    let reconciledCount = 0;
    for (const payment of stalePayments) {
      try {
        if (!payment.razorpay_order_id) continue;

        // Skip mock orders
        if (payment.razorpay_order_id.startsWith('order_mock_')) continue;

        const rzpPayment = await razorpayClient.fetchPayment(payment.razorpay_payment_id || payment.razorpay_order_id);
        const rzpStatus = (rzpPayment as any)?.status;

        if (rzpStatus === 'captured') {
          await paymentRepository.updateStatus(payment.id, PaymentStatus.CAPTURED, (rzpPayment as any).id);
          reconciledCount++;
          console.log(`[RECONCILE] Payment ${payment.id} reconciled as captured`);
        } else if (rzpStatus === 'failed') {
          await paymentRepository.updateStatus(payment.id, PaymentStatus.FAILED);
          reconciledCount++;
          console.log(`[RECONCILE] Payment ${payment.id} reconciled as failed`);
        }
        // If still authorized/created, leave as pending — customer may still complete
      } catch (err) {
        console.error(`[RECONCILE] Failed to reconcile payment ${payment.id}:`, err);
      }
    }

    return reconciledCount;
  }

  /**
   * Auto-settle payments for completed events after 3-day hold.
   * Called by the cron job.
   */
  async autoSettleEligible(): Promise<number> {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    // Find payments in escrow where the booking is completed and event was 3+ days ago
    const eligible = await paymentRepository.findSettlementEligible(threeDaysAgo);

    let settledCount = 0;
    for (const payment of eligible) {
      try {
        await this.settlePayment(payment.id);
        settledCount++;
      } catch (err) {
        console.error(`[SETTLEMENT] Failed to settle payment ${payment.id}:`, err);
      }
    }

    return settledCount;
  }
}

export class PaymentError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

export const paymentService = new PaymentService();
