import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../payment.repository.js', () => ({
  paymentRepository: {
    findById: vi.fn(),
    updateStatus: vi.fn(),
    recordSettlement: vi.fn(),
    findSettlementEligible: vi.fn(),
  },
}));

vi.mock('../../booking/booking.repository.js', () => ({
  bookingRepository: {
    findById: vi.fn(),
    updateStatus: vi.fn(),
    addEvent: vi.fn(),
  },
}));

vi.mock('../razorpay.client.js', () => ({
  razorpayClient: {},
}));

vi.mock('../split-calculator.js', () => ({
  calculatePaymentSplit: vi.fn(),
  calculateRefund: vi.fn(),
}));

import { paymentRepository } from '../payment.repository.js';
import { bookingRepository } from '../../booking/booking.repository.js';
import { PaymentService, PaymentError } from '../payment.service.js';

const mockPaymentRepo = paymentRepository as unknown as Record<string, ReturnType<typeof vi.fn>>;
const mockBookingRepo = bookingRepository as unknown as Record<string, ReturnType<typeof vi.fn>>;

describe('PaymentService — Settlement', () => {
  let service: PaymentService;

  beforeEach(() => {
    service = new PaymentService();
    vi.clearAllMocks();
  });

  describe('settlePayment', () => {
    it('should settle a payment in escrow', async () => {
      mockPaymentRepo.findById.mockResolvedValue({
        id: 'pay-1',
        status: 'in_escrow',
        booking_id: 'book-1',
        artist_payout_paise: 9000000,
        platform_fee_paise: 1000000,
        tds_paise: 1000000,
      });
      mockPaymentRepo.updateStatus.mockResolvedValue({});
      mockPaymentRepo.recordSettlement.mockResolvedValue({});
      mockBookingRepo.findById.mockResolvedValue({ id: 'book-1', status: 'completed' });
      mockBookingRepo.updateStatus.mockResolvedValue({});
      mockBookingRepo.addEvent.mockResolvedValue({});

      const result = await service.settlePayment('pay-1');
      expect(result.status).toBe('settled');
      expect(result.artist_payout_paise).toBe(9000000);
      expect(mockPaymentRepo.recordSettlement).toHaveBeenCalled();
      expect(mockBookingRepo.updateStatus).toHaveBeenCalledWith('book-1', 'settled');
    });

    it('should reject settlement for non-escrow payment', async () => {
      mockPaymentRepo.findById.mockResolvedValue({ id: 'pay-1', status: 'pending' });

      await expect(service.settlePayment('pay-1')).rejects.toThrow(PaymentError);
      await expect(service.settlePayment('pay-1')).rejects.toThrow('Cannot settle');
    });

    it('should reject settlement for non-existent payment', async () => {
      mockPaymentRepo.findById.mockResolvedValue(null);

      await expect(service.settlePayment('pay-x')).rejects.toThrow('not found');
    });
  });

  describe('autoSettleEligible', () => {
    it('should settle all eligible payments', async () => {
      mockPaymentRepo.findSettlementEligible.mockResolvedValue([
        { id: 'pay-1', status: 'in_escrow', booking_id: 'b1', artist_payout_paise: 100, platform_fee_paise: 10, tds_paise: 10 },
        { id: 'pay-2', status: 'in_escrow', booking_id: 'b2', artist_payout_paise: 200, platform_fee_paise: 20, tds_paise: 20 },
      ]);
      mockPaymentRepo.findById
        .mockResolvedValueOnce({ id: 'pay-1', status: 'in_escrow', booking_id: 'b1', artist_payout_paise: 100, platform_fee_paise: 10, tds_paise: 10 })
        .mockResolvedValueOnce({ id: 'pay-2', status: 'in_escrow', booking_id: 'b2', artist_payout_paise: 200, platform_fee_paise: 20, tds_paise: 20 });
      mockPaymentRepo.updateStatus.mockResolvedValue({});
      mockPaymentRepo.recordSettlement.mockResolvedValue({});
      mockBookingRepo.findById.mockResolvedValue({ status: 'completed' });
      mockBookingRepo.updateStatus.mockResolvedValue({});
      mockBookingRepo.addEvent.mockResolvedValue({});

      const count = await service.autoSettleEligible();
      expect(count).toBe(2);
    });

    it('should return 0 when no eligible payments', async () => {
      mockPaymentRepo.findSettlementEligible.mockResolvedValue([]);

      const count = await service.autoSettleEligible();
      expect(count).toBe(0);
    });
  });
});
