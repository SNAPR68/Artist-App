import { financialCommandRepository } from './financial-command.repository.js';
import { db } from '../../infrastructure/database.js';
import {
  FINANCIAL_FORECAST_WEEKS_AHEAD,
  INCOME_CERTIFICATE_VALID_DAYS,
  LIGHT_MONTH_THRESHOLD_PCT,
} from '@artist-booking/shared';
import type {
  FinancialSnapshot,
  CashFlowForecast,
  IncomeCertificate,
  TaxSummary,
} from '@artist-booking/shared';
import { FinancialPeriod, IncomeCertificateStatus } from '@artist-booking/shared';

// ─── Error Class ──────────────────────────────────────────────

export class FinancialCommandError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'FinancialCommandError';
  }
}

// ─── Service ──────────────────────────────────────────────────

export class FinancialCommandService {
  // ─── Helpers ──────────────────────────────────────────────

  /**
   * Resolve artist_id from user_id via artist_profiles.
   */
  private async resolveArtistId(userId: string): Promise<string> {
    const artist = await db('artist_profiles').where({ user_id: userId }).first();
    if (!artist) {
      throw new FinancialCommandError('NOT_FOUND', 'Artist profile not found', 404);
    }
    return artist.id;
  }

  // ─── Financial Dashboard ──────────────────────────────────

  /**
   * Get the consolidated financial dashboard for the authenticated artist.
   */
  async getFinancialDashboard(userId: string): Promise<FinancialSnapshot> {
    const artistId = await this.resolveArtistId(userId);

    const [
      availableBalance,
      inEscrow,
      pendingSettlement,
      totalEarned,
      totalPayouts,
    ] = await Promise.all([
      financialCommandRepository.getAvailableBalance(artistId),
      financialCommandRepository.getInEscrowAmount(artistId),
      financialCommandRepository.getPendingSettlementAmount(artistId),
      financialCommandRepository.getTotalEarned(artistId),
      financialCommandRepository.getTotalPayouts(artistId),
    ]);

    return {
      available_balance_paise: availableBalance,
      in_escrow_paise: inEscrow,
      pending_settlement_paise: pendingSettlement,
      total_earned_paise: totalEarned,
      total_payouts_paise: totalPayouts,
    };
  }

  // ─── Cash Flow Forecast ───────────────────────────────────

  /**
   * Compute cash flow forecast for THIS_WEEK, NEXT_WEEK, THIS_MONTH, NEXT_3_MONTHS.
   */
  async computeCashFlowForecast(userId: string): Promise<CashFlowForecast[]> {
    const artistId = await this.resolveArtistId(userId);

    const now = new Date();
    // Build period date ranges
    const periods = this.buildPeriodRanges(now);

    // Get trailing 3-month average for light-month detection
    const trailing3MonthRevenue = await financialCommandRepository.getTrailingRevenue(artistId, 3);
    const trailing3MonthAvg = trailing3MonthRevenue / 3;

    const forecasts: CashFlowForecast[] = [];

    for (const period of periods) {
      const [confirmedBookings, probableBookings] = await Promise.all([
        financialCommandRepository.getConfirmedBookingsInRange(artistId, period.start, period.end),
        financialCommandRepository.getProbableBookingsInRange(artistId, period.start, period.end),
      ]);

      // Confirmed income: use final_amount_paise if available, otherwise agreed_amount
      const confirmedIncome = confirmedBookings.reduce(
        (sum: number, b: Record<string, unknown>) =>
          sum + Number(b.final_amount_paise || b.agreed_amount || 0),
        0,
      );

      // Probable income: 50% conversion probability
      const probableIncome = Math.round(
        probableBookings.reduce(
          (sum: number, b: Record<string, unknown>) =>
            sum + Number(b.final_amount_paise || b.agreed_amount || 0),
          0,
        ) * 0.5,
      );

      // Pending settlements from repository
      const pendingSettlement = await financialCommandRepository.getPendingSettlementAmount(artistId);

      const netForecast = confirmedIncome + probableIncome + pendingSettlement;

      // Light month detection (only for THIS_MONTH period)
      let isLightMonth = false;
      let advisory: string | null = null;

      if (period.label === FinancialPeriod.THIS_MONTH && trailing3MonthAvg > 0) {
        const threshold = trailing3MonthAvg * (LIGHT_MONTH_THRESHOLD_PCT / 100);
        if (netForecast < threshold) {
          isLightMonth = true;
          advisory = 'This month looks lighter than usual. Consider accepting more inquiries or expanding to new event types.';
        }
      }

      // Upsert forecast
      const row = await financialCommandRepository.upsertForecast({
        artist_id: artistId,
        period_label: period.label,
        period_start: period.start,
        period_end: period.end,
        confirmed_income_paise: confirmedIncome,
        probable_income_paise: probableIncome,
        pending_settlement_paise: pendingSettlement,
        net_forecast_paise: netForecast,
        is_light_month: isLightMonth,
        advisory,
      });

      forecasts.push({
        id: row.id,
        artist_id: artistId,
        period_label: period.label as FinancialPeriod,
        period_start: period.start,
        period_end: period.end,
        confirmed_income_paise: confirmedIncome,
        probable_income_paise: probableIncome,
        pending_settlement_paise: pendingSettlement,
        net_forecast_paise: netForecast,
        is_light_month: isLightMonth,
        advisory,
      });
    }

    return forecasts;
  }

