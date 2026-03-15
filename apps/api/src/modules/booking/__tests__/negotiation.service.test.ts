import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../infrastructure/database.js', () => {
  const mockDb = vi.fn(() => ({
    where: vi.fn().mockReturnThis(),
    first: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    orderBy: vi.fn().mockReturnThis(),
  }));
  return { db: mockDb };
});

import { db } from '../../../infrastructure/database.js';
import { NegotiationService, NegotiationError } from '../negotiation.service.js';

const mockDb = db as unknown as ReturnType<typeof vi.fn>;

describe('NegotiationService', () => {
  let service: NegotiationService;

  beforeEach(() => {
    service = new NegotiationService();
    vi.clearAllMocks();
  });

  describe('calculateBreakdown', () => {
    it('should calculate correct breakdown for 1,00,000 INR', () => {
      const breakdown = service.calculateBreakdown(10000000); // 1,00,000 INR in paise

      expect(breakdown.base_amount_paise).toBe(10000000);
      expect(breakdown.travel_surcharge_paise).toBe(0);
      expect(breakdown.platform_fee_paise).toBe(1000000); // 10%
      expect(breakdown.gst_on_platform_fee_paise).toBe(180000); // 18% of platform fee
      expect(breakdown.tds_paise).toBe(1000000); // 10% TDS
      expect(breakdown.artist_receives_paise).toBe(9000000); // base - TDS
      expect(breakdown.total_client_pays_paise).toBe(11180000); // base + platform + GST
    });

    it('should include travel surcharge', () => {
      const breakdown = service.calculateBreakdown(5000000, 500000); // 50k + 5k travel

      expect(breakdown.base_amount_paise).toBe(5000000);
      expect(breakdown.travel_surcharge_paise).toBe(500000);
      // Platform fee is on subtotal (55k)
      expect(breakdown.platform_fee_paise).toBe(550000);
    });

    it('should use integer arithmetic (no floating point)', () => {
      const breakdown = service.calculateBreakdown(3333333);

      // All values should be integers
      expect(Number.isInteger(breakdown.platform_fee_paise)).toBe(true);
      expect(Number.isInteger(breakdown.gst_on_platform_fee_paise)).toBe(true);
      expect(Number.isInteger(breakdown.tds_paise)).toBe(true);
      expect(Number.isInteger(breakdown.total_client_pays_paise)).toBe(true);
      expect(Number.isInteger(breakdown.artist_receives_paise)).toBe(true);
    });
  });

  describe('submitQuote', () => {
    it('should reject when max rounds exceeded', async () => {
      // Mock existing 3 quotes
      const mockChain = {
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([
          { round: 1 }, { round: 2 }, { round: 3 },
        ]),
      };
      mockDb.mockReturnValue(mockChain);

      await expect(
        service.submitQuote('booking-1', 'user-1', 10000000),
      ).rejects.toThrow(NegotiationError);
      await expect(
        service.submitQuote('booking-1', 'user-1', 10000000),
      ).rejects.toThrow('Maximum 3 negotiation rounds');
    });

    it('should mark round 3 as final offer', async () => {
      // Mock 2 existing quotes
      const mockChain = {
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([{ round: 1 }, { round: 2 }]),
        insert: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{
          id: 'quote-3',
          round: 3,
          amount_paise: 10000000,
          is_final: true,
          breakdown: '{}',
        }]),
      };
      mockDb.mockReturnValue(mockChain);

      const result = await service.submitQuote('booking-1', 'user-1', 10000000);
      expect(result.is_final).toBe(true);
    });
  });
});
