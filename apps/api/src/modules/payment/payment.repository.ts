import { db } from '../../infrastructure/database.js';
import type { PaymentStatus } from '@artist-booking/shared';

export interface CreatePaymentData {
  booking_id: string;
  razorpay_order_id: string;
  amount_paise: number;
  currency: string;
  platform_fee_paise: number;
  gst_paise: number;
  tds_paise: number;
  artist_payout_paise: number;
  idempotency_key: string;
}

export class PaymentRepository {
  async create(data: CreatePaymentData) {
    const [payment] = await db('payments')
      .insert({
        booking_id: data.booking_id,
        razorpay_order_id: data.razorpay_order_id,
        amount_paise: data.amount_paise,
        currency: data.currency,
        status: 'pending',
        platform_fee_paise: data.platform_fee_paise,
        gst_paise: data.gst_paise,
        tds_paise: data.tds_paise,
        artist_payout_paise: data.artist_payout_paise,
        idempotency_key: data.idempotency_key,
      })
      .returning('*');
    return payment;
  }

  async findById(id: string) {
    return db('payments')
      .where({ id })
      .first();
  }

  async findByBookingId(bookingId: string) {
    return db('payments')
      .where({ booking_id: bookingId })
      .orderBy('created_at', 'desc')
      .first();
  }

  async findByOrderId(orderId: string) {
    return db('payments')
      .where({ razorpay_order_id: orderId })
      .first();
  }

  async findByIdempotencyKey(key: string) {
    return db('payments')
      .where({ idempotency_key: key })
      .first();
  }

  async updateStatus(id: string, status: PaymentStatus, razorpayPaymentId?: string) {
    const updateData: Record<string, unknown> = { status, updated_at: new Date() };
    if (razorpayPaymentId) updateData.razorpay_payment_id = razorpayPaymentId;

    const [updated] = await db('payments')
      .where({ id })
      .update(updateData)
      .returning('*');
    return updated;
  }

  async listByUserId(userId: string, role: 'artist' | 'client') {
    const joinTable = role === 'artist' ? 'artist_profiles' : 'client_profiles';
    const joinField = role === 'artist' ? 'artist_id' : 'client_id';

    return db('payments as p')
      .join('bookings as b', 'b.id', 'p.booking_id')
      .join(`${joinTable} as prof`, `prof.id`, `b.${joinField}`)
      .where({ 'prof.user_id': userId })
      .select('p.*', 'b.event_type', 'b.event_date', 'b.event_city')
      .orderBy('p.created_at', 'desc');
  }

  async getEarningsSummary(userId: string, startDate: string, endDate: string) {
    const result = await db('payments as p')
      .join('bookings as b', 'b.id', 'p.booking_id')
      .join('artist_profiles as ap', 'ap.id', 'b.artist_id')
      .where({ 'ap.user_id': userId, 'p.status': 'settled' })
      .whereBetween('p.created_at', [startDate, endDate])
      .select(
        db.raw('SUM(p.amount_paise) as gross_total'),
        db.raw('SUM(p.tds_paise) as total_tds'),
        db.raw('SUM(p.platform_fee_paise) as total_platform_fee'),
        db.raw('SUM(p.artist_payout_paise) as net_total'),
        db.raw('COUNT(p.id) as transaction_count'),
      )
      .first();
    return result;
  }
}

export const paymentRepository = new PaymentRepository();
