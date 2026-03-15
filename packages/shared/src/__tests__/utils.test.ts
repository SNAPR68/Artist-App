import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  toPaise,
  toINR,
  calculateTDS,
  calculateGST,
  calculatePlatformFee,
  calculateRefund,
  calculatePaymentSplit,
  generateOTP,
} from '../utils/index';

describe('Currency utils', () => {
  it('formatCurrency: converts paise to INR display string', () => {
    expect(formatCurrency(1500000)).toBe('₹15,000.00');
    expect(formatCurrency(100)).toBe('₹1.00');
    expect(formatCurrency(0)).toBe('₹0.00');
    expect(formatCurrency(99999999)).toBe('₹9,99,999.99');
  });

  it('toPaise: converts INR to paise', () => {
    expect(toPaise(15000)).toBe(1500000);
    expect(toPaise(0.01)).toBe(1);
    expect(toPaise(0)).toBe(0);
  });

  it('toINR: converts paise to INR', () => {
    expect(toINR(1500000)).toBe(15000);
    expect(toINR(1)).toBe(0.01);
  });
});

describe('Financial calculations', () => {
  it('calculateTDS: 10% of artist share', () => {
    expect(calculateTDS(1000000)).toBe(100000); // 10K out of 1L
    expect(calculateTDS(0)).toBe(0);
    expect(calculateTDS(333)).toBe(33); // rounds correctly
  });

  it('calculateGST: 18% of platform fee', () => {
    expect(calculateGST(100000)).toBe(18000);
    expect(calculateGST(0)).toBe(0);
    expect(calculateGST(111)).toBe(20); // rounds
  });

  it('calculatePlatformFee: 10% default rate', () => {
    expect(calculatePlatformFee(1000000)).toBe(100000);
    expect(calculatePlatformFee(1000000, 0.15)).toBe(150000); // custom 15%
  });
});

describe('Cancellation refund calculation', () => {
  it('100% refund for > 30 days before', () => {
    const result = calculateRefund(1000000, 45);
    expect(result.refundPercent).toBe(100);
    expect(result.refundAmount).toBe(1000000);
    expect(result.artistAmount).toBe(0);
  });

  it('75% refund for 15-30 days before', () => {
    const result = calculateRefund(1000000, 20);
    expect(result.refundPercent).toBe(75);
    expect(result.refundAmount).toBe(750000);
    expect(result.artistAmount).toBe(250000);
  });

  it('50% refund for 7-14 days before', () => {
    const result = calculateRefund(1000000, 10);
    expect(result.refundPercent).toBe(50);
    expect(result.refundAmount).toBe(500000);
    expect(result.artistAmount).toBe(500000);
  });

  it('0% refund for < 7 days before', () => {
    const result = calculateRefund(1000000, 3);
    expect(result.refundPercent).toBe(0);
    expect(result.refundAmount).toBe(0);
    expect(result.artistAmount).toBe(1000000);
  });

  it('handles exact boundary: 30 days', () => {
    const result = calculateRefund(1000000, 30);
    expect(result.refundPercent).toBe(100);
  });

  it('handles exact boundary: 15 days', () => {
    const result = calculateRefund(1000000, 15);
    expect(result.refundPercent).toBe(75);
  });

  it('handles exact boundary: 7 days', () => {
    const result = calculateRefund(1000000, 7);
    expect(result.refundPercent).toBe(50);
  });

  it('handles 0 days', () => {
    const result = calculateRefund(1000000, 0);
    expect(result.refundPercent).toBe(0);
  });
});

describe('Payment split calculator', () => {
  it('standard split without agent', () => {
    const result = calculatePaymentSplit({
      totalAmount: 10000000, // 1 lakh INR in paise
    });

    expect(result.platformFee).toBe(1000000); // 10%
    expect(result.artistShare).toBe(9000000); // 90%
    expect(result.agentCommission).toBe(0);
    expect(result.tdsAmount).toBe(900000); // 10% of artist share
    expect(result.gstOnPlatformFee).toBe(180000); // 18% of platform fee
    expect(result.artistNetPayout).toBe(8100000); // artist share - TDS
  });

  it('split with agent commission', () => {
    const result = calculatePaymentSplit({
      totalAmount: 10000000,
      agentCommissionRate: 0.10, // 10% of artist gross
    });

    expect(result.platformFee).toBe(1000000);
    const artistGross = 9000000;
    expect(result.agentCommission).toBe(900000); // 10% of 9L
    expect(result.artistShare).toBe(artistGross - 900000); // 81L
    expect(result.tdsAmount).toBe(Math.round(result.artistShare * 0.10));
    expect(result.artistNetPayout).toBe(result.artistShare - result.tdsAmount);
  });

  it('split with custom platform fee rate', () => {
    const result = calculatePaymentSplit({
      totalAmount: 10000000,
      platformFeeRate: 0.15, // 15%
    });

    expect(result.platformFee).toBe(1500000);
    expect(result.artistShare).toBe(8500000);
  });

  it('handles small amounts with correct rounding', () => {
    const result = calculatePaymentSplit({
      totalAmount: 333, // very small
    });

    expect(result.platformFee).toBe(33);
    expect(result.artistShare).toBe(300);
    expect(result.tdsAmount).toBe(30);
    expect(result.artistNetPayout).toBe(270);
    // Verify no paise are lost
    expect(result.platformFee + result.artistShare + result.agentCommission).toBe(333);
  });

  it('handles zero amount', () => {
    const result = calculatePaymentSplit({ totalAmount: 0 });
    expect(result.platformFee).toBe(0);
    expect(result.artistShare).toBe(0);
    expect(result.tdsAmount).toBe(0);
    expect(result.artistNetPayout).toBe(0);
  });
});

describe('OTP generation', () => {
  it('generates 6-digit numeric string', () => {
    const otp = generateOTP();
    expect(otp).toMatch(/^\d{6}$/);
    expect(parseInt(otp)).toBeGreaterThanOrEqual(100000);
    expect(parseInt(otp)).toBeLessThanOrEqual(999999);
  });

  it('generates different OTPs', () => {
    const otps = new Set(Array.from({ length: 100 }, () => generateOTP()));
    expect(otps.size).toBeGreaterThan(90); // Should be mostly unique
  });
});
