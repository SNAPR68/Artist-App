import { db } from '../../infrastructure/database.js';

export class FinancialCommandRepository {
  // ─── Dashboard Queries ──────────────────────────────────────

  /**
   * Available balance = total settled artist payouts - total completed payout transfers.
   */
  async getAvailableBalance(artistId: string): Promise<number> {
    const [settled] = await db('payment_settlements')
      .whereIn('payment_id', function () {
        this.select('id')
          .from('payments')
          .where('status', 'settled')
          .whereIn('booking_id', function () {
            this.select('id').from('bookings').where('artist_id', artistId);
          });
      })
      .sum('artist_payout_paise as total');

    const [paid] = await db('payout_transfers')
      .where('artist_id', artistId)
      .where('status', 'completed')
      .sum('amount_paise as total');

    const settledTotal = Number(settled?.total || 0);
    const paidTotal = Number(paid?.total || 0);

    return settledTotal - paidTotal;
  }

  /**
   * In-escrow = SUM of artist_share for payments in escrow.
   */
  async getInEscrowAmount(artistId: string): Promise<number> {
    const [result] = await db('payments as p')
      .join('bookings as b', 'b.id', 'p.booking_id')
      .where('b.artist_id', artistId)
      .where('p.status', 'in_escrow')
      .sum('p.artist_share as total');

    return Number(result?.total || 0);
  }

  /**
   * Pending settlement = SUM of artist_share for completed bookings with captured payments.
   */
  async getPendingSettlementAmount(artistId: string): Promise<number> {
    const [result] = await db('payments as p')
      .join('bookings as b', 'b.id', 'p.booking_id')
      .where('b.artist_id', artistId)
      .where('b.state', 'completed')
      .where('p.status', 'captured')
      .sum('p.artist_share as total');

    return Number(result?.total || 0);
  }

  /**
   * Total earned = SUM of all settled artist payouts.
   */
  async getTotalEarned(artistId: string): Promise<number> {
    const [result] = await db('payment_settlements')
      .whereIn('payment_id', function () {
        this.select('id')
          .from('payments')
          .whereIn('booking_id', function () {
            this.select('id').from('bookings').where('artist_id', artistId);
          });
      })
      .sum('artist_payout_paise as total');

    return Number(result?.total || 0);
  }

  /**
   * Total payouts = SUM of completed payout transfers.
   */
  async getTotalPayouts(artistId: string): Promise<number> {
    const [result] = await db('payout_transfers')
      .where('artist_id', artistId)
      .where('status', 'completed')
      .sum('amount_paise as total');

    return Number(result?.total || 0);
  }

  // ─── Forecast Queries ───────────────────────────────────────

  /**
   * Confirmed bookings in a date range (confirmed, pre_event, event_day).
   */
  async getConfirmedBookingsInRange(
    artistId: string,
    startDate: string,
    endDate: string,
  ) {
    return db('bookings')
      .where('artist_id', artistId)
      .whereIn('state', ['confirmed', 'pre_event', 'event_day'])
      .where('event_date', '>=', startDate)
      .where('event_date', '<=', endDate)
      .select(
        'id',
        'event_date',
        'event_type',
        'event_city',
        'agreed_amount',
        'final_amount_paise',
      );
  }

  /**
   * Probable bookings in a date range (quoted, negotiating).
   */
  async getProbableBookingsInRange(
    artistId: string,
    startDate: string,
    endDate: string,
  ) {
    return db('bookings')
      .where('artist_id', artistId)
      .whereIn('state', ['quoted', 'negotiating'])
      .where('event_date', '>=', startDate)
      .where('event_date', '<=', endDate)
      .select(
        'id',
        'event_date',
        'event_type',
        'event_city',
        'agreed_amount',
        'final_amount_paise',
      );
  }

  /**
   * Trailing revenue for the last N months (completed/settled bookings).
   */
  async getTrailingRevenue(artistId: string, months: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);

    const [result] = await db('bookings')
      .where('artist_id', artistId)
      .whereIn('state', ['completed', 'settled'])
      .where('event_date', '>=', cutoff.toISOString().split('T')[0])
      .sum(db.raw('COALESCE(final_amount_paise, agreed_amount, 0) as total'));

