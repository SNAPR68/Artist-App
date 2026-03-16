import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentService, PaymentError } from '../payment.service.js';
import { BookingState, PaymentStatus } from '@artist-booking/shared';

// ─── Mocks ────────────────────────────────────────────────────
vi.mock('../razorpay.client.js', () => ({
  razorpayClient: {
    createOrder: vi.fn(),
    verifySignature: vi.fn(),
    verifyWebhookSignature: vi.fn(),
    initiateRefund: vi.fn(),
  },
}));

vi.mock('../payment.repository.js', () => ({
  paymentRepository: {
    create: vi.fn(),
    findByIdempotencyKey: vi.fn(),
    findByOrderId: vi.fn(),
    findByBookingId: vi.fn(),
    updateStatus: vi.fn(),
    listByUserId: vi.fn(),
    getEarningsSummary: vi.fn(),
  },
}));

vi.mock('../../booking/booking.repository.js', () => ({
  bookingRepository: {
    findByIdWithDetails: vi.fn(),
    findById: vi.fn(),
    updateStatus: vi.fn(),
    addEvent: vi.fn(),
  },
}));

vi.mock('../split-calculator.js', () => ({
  calculatePaymentSplit: vi.fn(),
  calculateRefund: vi.fn(),
}));

import { razorpayClient } from '../razorpay.client.js';
import { paymentRepository } from '../payment.repository.js';
import { bookingRepository } from '../../booking/booking.repository.js';
import { calculatePaymentSplit, calculateRefund } from '../split-calculator.js';

