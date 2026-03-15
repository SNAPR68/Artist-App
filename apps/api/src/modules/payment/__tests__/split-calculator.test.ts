import { describe, it, expect } from 'vitest';
import { calculatePaymentSplit, calculateRefund } from '../split-calculator.js';

describe('calculatePaymentSplit', () => {
  it('calculates correct split for base amount with no agent', () => {
    const result = calculatePaymentSplit({ baseAmountPaise: 100_000 }); // ₹1,000

    // Platform fee: 10% of 100,000 = 10,000
    expect(result.platform_fee_paise).toBe(10_000);
    // GST on platform fee: 18% of 10,000 = 1,800
    expect(result.gst_on_platform_fee_paise).toBe(1_800);
    // Total client pays: 100,000 + 10,000 + 1,800 = 111,800
    expect(result.total_client_pays_paise).toBe(111_800);
    // No agent commission
    expect(result.agent_commission_paise).toBe(0);
    // Artist gross = base (no agent)
    expect(result.artist_gross_paise).toBe(100_000);
    // TDS: 10% of 100,000 = 10,000
    expect(result.tds_paise).toBe(10_000);
    // Artist net: 100,000 - 10,000 = 90,000
    expect(result.artist_net_paise).toBe(90_000);
    // Base preserved
    expect(result.base_amount_paise).toBe(100_000);
  });

  it('calculates correct split with agent commission', () => {
    const result = calculatePaymentSplit({
      baseAmountPaise: 200_000, // ₹2,000
      agentCommissionRate: 0.10, // 10%
    });

    // Agent commission: 10% of 200,000 = 20,000
    expect(result.agent_commission_paise).toBe(20_000);
    // Artist gross: 200,000 - 20,000 = 180,000
    expect(result.artist_gross_paise).toBe(180_000);
    // TDS: 10% of 180,000 = 18,000
    expect(result.tds_paise).toBe(18_000);
    // Artist net: 180,000 - 18,000 = 162,000
    expect(result.artist_net_paise).toBe(162_000);
    // Platform fee: 10% of 200,000 = 20,000
    expect(result.platform_fee_paise).toBe(20_000);
    // GST: 18% of 20,000 = 3,600
    expect(result.gst_on_platform_fee_paise).toBe(3_600);
    // Total: 200,000 + 20,000 + 3,600 = 223,600
    expect(result.total_client_pays_paise).toBe(223_600);
  });

  it('handles zero base amount', () => {
    const result = calculatePaymentSplit({ baseAmountPaise: 0 });

    expect(result.total_client_pays_paise).toBe(0);
    expect(result.platform_fee_paise).toBe(0);
    expect(result.gst_on_platform_fee_paise).toBe(0);
    expect(result.artist_gross_paise).toBe(0);
    expect(result.tds_paise).toBe(0);
    expect(result.artist_net_paise).toBe(0);
    expect(result.agent_commission_paise).toBe(0);
  });

  it('handles large amounts (₹10,00,000 = 10 lakh)', () => {
    const result = calculatePaymentSplit({ baseAmountPaise: 10_000_000 });

    expect(result.platform_fee_paise).toBe(1_000_000);
    expect(result.gst_on_platform_fee_paise).toBe(180_000);
    expect(result.total_client_pays_paise).toBe(11_180_000);
    expect(result.tds_paise).toBe(1_000_000);
    expect(result.artist_net_paise).toBe(9_000_000);
  });

  it('rounds fractional paise correctly', () => {
    // 33,333 paise → platform fee: 3,333.3 → rounds to 3,333
    const result = calculatePaymentSplit({ baseAmountPaise: 33_333 });

    expect(result.platform_fee_paise).toBe(3_333);
    expect(result.gst_on_platform_fee_paise).toBe(600); // 3,333 * 0.18 = 599.94 → 600
    expect(Number.isInteger(result.total_client_pays_paise)).toBe(true);
    expect(Number.isInteger(result.tds_paise)).toBe(true);
    expect(Number.isInteger(result.artist_net_paise)).toBe(true);
  });

  it('all amounts are integers (no floating point paise)', () => {
    const amounts = [1, 99, 12345, 999_999, 50_000_00];
    for (const amount of amounts) {
      const result = calculatePaymentSplit({ baseAmountPaise: amount });
      expect(Number.isInteger(result.total_client_pays_paise)).toBe(true);
      expect(Number.isInteger(result.platform_fee_paise)).toBe(true);
      expect(Number.isInteger(result.gst_on_platform_fee_paise)).toBe(true);
      expect(Number.isInteger(result.artist_gross_paise)).toBe(true);
      expect(Number.isInteger(result.tds_paise)).toBe(true);
      expect(Number.isInteger(result.artist_net_paise)).toBe(true);
      expect(Number.isInteger(result.agent_commission_paise)).toBe(true);
    }
  });

  it('agent commission at 5% (minimum)', () => {
    const result = calculatePaymentSplit({
      baseAmountPaise: 100_000,
      agentCommissionRate: 0.05,
    });

    expect(result.agent_commission_paise).toBe(5_000);
    expect(result.artist_gross_paise).toBe(95_000);
    expect(result.tds_paise).toBe(9_500);
    expect(result.artist_net_paise).toBe(85_500);
  });

  it('agent commission at 15% (maximum)', () => {
    const result = calculatePaymentSplit({
      baseAmountPaise: 100_000,
      agentCommissionRate: 0.15,
    });

    expect(result.agent_commission_paise).toBe(15_000);
    expect(result.artist_gross_paise).toBe(85_000);
    expect(result.tds_paise).toBe(8_500);
    expect(result.artist_net_paise).toBe(76_500);
  });

  it('total client pays = base + platform fee + GST (invariant)', () => {
    const cases = [
      { baseAmountPaise: 50_000 },
      { baseAmountPaise: 150_000, agentCommissionRate: 0.10 },
      { baseAmountPaise: 1_000_000, agentCommissionRate: 0.05 },
    ];

    for (const params of cases) {
      const r = calculatePaymentSplit(params);
      expect(r.total_client_pays_paise).toBe(
        r.base_amount_paise + r.platform_fee_paise + r.gst_on_platform_fee_paise,
      );
    }
  });

  it('artist net + tds + agent commission = base amount (invariant)', () => {
    const cases = [
      { baseAmountPaise: 100_000 },
      { baseAmountPaise: 200_000, agentCommissionRate: 0.10 },
      { baseAmountPaise: 75_000, agentCommissionRate: 0.15 },
    ];

    for (const params of cases) {
      const r = calculatePaymentSplit(params);
      expect(r.artist_net_paise + r.tds_paise + r.agent_commission_paise).toBe(
        r.base_amount_paise,
      );
    }
  });
});

