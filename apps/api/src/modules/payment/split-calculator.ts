import { FINANCIAL, CANCELLATION_TIERS } from '@artist-booking/shared';

export interface PaymentSplit {
  total_client_pays_paise: number;
  base_amount_paise: number;
  platform_fee_paise: number;
  gst_on_platform_fee_paise: number;
  artist_gross_paise: number;
  tds_paise: number;
  artist_net_paise: number;
  agent_commission_paise: number;
}

/**
 * Calculate the full payment split for a booking.
 * All amounts in paise (integer arithmetic only).
 */
export function calculatePaymentSplit(params: {
  baseAmountPaise: number;
  agentCommissionRate?: number; // 0.05 to 0.15
}): PaymentSplit {
  const { baseAmountPaise, agentCommissionRate = 0 } = params;

  const platformFee = Math.round(baseAmountPaise * FINANCIAL.PLATFORM_FEE_RATE);
  const gstOnPlatformFee = Math.round(platformFee * FINANCIAL.GST_RATE);
  const totalClientPays = baseAmountPaise + platformFee + gstOnPlatformFee;

  const agentCommission = Math.round(baseAmountPaise * agentCommissionRate);
  const artistGross = baseAmountPaise - agentCommission;
  const tds = Math.round(artistGross * FINANCIAL.TDS_RATE);
  const artistNet = artistGross - tds;

  return {
    total_client_pays_paise: totalClientPays,
    base_amount_paise: baseAmountPaise,
    platform_fee_paise: platformFee,
    gst_on_platform_fee_paise: gstOnPlatformFee,
    artist_gross_paise: artistGross,
    tds_paise: tds,
    artist_net_paise: artistNet,
    agent_commission_paise: agentCommission,
  };
}

/**
 * Calculate refund amount based on cancellation schedule.
 */
export function calculateRefund(params: {
  totalPaidPaise: number;
  eventDate: string;
  cancelDate: string;
}): { refundAmountPaise: number; refundPercent: number; artistPercent: number } {
  const eventDate = new Date(params.eventDate);
  const cancelDate = new Date(params.cancelDate);
  const daysBefore = Math.floor((eventDate.getTime() - cancelDate.getTime()) / (1000 * 60 * 60 * 24));

  // Find applicable tier (tiers are sorted descending by minDaysBefore)
  let tier = CANCELLATION_TIERS[CANCELLATION_TIERS.length - 1]; // default: 0%
  for (const t of CANCELLATION_TIERS) {
    if (daysBefore >= t.minDaysBefore) {
      tier = t;
      break;
    }
  }

  const refundAmount = Math.round(params.totalPaidPaise * (tier.refundPercent / 100));

  return {
    refundAmountPaise: refundAmount,
    refundPercent: tier.refundPercent,
    artistPercent: tier.artistPercent,
  };
}