const mocks = {
  razorpay: vi.mocked(razorpayClient),
  paymentRepo: vi.mocked(paymentRepository),
  bookingRepo: vi.mocked(bookingRepository),
  splitCalc: vi.mocked(calculatePaymentSplit),
  refundCalc: vi.mocked(calculateRefund),
};

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PaymentService();
  });

  // ─── createOrder ────────────────────────────────────────────
  describe('createOrder', () => {
    const bookingId = 'booking-1';
    const userId = 'user-1';
    const mockBooking = {
      id: bookingId,
      client_user_id: userId,
      status: BookingState.CONFIRMED,
      final_amount_paise: 100_000,
    };

    it('creates a Razorpay order and payment record', async () => {
      mocks.bookingRepo.findByIdWithDetails.mockResolvedValue(mockBooking as any);
      mocks.paymentRepo.findByIdempotencyKey.mockResolvedValue(null);
      mocks.splitCalc.mockReturnValue({
        total_client_pays_paise: 111_800,
        base_amount_paise: 100_000,
        platform_fee_paise: 10_000,
        gst_on_platform_fee_paise: 1_800,
        artist_gross_paise: 100_000,
        tds_paise: 10_000,
        artist_net_paise: 90_000,
        agent_commission_paise: 0,
      });
      mocks.razorpay.createOrder.mockResolvedValue({ id: 'order_rz_123' } as any);
      mocks.paymentRepo.create.mockResolvedValue({ id: 'pay-1', razorpay_order_id: 'order_rz_123' } as any);

      const result = await service.createOrder(bookingId, userId);

      expect(result.razorpay_order_id).toBe('order_rz_123');
      expect(result.amount_paise).toBe(111_800);
      expect(mocks.razorpay.createOrder).toHaveBeenCalledOnce();
      expect(mocks.paymentRepo.create).toHaveBeenCalledOnce();
    });

    it('returns existing pending order (idempotency)', async () => {
      mocks.bookingRepo.findByIdWithDetails.mockResolvedValue(mockBooking as any);
      const existingPayment = { id: 'pay-existing', status: 'pending', razorpay_order_id: 'order_existing' };
      mocks.paymentRepo.findByIdempotencyKey.mockResolvedValue(existingPayment as any);

      const result = await service.createOrder(bookingId, userId);

      expect(result).toEqual(existingPayment);
      expect(mocks.razorpay.createOrder).not.toHaveBeenCalled();
    });

    it('throws NOT_FOUND for missing booking', async () => {
      mocks.bookingRepo.findByIdWithDetails.mockResolvedValue(null);

      await expect(service.createOrder(bookingId, userId)).rejects.toThrow(PaymentError);
      await expect(service.createOrder(bookingId, userId)).rejects.toThrow('Booking not found');
    });

    it('throws FORBIDDEN if user is not the client', async () => {
      mocks.bookingRepo.findByIdWithDetails.mockResolvedValue({
        ...mockBooking,
        client_user_id: 'other-user',
      } as any);

      await expect(service.createOrder(bookingId, userId)).rejects.toThrow('Only the client can initiate payment');
    });

    it('throws INVALID_STATE if booking is not confirmed', async () => {
      mocks.bookingRepo.findByIdWithDetails.mockResolvedValue({
        ...mockBooking,
        status: BookingState.INQUIRY,
      } as any);

      await expect(service.createOrder(bookingId, userId)).rejects.toThrow('Booking must be confirmed');
    });
  });

  // ─── verifyPayment ──────────────────────────────────────────
  describe('verifyPayment', () => {
    const verifyParams = {
      razorpay_order_id: 'order_rz_123',
      razorpay_payment_id: 'pay_rz_456',
      razorpay_signature: 'sig_abc',
    };

    it('verifies signature and updates payment + booking status', async () => {
      mocks.razorpay.verifySignature.mockReturnValue(true);
      const mockPayment = { id: 'pay-1', booking_id: 'booking-1' };
      mocks.paymentRepo.findByOrderId.mockResolvedValue(mockPayment as any);
      mocks.paymentRepo.updateStatus.mockResolvedValue(mockPayment as any);
      mocks.bookingRepo.findById.mockResolvedValue({ id: 'booking-1', status: BookingState.CONFIRMED } as any);

      await service.verifyPayment(verifyParams);

      expect(mocks.paymentRepo.updateStatus).toHaveBeenCalledWith(
        'pay-1', PaymentStatus.IN_ESCROW, 'pay_rz_456',
      );
      expect(mocks.bookingRepo.updateStatus).toHaveBeenCalledWith(
        'booking-1', BookingState.PRE_EVENT,
      );
      expect(mocks.bookingRepo.addEvent).toHaveBeenCalledOnce();
    });

    it('throws on invalid signature', async () => {
      mocks.razorpay.verifySignature.mockReturnValue(false);

      await expect(service.verifyPayment(verifyParams)).rejects.toThrow('Payment signature verification failed');
    });

    it('throws NOT_FOUND for unknown order', async () => {
      mocks.razorpay.verifySignature.mockReturnValue(true);
      mocks.paymentRepo.findByOrderId.mockResolvedValue(null);

      await expect(service.verifyPayment(verifyParams)).rejects.toThrow('Payment not found');
    });
  });

  // ─── handleWebhook ──────────────────────────────────────────
  describe('handleWebhook', () => {
    it('handles payment.captured event', async () => {
      const mockPayment = { id: 'pay-1' };
      mocks.paymentRepo.findByOrderId.mockResolvedValue(mockPayment as any);

      await service.handleWebhook('payment.captured', {
        payment: { entity: { order_id: 'order_123', id: 'pay_rz_789' } },
      });

      expect(mocks.paymentRepo.updateStatus).toHaveBeenCalledWith(
        'pay-1', PaymentStatus.CAPTURED, 'pay_rz_789',
      );
    });

    it('handles payment.failed event', async () => {
      const mockPayment = { id: 'pay-1' };
      mocks.paymentRepo.findByOrderId.mockResolvedValue(mockPayment as any);

      await service.handleWebhook('payment.failed', {
        payment: { entity: { order_id: 'order_123' } },
      });

      expect(mocks.paymentRepo.updateStatus).toHaveBeenCalledWith(
        'pay-1', PaymentStatus.FAILED,
      );
    });

    it('ignores unknown events', async () => {
      await service.handleWebhook('order.paid', {});
      expect(mocks.paymentRepo.updateStatus).not.toHaveBeenCalled();
    });
  });

  // ─── processCancellation ────────────────────────────────────
  describe('processCancellation', () => {
    it('initiates refund based on cancellation schedule', async () => {
      mocks.bookingRepo.findByIdWithDetails.mockResolvedValue({ id: 'b1', event_date: '2026-07-01' } as any);
      mocks.paymentRepo.findByBookingId.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.CAPTURED,
        amount_paise: 100_000,
        razorpay_payment_id: 'pay_rz_1',
      } as any);
      mocks.refundCalc.mockReturnValue({
        refundAmountPaise: 75_000,
        refundPercent: 75,
        artistPercent: 25,
      });

      const result = await service.processCancellation('b1', 'user-1') as any;

      expect(result.refundAmountPaise).toBe(75_000);
      expect(mocks.razorpay.initiateRefund).toHaveBeenCalledWith('pay_rz_1', 75_000, {
        booking_id: 'b1',
        reason: 'cancellation',
      });
      expect(mocks.paymentRepo.updateStatus).toHaveBeenCalledWith('pay-1', PaymentStatus.REFUND_INITIATED);
    });

    it('returns zero refund if no captured payment exists', async () => {
      mocks.bookingRepo.findByIdWithDetails.mockResolvedValue({ id: 'b1' } as any);
      mocks.paymentRepo.findByBookingId.mockResolvedValue(null);

      const result = await service.processCancellation('b1', 'user-1') as any;

      expect(result.refund_amount_paise).toBe(0);
      expect(mocks.razorpay.initiateRefund).not.toHaveBeenCalled();
    });

    it('skips refund API call when refund amount is zero', async () => {
      mocks.bookingRepo.findByIdWithDetails.mockResolvedValue({ id: 'b1', event_date: '2026-03-16' } as any);
      mocks.paymentRepo.findByBookingId.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.CAPTURED,
        amount_paise: 100_000,
        razorpay_payment_id: 'pay_rz_1',
      } as any);
      mocks.refundCalc.mockReturnValue({
        refundAmountPaise: 0,
        refundPercent: 0,
        artistPercent: 100,
      });

      await service.processCancellation('b1', 'user-1');

      expect(mocks.razorpay.initiateRefund).not.toHaveBeenCalled();
    });
  });

  // ─── PaymentError ───────────────────────────────────────────
  describe('PaymentError', () => {
    it('has correct properties', () => {
      const error = new PaymentError('TEST_CODE', 'Test message', 422);
      expect(error.code).toBe('TEST_CODE');
      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(422);
      expect(error.name).toBe('PaymentError');
      expect(error).toBeInstanceOf(Error);
    });
  });
});
