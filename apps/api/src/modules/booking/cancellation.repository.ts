import { db } from '../../infrastructure/database.js';

export interface CreateCancellationData {
  booking_id: string;
  sub_type: string;
  initiated_by: string;
  reason: string;
  backup_artist_triggered?: boolean;
  refund_amount_paise: number;
  artist_amount_paise: number;
  trust_impact?: Record<string, unknown>;
}

export class CancellationRepository {
  async create(data: CreateCancellationData) {
    const [record] = await db('cancellation_details')
      .insert({
        booking_id: data.booking_id,
        sub_type: data.sub_type,
        initiated_by: data.initiated_by,
        reason: data.reason,
        backup_artist_triggered: data.backup_artist_triggered ?? false,
        refund_amount_paise: data.refund_amount_paise,
        artist_amount_paise: data.artist_amount_paise,
        trust_impact: data.trust_impact ? JSON.stringify(data.trust_impact) : null,
      })
      .returning('*');
    return record;
  }

  async findByBookingId(bookingId: string) {
    return db('cancellation_details')
      .where({ booking_id: bookingId })
      .first();
  }

  async listByUserId(userId: string, role: 'artist' | 'client') {
    const joinField = role === 'artist' ? 'b.artist_id' : 'b.client_id';
    const profileTable = role === 'artist' ? 'artist_profiles' : 'client_profiles';

    return db('cancellation_details as cd')
      .join('bookings as b', 'b.id', 'cd.booking_id')
      .join(`${profileTable} as p`, 'p.id', joinField)
      .where({ 'p.user_id': userId })
      .select('cd.*', 'b.event_type', 'b.event_date', 'b.event_city')
      .orderBy('cd.created_at', 'desc');
  }
}

export const cancellationRepository = new CancellationRepository();