  /**
   * Build date ranges for each forecast period.
   */
  private buildPeriodRanges(now: Date) {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // THIS_WEEK: today to end of this week (Sunday)
    const dayOfWeek = today.getDay(); // 0 = Sunday
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - dayOfWeek));

    // NEXT_WEEK: Monday after this week to the following Sunday
    const nextWeekStart = new Date(endOfWeek);
    nextWeekStart.setDate(nextWeekStart.getDate() + 1);
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekStart.getDate() + 6);

    // THIS_MONTH: today to end of current month
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // NEXT_3_MONTHS: today to ~12 weeks ahead
    const threeMonthsAhead = new Date(today);
    threeMonthsAhead.setDate(today.getDate() + FINANCIAL_FORECAST_WEEKS_AHEAD * 7);

    return [
      {
        label: FinancialPeriod.THIS_WEEK,
        start: this.formatDate(today),
        end: this.formatDate(endOfWeek),
      },
      {
        label: FinancialPeriod.NEXT_WEEK,
        start: this.formatDate(nextWeekStart),
        end: this.formatDate(nextWeekEnd),
      },
      {
        label: FinancialPeriod.THIS_MONTH,
        start: this.formatDate(today),
        end: this.formatDate(endOfMonth),
      },
      {
        label: FinancialPeriod.NEXT_3_MONTHS,
        start: this.formatDate(today),
        end: this.formatDate(threeMonthsAhead),
      },
    ];
  }

  private formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  // ─── Income Certificate ───────────────────────────────────

  /**
   * Generate an income certificate for a given period.
   */
  async generateIncomeCertificate(
    userId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<IncomeCertificate> {
    const artistId = await this.resolveArtistId(userId);

    // Query settlements for the period
    const settlements = await financialCommandRepository.getSettlementsForPeriod(
      artistId,
      periodStart,
      periodEnd,
    );

    // Aggregate totals
    let totalGross = 0;
    let totalTds = 0;
    let totalGst = 0;
    let totalPlatformFee = 0;
    let totalNet = 0;

    for (const s of settlements) {
      totalGross += Number(s.gross_paise || 0);
      totalTds += Number(s.tds_paise || 0);
      totalGst += Number(s.gst_paise || 0);
      totalPlatformFee += Number(s.platform_fee_paise || 0);
      totalNet += Number(s.net_paise || 0);
    }

    const bookingCount = new Set(
      settlements.map((s: Record<string, unknown>) => s.booking_id),
    ).size;

    // Generate certificate number: ABPL/IC/{year}/{padded_sequence}
    const year = new Date().getFullYear();
    const existingCount = await financialCommandRepository.getCertificateCount(artistId);
    const sequence = String(existingCount + 1).padStart(4, '0');
    const certificateNumber = `ABPL/IC/${year}/${sequence}`;

    // Valid until
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + INCOME_CERTIFICATE_VALID_DAYS);

    const certificate = await financialCommandRepository.createCertificate({
      artist_id: artistId,
      period_start: periodStart,
      period_end: periodEnd,
      total_gross_paise: totalGross,
      total_tds_paise: totalTds,
      total_gst_paise: totalGst,
      total_platform_fee_paise: totalPlatformFee,
      total_net_paise: totalNet,
      booking_count: bookingCount,
      certificate_number: certificateNumber,
      status: IncomeCertificateStatus.READY,
      valid_until: validUntil.toISOString().split('T')[0],
    });

    return {
      id: certificate.id,
      artist_id: certificate.artist_id,
      period_start: certificate.period_start,
      period_end: certificate.period_end,
      total_gross_paise: Number(certificate.total_gross_paise),
      total_tds_paise: Number(certificate.total_tds_paise),
      total_gst_paise: Number(certificate.total_gst_paise),
      total_platform_fee_paise: Number(certificate.total_platform_fee_paise),
      total_net_paise: Number(certificate.total_net_paise),
      booking_count: Number(certificate.booking_count),
      certificate_number: certificate.certificate_number,
      status: certificate.status,
      valid_until: certificate.valid_until,
    };
  }

  /**
   * Get a specific income certificate, verifying ownership.
   */
  async getIncomeCertificate(certificateId: string, userId: string): Promise<IncomeCertificate> {
    const artistId = await this.resolveArtistId(userId);

    const certificate = await financialCommandRepository.getCertificate(certificateId);
    if (!certificate) {
      throw new FinancialCommandError('NOT_FOUND', 'Income certificate not found', 404);
    }

    if (certificate.artist_id !== artistId) {
      throw new FinancialCommandError('FORBIDDEN', 'Access denied to this certificate', 403);
    }

    return {
      id: certificate.id,
      artist_id: certificate.artist_id,
      period_start: certificate.period_start,
      period_end: certificate.period_end,
      total_gross_paise: Number(certificate.total_gross_paise),
      total_tds_paise: Number(certificate.total_tds_paise),
      total_gst_paise: Number(certificate.total_gst_paise),
      total_platform_fee_paise: Number(certificate.total_platform_fee_paise),
      total_net_paise: Number(certificate.total_net_paise),
      booking_count: Number(certificate.booking_count),
      certificate_number: certificate.certificate_number,
      status: certificate.status,
      valid_until: certificate.valid_until,
    };
  }

  // ─── Tax Summary ──────────────────────────────────────────

  /**
   * Get tax summary with quarterly breakdown (Indian FY: Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar).
   */
  async getTaxSummary(
    userId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<TaxSummary> {
    const artistId = await this.resolveArtistId(userId);

    const aggregates = await financialCommandRepository.getTaxAggregates(
      artistId,
      periodStart,
      periodEnd,
    );

    // Build quarterly breakdown
    const quarterlyBreakdown = aggregates.map((q: Record<string, unknown>) => ({
      quarter: q.quarter as string,
      gross_paise: Number(q.gross_paise || 0),
      tds_paise: Number(q.tds_paise || 0),
      net_paise: Number(q.net_paise || 0),
    }));

    // Compute totals across all quarters
    let totalGross = 0;
    let totalTds = 0;
    let totalGst = 0;
    let totalPlatformFee = 0;
    let totalNet = 0;
    let bookingCount = 0;

    for (const q of aggregates) {
      totalGross += Number(q.gross_paise || 0);
      totalTds += Number(q.tds_paise || 0);
      totalGst += Number(q.gst_paise || 0);
      totalPlatformFee += Number(q.platform_fee_paise || 0);
      totalNet += Number(q.net_paise || 0);
      bookingCount += Number(q.booking_count || 0);
    }

    return {
      period_start: periodStart,
      period_end: periodEnd,
      total_gross_paise: totalGross,
      total_tds_paise: totalTds,
      total_gst_paise: totalGst,
      total_platform_fee_paise: totalPlatformFee,
      total_net_paise: totalNet,
      booking_count: bookingCount,
      quarterly_breakdown: quarterlyBreakdown,
    };
  }
}

export const financialCommandService = new FinancialCommandService();