describe('calculateRefund', () => {
  const baseDate = new Date('2026-06-15T10:00:00Z');

  function cancelDate(daysBefore: number): string {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - daysBefore);
    return d.toISOString();
  }

  it('100% refund when cancelled >30 days before event', () => {
    const result = calculateRefund({
      totalPaidPaise: 100_000,
      eventDate: baseDate.toISOString(),
      cancelDate: cancelDate(45), // 45 days before
    });

    expect(result.refundPercent).toBe(100);
    expect(result.refundAmountPaise).toBe(100_000);
    expect(result.artistPercent).toBe(0);
  });

  it('100% refund at exactly 30 days before', () => {
    const result = calculateRefund({
      totalPaidPaise: 100_000,
      eventDate: baseDate.toISOString(),
      cancelDate: cancelDate(30),
    });

    expect(result.refundPercent).toBe(100);
    expect(result.refundAmountPaise).toBe(100_000);
  });

  it('75% refund at 15-29 days before', () => {
    const result = calculateRefund({
      totalPaidPaise: 100_000,
      eventDate: baseDate.toISOString(),
      cancelDate: cancelDate(20), // 20 days before
    });

    expect(result.refundPercent).toBe(75);
    expect(result.refundAmountPaise).toBe(75_000);
    expect(result.artistPercent).toBe(25);
  });

  it('75% refund at exactly 15 days before', () => {
    const result = calculateRefund({
      totalPaidPaise: 100_000,
      eventDate: baseDate.toISOString(),
      cancelDate: cancelDate(15),
    });

    expect(result.refundPercent).toBe(75);
    expect(result.refundAmountPaise).toBe(75_000);
  });

  it('50% refund at 7-14 days before', () => {
    const result = calculateRefund({
      totalPaidPaise: 100_000,
      eventDate: baseDate.toISOString(),
      cancelDate: cancelDate(10), // 10 days before
    });

    expect(result.refundPercent).toBe(50);
    expect(result.refundAmountPaise).toBe(50_000);
    expect(result.artistPercent).toBe(50);
  });

  it('50% refund at exactly 7 days before', () => {
    const result = calculateRefund({
      totalPaidPaise: 100_000,
      eventDate: baseDate.toISOString(),
      cancelDate: cancelDate(7),
    });

    expect(result.refundPercent).toBe(50);
    expect(result.refundAmountPaise).toBe(50_000);
  });

  it('0% refund at <7 days before', () => {
    const result = calculateRefund({
      totalPaidPaise: 100_000,
      eventDate: baseDate.toISOString(),
      cancelDate: cancelDate(3), // 3 days before
    });

    expect(result.refundPercent).toBe(0);
    expect(result.refundAmountPaise).toBe(0);
    expect(result.artistPercent).toBe(100);
  });

  it('0% refund on event day', () => {
    const result = calculateRefund({
      totalPaidPaise: 100_000,
      eventDate: baseDate.toISOString(),
      cancelDate: baseDate.toISOString(),
    });

    expect(result.refundPercent).toBe(0);
    expect(result.refundAmountPaise).toBe(0);
  });

  it('rounds refund amount correctly', () => {
    const result = calculateRefund({
      totalPaidPaise: 33_333, // 75% of 33,333 = 24,999.75
      eventDate: baseDate.toISOString(),
      cancelDate: cancelDate(20),
    });

    expect(Number.isInteger(result.refundAmountPaise)).toBe(true);
    expect(result.refundAmountPaise).toBe(25_000); // Math.round(24999.75)
  });

  it('handles large payment amounts', () => {
    const result = calculateRefund({
      totalPaidPaise: 10_000_000, // ₹1,00,000
      eventDate: baseDate.toISOString(),
      cancelDate: cancelDate(45),
    });

    expect(result.refundAmountPaise).toBe(10_000_000);
    expect(result.refundPercent).toBe(100);
  });
});