    return Number((result as any)?.total || 0);
  }

  // ─── Cash Flow Forecast CRUD ────────────────────────────────

  async upsertForecast(data: {
    artist_id: string;
    period_label: string;
    period_start: string;
    period_end: string;
    confirmed_income_paise: number;
    probable_income_paise: number;
    pending_settlement_paise: number;
    net_forecast_paise: number;
    is_light_month: boolean;
    advisory: string | null;
  }) {
    const [row] = await db('cash_flow_forecasts')
      .insert({
        ...data,
        updated_at: new Date(),
      })
      .onConflict(['artist_id', 'period_label'])
      .merge({
        period_start: data.period_start,
        period_end: data.period_end,
        confirmed_income_paise: data.confirmed_income_paise,
        probable_income_paise: data.probable_income_paise,
        pending_settlement_paise: data.pending_settlement_paise,
        net_forecast_paise: data.net_forecast_paise,
        is_light_month: data.is_light_month,
        advisory: data.advisory,
        updated_at: new Date(),
      })
      .returning('*');
    return row;
  }

  async getForecasts(artistId: string) {
    return db('cash_flow_forecasts')
      .where({ artist_id: artistId })
      .orderBy('period_start', 'asc');
  }

  // ─── Income Certificate ─────────────────────────────────────

  /**
   * Get settlement details for a period, joining payments + payment_settlements.
   */
  async getSettlementsForPeriod(
    artistId: string,
    startDate: string,
    endDate: string,
  ) {
    return db('payment_settlements as ps')
      .join('payments as p', 'p.id', 'ps.payment_id')
      .join('bookings as b', 'b.id', 'p.booking_id')
      .where('b.artist_id', artistId)
      .where('ps.created_at', '>=', startDate)
      .where('ps.created_at', '<=', endDate)
      .select(
        'ps.id as settlement_id',
        'p.id as payment_id',
        'b.id as booking_id',
        'p.amount_paise as gross_paise',
        'p.tds_amount as tds_paise',
        'p.gst_amount as gst_paise',
        'p.platform_fee as platform_fee_paise',
        'ps.artist_payout_paise as net_paise',
        'ps.created_at as settled_at',
      );
  }

  async createCertificate(data: {
    artist_id: string;
    period_start: string;
    period_end: string;
    total_gross_paise: number;
    total_tds_paise: number;
    total_gst_paise: number;
    total_platform_fee_paise: number;
    total_net_paise: number;
    booking_count: number;
    certificate_number: string;
    status: string;
    valid_until: string;
  }) {
    const [row] = await db('income_certificates')
      .insert(data)
      .returning('*');
    return row;
  }

  async getCertificate(id: string) {
    return db('income_certificates').where({ id }).first();
  }

  async getCertificatesByArtist(artistId: string) {
    return db('income_certificates')
      .where({ artist_id: artistId })
      .orderBy('created_at', 'desc');
  }

  async getCertificateCount(artistId: string): Promise<number> {
    const [result] = await db('income_certificates')
      .where({ artist_id: artistId })
      .count('* as count');
    return Number(result?.count || 0);
  }

  // ─── Tax Summary ────────────────────────────────────────────

  /**
   * Aggregate tax figures grouped by quarter (Indian FY: Apr-Mar).
   */
  async getTaxAggregates(
    artistId: string,
    startDate: string,
    endDate: string,
  ) {
    return db('payment_settlements as ps')
      .join('payments as p', 'p.id', 'ps.payment_id')
      .join('bookings as b', 'b.id', 'p.booking_id')
      .where('b.artist_id', artistId)
      .where('ps.created_at', '>=', startDate)
      .where('ps.created_at', '<=', endDate)
      .select(
        db.raw(`
          CASE
            WHEN EXTRACT(MONTH FROM ps.created_at) BETWEEN 4 AND 6 THEN 'Q1'
            WHEN EXTRACT(MONTH FROM ps.created_at) BETWEEN 7 AND 9 THEN 'Q2'
            WHEN EXTRACT(MONTH FROM ps.created_at) BETWEEN 10 AND 12 THEN 'Q3'
            ELSE 'Q4'
          END as quarter
        `),
        db.raw('COALESCE(SUM(p.amount_paise), 0)::bigint as gross_paise'),
        db.raw('COALESCE(SUM(p.tds_amount), 0)::bigint as tds_paise'),
        db.raw('COALESCE(SUM(p.gst_amount), 0)::bigint as gst_paise'),
        db.raw('COALESCE(SUM(p.platform_fee), 0)::bigint as platform_fee_paise'),
        db.raw('COALESCE(SUM(ps.artist_payout_paise), 0)::bigint as net_paise'),
        db.raw('COUNT(DISTINCT b.id)::int as booking_count'),
      )
      .groupBy(db.raw(`
        CASE
          WHEN EXTRACT(MONTH FROM ps.created_at) BETWEEN 4 AND 6 THEN 'Q1'
          WHEN EXTRACT(MONTH FROM ps.created_at) BETWEEN 7 AND 9 THEN 'Q2'
          WHEN EXTRACT(MONTH FROM ps.created_at) BETWEEN 10 AND 12 THEN 'Q3'
          ELSE 'Q4'
        END
      `))
      .orderBy('quarter', 'asc');
  }
}

export const financialCommandRepository = new FinancialCommandRepository();
