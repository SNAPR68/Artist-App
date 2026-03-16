import { CANCELLATION_TIERS, FINANCIAL } from '../constants/index.js';

/**
 * Convert paise to INR display string (e.g., 1500000 -> "₹15,000.00")
 */
export function formatCurrency(paise: number): string {
  const inr = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(inr);
}

/**
 * Convert INR to paise (e.g., 15000 -> 1500000)
 */
export function toPaise(inr: number): number {
  return Math.round(inr * 100);
}

/**
 * Convert paise to INR (e.g., 1500000 -> 15000)
 */
export function toINR(paise: number): number {
  return paise / 100;
}

/**
 * Calculate TDS amount (10% Section 194J) in paise
 */
export function calculateTDS(artistSharePaise: number): number {
  return Math.round(artistSharePaise * FINANCIAL.TDS_RATE);
}

/**
 * Calculate GST on platform fee (18%) in paise
 */
export function calculateGST(platformFeePaise: number): number {
  return Math.round(platformFeePaise * FINANCIAL.GST_RATE);
}

/**
 * Calculate platform fee from total booking amount in paise
 */
export function calculatePlatformFee(totalAmountPaise: number, rate?: number): number {
  const feeRate = rate ?? FINANCIAL.PLATFORM_FEE_RATE;
  return Math.round(totalAmountPaise * feeRate);
}

/**
 * Calculate cancellation refund based on days before event
 */
export function calculateRefund(
  totalPaidPaise: number,
  daysBefore: number,
): { refundAmount: number; artistAmount: number; refundPercent: number } {
  const tier = CANCELLATION_TIERS.find((t) => daysBefore >= t.minDaysBefore);
  if (!tier) {
    return { refundAmount: 0, artistAmount: totalPaidPaise, refundPercent: 0 };
  }
  const refundAmount = Math.round(totalPaidPaise * (tier.refundPercent / 100));
  const artistAmount = totalPaidPaise - refundAmount;
  return { refundAmount, artistAmount, refundPercent: tier.refundPercent };
}

/**
 * Calculate full payment split for a booking
 */
export function calculatePaymentSplit(params: {
  totalAmount: number; // paise
  platformFeeRate?: number;
  agentCommissionRate?: number; // percentage of artist share, e.g., 0.10 for 10%
}): {
  artistShare: number;
  platformFee: number;
  agentCommission: number;
  tdsAmount: number;
  gstOnPlatformFee: number;
  artistNetPayout: number;
} {
  const { totalAmount, platformFeeRate, agentCommissionRate } = params;

  const platformFee = calculatePlatformFee(totalAmount, platformFeeRate);
  const artistGross = totalAmount - platformFee;

  const agentCommission = agentCommissionRate
    ? Math.round(artistGross * agentCommissionRate)
    : 0;

  const artistShare = artistGross - agentCommission;
  const tdsAmount = calculateTDS(artistShare);
  const gstOnPlatformFee = calculateGST(platformFee);
  const artistNetPayout = artistShare - tdsAmount;

  return {
    artistShare,
    platformFee,
    agentCommission,
    tdsAmount,
    gstOnPlatformFee,
    artistNetPayout,
  };
}

/**
 * Generate a 6-digit numeric OTP
 */
export function generateOTP(): string {
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp.toString();
}
