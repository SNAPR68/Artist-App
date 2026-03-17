import { db } from '../../infrastructure/database.js';

export class RiderRepository {
  // ─── Artist Riders ────────────────────────────────────────
  async createRider(data: { artist_id: string; notes?: string; hospitality_requirements: Record<string, unknown>; travel_requirements: Record<string, unknown> }) {
    const [row] = await db('artist_riders')
      .insert({
        artist_id: data.artist_id,
        notes: data.notes || null,
        hospitality_requirements: JSON.stringify(data.hospitality_requirements),
        travel_requirements: JSON.stringify(data.travel_requirements),
      })
      .returning('*');
    return row;
  }

  async findRiderByArtistId(artistId: string) {
    return db('artist_riders').where({ artist_id: artistId }).first();
  }

  async updateRider(id: string, data: Record<string, unknown>) {
    const [row] = await db('artist_riders')
      .where({ id })
      .update({ ...data, updated_at: new Date() })
      .returning('*');
    return row;
  }

  // ─── Line Items ───────────────────────────────────────────
  async addLineItem(data: Record<string, unknown>) {
    const [row] = await db('rider_line_items').insert(data).returning('*');
    return row;
  }

  async getLineItems(riderId: string) {
    return db('rider_line_items').where({ rider_id: riderId }).orderBy('sort_order');
  }

  async updateLineItem(id: string, data: Record<string, unknown>) {
    const [row] = await db('rider_line_items').where({ id }).update(data).returning('*');
    return row;
  }

  async removeLineItem(id: string) {
    return db('rider_line_items').where({ id }).del();
  }

  // ─── Venue Checks ────────────────────────────────────────
  async createVenueChecks(checks: Record<string, unknown>[]) {
    return db('rider_venue_checks').insert(checks).returning('*');
  }

  async getVenueChecks(bookingId: string) {
    return db('rider_venue_checks as rvc')
      .join('rider_line_items as rli', 'rvc.line_item_id', 'rli.id')
      .where('rvc.booking_id', bookingId)
      .select(
        'rvc.*',
        'rli.item_name',
        'rli.category',
        'rli.priority',
        'rli.quantity as required_quantity',
        'rli.specifications',
      )
      .orderBy('rli.priority')
      .orderBy('rli.sort_order');
  }

  async updateVenueCheck(id: string, data: Record<string, unknown>) {
    const [row] = await db('rider_venue_checks')
      .where({ id })
      .update(data)
      .returning('*');
    return row;
  }

  async getChecksByBookingId(bookingId: string) {
    return db('rider_venue_checks').where({ booking_id: bookingId });
  }
}

export const riderRepository = new RiderRepository();
