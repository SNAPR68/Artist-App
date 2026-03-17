import { db } from '../../infrastructure/database.js';

export class CoordinationRepository {
  async create(bookingId: string) {
    const [checklist] = await db('coordination_checklists')
      .insert({ booking_id: bookingId })
      .returning('*');
    return checklist;
  }

  async findByBookingId(bookingId: string) {
    return db('coordination_checklists').where({ booking_id: bookingId }).first();
  }

  async updateCheckpoint(bookingId: string, checkpoint: string, value: boolean) {
    const updateData: Record<string, unknown> = {
      [checkpoint]: value,
      [`${checkpoint}_at`]: value ? new Date() : null,
      updated_at: new Date(),
    };

    const [updated] = await db('coordination_checklists')
      .where({ booking_id: bookingId })
      .update(updateData)
      .returning('*');
    return updated;
  }

  async updateLogistics(bookingId: string, data: {
    travel_mode?: string;
    hotel_booked?: boolean;
    hotel_details?: Record<string, unknown>;
    parking_arranged?: boolean;
    special_rider_notes?: string;
  }) {
    const updateData: Record<string, unknown> = { ...data, updated_at: new Date() };
    if (data.hotel_details) {
      updateData.hotel_details = JSON.stringify(data.hotel_details);
    }

    const [updated] = await db('coordination_checklists')
      .where({ booking_id: bookingId })
      .update(updateData)
      .returning('*');
    return updated;
  }

  async setEscalationLevel(bookingId: string, level: number) {
    await db('coordination_checklists')
      .where({ booking_id: bookingId })
      .update({ escalation_level: level, updated_at: new Date() });
  }

  async findOverdueCheckpoints(checkpoint: string, cutoffDate: Date) {
    return db('coordination_checklists as cc')
      .join('bookings as b', 'b.id', 'cc.booking_id')
      .where('cc.' + checkpoint, false)
      .where('b.state', 'pre_event')
      .where('b.event_date', '<=', cutoffDate)
      .select('cc.*', 'b.event_date', 'b.artist_id', 'b.client_id', 'b.event_type');
  }
}

export const coordinationRepository = new CoordinationRepository();
