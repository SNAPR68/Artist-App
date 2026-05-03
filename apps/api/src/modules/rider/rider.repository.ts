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

  // ─── Phase 4: Structured rider sections ──────────────────────────────────
  async updateRiderSections(
    artistId: string,
    sections: Partial<{
      sound: Record<string, unknown>;
      backline: Record<string, unknown>;
      stage_plot: Record<string, unknown>;
      lighting: Record<string, unknown>;
      power: Record<string, unknown>;
      green_room: Record<string, unknown>;
      hospitality_requirements: Record<string, unknown>;
      travel_requirements: Record<string, unknown>;
      stage_plot_url: string | null;
      notes: string | null;
    }>,
  ) {
    const update: Record<string, unknown> = { updated_at: new Date() };
    for (const k of [
      'sound',
      'backline',
      'stage_plot',
      'lighting',
      'power',
      'green_room',
      'hospitality_requirements',
      'travel_requirements',
    ] as const) {
      if (sections[k] !== undefined) update[k] = JSON.stringify(sections[k]);
    }
    if (sections.stage_plot_url !== undefined) update.stage_plot_url = sections.stage_plot_url;
    if (sections.notes !== undefined) update.notes = sections.notes;

    const [row] = await db('artist_riders')
      .where({ artist_id: artistId })
      .update(update)
      .returning('*');
    return row;
  }

  // ─── Phase 4: Event rider fulfilment ─────────────────────────────────────

  /**
   * Build (or rebuild) fulfilment rows for every line item of every artist
   * rider attached to this event file. Idempotent — preserves existing rows
   * by matching on (event_file_id, line_item_id).
   */
  async seedFulfillment(eventFileId: string) {
    // Find all riders for vendors on this event file (artist category only).
    const lineItems = await db('event_file_vendors as efv')
      .join('artist_profiles as ap', 'ap.id', 'efv.vendor_profile_id')
      .join('artist_riders as ar', 'ar.artist_id', 'ap.id')
      .join('rider_line_items as rli', 'rli.rider_id', 'ar.id')
      .where('efv.event_file_id', eventFileId)
      .select(
        'ar.id as rider_id',
        'rli.id as line_item_id',
      );

    if (lineItems.length === 0) return [];

    const rows = lineItems.map((r: { rider_id: string; line_item_id: string }) => ({
      event_file_id: eventFileId,
      rider_id: r.rider_id,
      line_item_id: r.line_item_id,
    }));

    return db('event_rider_fulfillment')
      .insert(rows)
      .onConflict(['event_file_id', 'line_item_id'])
      .ignore()
      .returning('*');
  }

  async listFulfillment(eventFileId: string) {
    return db('event_rider_fulfillment as erf')
      .leftJoin('rider_line_items as rli', 'rli.id', 'erf.line_item_id')
      .leftJoin('artist_riders as ar', 'ar.id', 'erf.rider_id')
      .leftJoin('artist_profiles as artist', 'artist.id', 'ar.artist_id')
      .leftJoin('artist_profiles as vendor', 'vendor.id', 'erf.assigned_vendor_id')
      .where('erf.event_file_id', eventFileId)
      .orderBy([
        { column: 'rli.priority', order: 'asc' },
        { column: 'rli.category', order: 'asc' },
        { column: 'rli.sort_order', order: 'asc' },
      ])
      .select(
        'erf.id',
        'erf.event_file_id',
        'erf.rider_id',
        'erf.line_item_id',
        'erf.assigned_vendor_id',
        'erf.fulfillment_status',
        'erf.cross_check_status',
        'erf.cross_check_notes',
        'erf.alternative_offered',
        'erf.notes',
        'erf.checked_at',
        'rli.item_name',
        'rli.category',
        'rli.priority',
        'rli.quantity',
        'rli.specifications',
        'artist.stage_name as artist_name',
        'vendor.stage_name as vendor_name',
        'vendor.category as vendor_category',
      );
  }

  async updateFulfillment(
    id: string,
    userId: string,
    patch: {
      assigned_vendor_id?: string | null;
      fulfillment_status?: string;
      alternative_offered?: string | null;
      notes?: string | null;
    },
  ) {
    const update: Record<string, unknown> = {
      updated_at: new Date(),
      checked_by: userId,
      checked_at: new Date(),
    };
    if (patch.assigned_vendor_id !== undefined) update.assigned_vendor_id = patch.assigned_vendor_id;
    if (patch.fulfillment_status !== undefined) update.fulfillment_status = patch.fulfillment_status;
    if (patch.alternative_offered !== undefined) update.alternative_offered = patch.alternative_offered;
    if (patch.notes !== undefined) update.notes = patch.notes;

    const [row] = await db('event_rider_fulfillment')
      .where({ id })
      .update(update)
      .returning('*');
    return row;
  }

  async setCrossCheck(
    id: string,
    status: 'pending' | 'matched' | 'mismatched' | 'partial',
    notes: string | null,
  ) {
    const [row] = await db('event_rider_fulfillment')
      .where({ id })
      .update({
        cross_check_status: status,
        cross_check_notes: notes,
        updated_at: new Date(),
      })
      .returning('*');
    return row;
  }

  async getFulfillmentSummary(eventFileId: string) {
    const rows = await db('event_rider_fulfillment')
      .where({ event_file_id: eventFileId })
      .select('fulfillment_status', 'cross_check_status')
      .count('id as n')
      .groupBy('fulfillment_status', 'cross_check_status');
    return rows;
  }
}

export const riderRepository = new RiderRepository();
