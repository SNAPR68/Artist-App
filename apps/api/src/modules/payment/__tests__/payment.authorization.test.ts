import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../payment.repository.js', () => ({
  paymentRepository: {
    findById: vi.fn(),
    findByBookingId: vi.fn(),
  },
}));

vi.mock('../../booking/booking.repository.js', () => ({
  bookingRepository: {
    findByIdWithDetails: vi.fn(),
  },
}));

vi.mock('../../document/invoice.generator.js', () => ({
  generateInvoice: vi.fn(() => ({})),
  formatInvoiceDocument: vi.fn(() => ({ invoice_number: 'INV-001' })),
}));

import { paymentRepository } from '../payment.repository.js';
import { bookingRepository } from '../../booking/booking.repository.js';
import { PaymentService, PaymentError } from '../payment.service.js';

const mockPaymentRepo = paymentRepository as unknown as Record<string, ReturnType<typeof vi.fn>>;
const mockBookingRepo = bookingRepository as unknown as Record<string, ReturnType<typeof vi.fn>>;

describe('Payment Authorization', () => {
  let service: PaymentService;

  const mockBooking = {
    id: 'booking-1',
    client_user_id: 'client-1',
    artist_user_id: 'artist-1',
    final_amount_paise: 1000000,
  };

  const mockPayment = {
    id: 'payment-1',
    booking_id: 'booking-1',
    amount_paise: 1000000,
    platform_fee_paise: 100000,
    gst_paise: 18000,
  };

  beforeEach(() => {
    service = new PaymentService();
    vi.clearAllMocks();
  });

  describe('getPaymentDetails', () => {
    it('should allow the booking client to access payment details', async () => {
      mockBookingRepo.findByIdWithDetails.mockResolvedValue(mockBooking);
      mockPaymentRepo.findByBookingId.mockResolvedValue(mockPayment);

      const result = await service.getPaymentDetails('booking-1', 'client-1', 'client');
      expect(result).toEqual(mockPayment);
    });

    it('should allow the booking artist to access payment details', async () => {
      mockBookingRepo.findByIdWithDetails.mockResolvedValue(mockBooking);
      mockPaymentRepo.findByBookingId.mockResolvedValue(mockPayment);

      const result = await service.getPaymentDetails('booking-1', 'artist-1', 'artist');
      expect(result).toEqual(mockPayment);
    });

    it('should allow admin to access payment details', async () => {
      mockBookingRepo.findByIdWithDetails.mockResolvedValue(mockBooking);
      mockPaymentRepo.findByBookingId.mockResolvedValue(mockPayment);

      const result = await service.getPaymentDetails('booking-1', 'other-user', 'admin');
      expect(result).toEqual(mockPayment);
    });

    it('should reject non-owner non-admin access with 403', async () => {
      mockBookingRepo.findByIdWithDetails.mockResolvedValue(mockBooking);

      await expect(
        service.getPaymentDetails('booking-1', 'random-user', 'client'),
      ).rejects.toThrow('You do not have access');
    });

    it('should return 404 for non-existent booking', async () => {
      mockBookingRepo.findByIdWithDetails.mockResolvedValue(null);

      await expect(
        service.getPaymentDetails('nonexistent', 'client-1', 'client'),
      ).rejects.toThrow('Booking not found');
    });
  });

  describe('generateInvoice', () => {
    it('should reject non-owner non-admin access to invoice', async () => {
      mockPaymentRepo.findById.mockResolvedValue(mockPayment);
      mockBookingRepo.findByIdWithDetails.mockResolvedValue(mockBooking);

      await expect(
        service.generateInvoice('payment-1', 'random-user', 'client'),
      ).rejects.toThrow('You do not have access');
    });

    it('should allow booking client to generate invoice', async () => {
      mockPaymentRepo.findById.mockResolvedValue(mockPayment);
      mockBookingRepo.findByIdWithDetails.mockResolvedValue(mockBooking);

      // This should not throw
      const result = await service.generateInvoice('payment-1', 'client-1', 'client');
      expect(result).toBeDefined();
    });
  });
});
