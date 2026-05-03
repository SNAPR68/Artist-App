import { riderRepository } from './rider.repository.js';
import { venueRepository } from '../venue/venue.repository.js';
import { bookingRepository } from '../booking/booking.repository.js';
import { db } from '../../infrastructure/database.js';

function safeParseJson(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return {};
  }
}

class RiderError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'RiderError';
  }
}

export class RiderService {
  async createOrUpdateRider(artistId: string, data: {
    notes?: string;
    hospitality_requirements: Record<string, unknown>;
    travel_requirements: Record<string, unknown>;
  }) {
    // Find artist profile by user_id
    const profile = await db('artist_profiles').where({ user_id: artistId }).first();
    if (!profile) throw new RiderError('NOT_FOUND', 'Artist profile not found', 404);

    const existing = await riderRepository.findRiderByArtistId(profile.id);
    if (existing) {
      return riderRepository.updateRider(existing.id, {
        notes: data.notes || existing.notes,
        hospitality_requirements: JSON.stringify(data.hospitality_requirements),
        travel_requirements: JSON.stringify(data.travel_requirements),
        version: existing.version + 1,
      });
    }

    return riderRepository.createRider({
      artist_id: profile.id,
      ...data,
    });
  }

  async getRider(artistId: string) {
    const rider = await riderRepository.findRiderByArtistId(artistId);
    if (!rider) throw new RiderError('NOT_FOUND', 'Rider not found', 404);

    const lineItems = await riderRepository.getLineItems(rider.id);
    return { ...rider, line_items: lineItems };
  }

  async addLineItem(userId: string, data: Record<string, unknown>) {
    const profile = await db('artist_profiles').where({ user_id: userId }).first();
    if (!profile) throw new RiderError('NOT_FOUND', 'Artist profile not found', 404);

    const rider = await riderRepository.findRiderByArtistId(profile.id);
    if (!rider) throw new RiderError('NOT_FOUND', 'Create a rider first', 404);

    return riderRepository.addLineItem({ rider_id: rider.id, ...data });
  }

  async updateLineItem(userId: string, itemId: string, data: Record<string, unknown>) {
    const profile = await db('artist_profiles').where({ user_id: userId }).first();
    if (!profile) throw new RiderError('NOT_FOUND', 'Artist profile not found', 404);

    const rider = await riderRepository.findRiderByArtistId(profile.id);
    if (!rider) throw new RiderError('NOT_FOUND', 'Rider not found', 404);

    return riderRepository.updateLineItem(itemId, data);
  }

  async removeLineItem(userId: string, itemId: string) {
    const profile = await db('artist_profiles').where({ user_id: userId }).first();
    if (!profile) throw new RiderError('NOT_FOUND', 'Artist profile not found', 404);

    const deleted = await riderRepository.removeLineItem(itemId);
    if (!deleted) throw new RiderError('NOT_FOUND', 'Line item not found', 404);
    return { deleted: true };
  }

  async generateBookingRiderCheck(bookingId: string) {
    const booking = await bookingRepository.findByIdWithDetails(bookingId);
    if (!booking) throw new RiderError('NOT_FOUND', 'Booking not found', 404);
    if (!booking.venue_id) throw new RiderError('NO_VENUE', 'Booking has no venue assigned', 400);

    const rider = await riderRepository.findRiderByArtistId(booking.artist_id);
    if (!rider) throw new RiderError('NO_RIDER', 'Artist has no rider configured', 400);

    // Remove existing checks for this booking
    await db('rider_venue_checks').where({ booking_id: bookingId }).del();

    const lineItems = await riderRepository.getLineItems(rider.id);
    const venueEquipment = await venueRepository.getEquipment(booking.venue_id);

    const checks = lineItems.map((item: Record<string, unknown>) => {
      // Auto-match: check if venue has equipment in same category with similar name
      const match = venueEquipment.find((eq: Record<string, unknown>) =>
        eq.category === item.category &&
        (eq.item_name as string).toLowerCase().includes((item.item_name as string).toLowerCase().split(' ')[0]),
      );

      return {
        booking_id: bookingId,
        rider_id: rider.id,
        venue_id: booking.venue_id,
        line_item_id: item.id,
        fulfillment_status: match ? 'available' : 'not_checked',
      };
    });

    if (checks.length === 0) return [];
    return riderRepository.createVenueChecks(checks);
  }

  async getRiderCheck(bookingId: string) {
    return riderRepository.getVenueChecks(bookingId);
  }

  async updateRiderCheck(checkId: string, userId: string, data: {
    fulfillment_status: string;
    alternative_offered?: string;
    notes?: string;
  }) {
    return riderRepository.updateVenueCheck(checkId, {
      ...data,
      checked_by: userId,
      checked_at: new Date(),
    });
  }

  // ── Phase 4: Structured rider sections ──────────────────────────────────
  async updateSections(
    userId: string,
    sections: Parameters<typeof riderRepository.updateRiderSections>[1],
  ) {
    const profile = await db('artist_profiles').where({ user_id: userId }).first();
    if (!profile) throw new RiderError('NOT_FOUND', 'Artist profile not found', 404);

    let rider = await riderRepository.findRiderByArtistId(profile.id);
    if (!rider) {
      rider = await riderRepository.createRider({
        artist_id: profile.id,
        hospitality_requirements: {},
        travel_requirements: {},
      });
    }
    return riderRepository.updateRiderSections(profile.id, sections);
  }

  // ── Phase 4: Event rider fulfilment ─────────────────────────────────────
  async seedEventFulfillment(eventFileId: string) {
    return riderRepository.seedFulfillment(eventFileId);
  }

  async listEventFulfillment(eventFileId: string) {
    // Auto-seed on first read.
    const existing = await db('event_rider_fulfillment')
      .where({ event_file_id: eventFileId })
      .count('id as n')
      .first();
    if (Number(existing?.n ?? 0) === 0) {
      await this.seedEventFulfillment(eventFileId);
    }

    const rows = await riderRepository.listFulfillment(eventFileId);

    // Run cross-check for each row that has an assigned vendor.
    for (const row of rows) {
      if (row.assigned_vendor_id && row.cross_check_status === 'pending') {
        const result = await this.crossCheckLineItem(
          row.assigned_vendor_id as string,
          row.category as string,
          row.item_name as string,
          row.quantity as number,
        );
        await riderRepository.setCrossCheck(row.id as string, result.status, result.notes);
        row.cross_check_status = result.status;
        row.cross_check_notes = result.notes;
      }
    }

    // Aggregate gap report.
    const total = rows.length;
    const fulfilled = rows.filter((r) =>
      r.fulfillment_status === 'available' || r.fulfillment_status === 'alternative_offered',
    ).length;
    const mismatches = rows.filter((r) => r.cross_check_status === 'mismatched');
    const missingMustHaves = rows.filter((r) =>
      r.priority === 'must_have' &&
      (r.fulfillment_status === 'unavailable' || r.fulfillment_status === 'not_checked'),
    );

    return {
      items: rows,
      summary: {
        total_items: total,
        fulfilled_items: fulfilled,
        fulfillment_pct: total > 0 ? Math.round((fulfilled / total) * 100) : 100,
        mismatch_count: mismatches.length,
        missing_must_haves: missingMustHaves.length,
        is_rider_satisfied: missingMustHaves.length === 0 && mismatches.length === 0,
      },
    };
  }

  async updateEventFulfillment(
    id: string,
    userId: string,
    patch: {
      assigned_vendor_id?: string | null;
      fulfillment_status?: string;
      alternative_offered?: string | null;
      notes?: string | null;
    },
  ) {
    const updated = await riderRepository.updateFulfillment(id, userId, patch);

    // Re-run cross-check if the assigned vendor changed.
    if (patch.assigned_vendor_id !== undefined && patch.assigned_vendor_id) {
      const full = await db('event_rider_fulfillment as erf')
        .leftJoin('rider_line_items as rli', 'rli.id', 'erf.line_item_id')
        .where('erf.id', id)
        .select('rli.category', 'rli.item_name', 'rli.quantity')
        .first();
      if (full) {
        const result = await this.crossCheckLineItem(
          patch.assigned_vendor_id,
          full.category,
          full.item_name,
          full.quantity,
        );
        await riderRepository.setCrossCheck(id, result.status, result.notes);
      }
    } else if (patch.assigned_vendor_id === null) {
      await riderRepository.setCrossCheck(id, 'pending', null);
    }

    return updated;
  }

  /**
   * Cross-check a rider line item against the assigned vendor's
   * category_attributes. Naive but useful: matches category and looks for
   * quantity-bearing keys whose names overlap with the line item.
   */
  private async crossCheckLineItem(
    vendorId: string,
    riderCategory: string,
    itemName: string,
    requiredQty: number,
  ): Promise<{ status: 'pending' | 'matched' | 'mismatched' | 'partial'; notes: string | null }> {
    const vendor = await db('artist_profiles')
      .where({ id: vendorId })
      .select('category', 'category_attributes', 'stage_name')
      .first();
    if (!vendor) return { status: 'pending', notes: 'Vendor not found' };

    const attrs: Record<string, unknown> = typeof vendor.category_attributes === 'string'
      ? safeParseJson(vendor.category_attributes)
      : (vendor.category_attributes ?? {});

    // Map rider category -> vendor categories that can fulfil it.
    const compatible: Record<string, string[]> = {
      sound: ['av'],
      lighting: ['av'],
      backline: ['av', 'artist'],
      staging: ['av', 'decor'],
      power: ['av'],
      hospitality: ['decor'],
      transport: [],
      other: [],
    };
    const okCategories = compatible[riderCategory] ?? [];
    if (okCategories.length && !okCategories.includes(vendor.category as string)) {
      return {
        status: 'mismatched',
        notes: `${vendor.stage_name} is a ${vendor.category} vendor; ${riderCategory} usually needs ${okCategories.join('/')}`,
      };
    }

    // Look for a key in attrs that semantically matches the item.
    const itemKey = itemName.toLowerCase().split(/\s+/)[0]; // e.g. "wireless mic" → "wireless"
    let matched = false;
    let providedQty: number | null = null;

    for (const [k, v] of Object.entries(attrs)) {
      if (k.toLowerCase().includes(itemKey) || itemKey.includes(k.toLowerCase())) {
        if (typeof v === 'number') {
          providedQty = v;
          matched = true;
          break;
        }
        if (typeof v === 'boolean' && v) {
          matched = true;
          break;
        }
        if (Array.isArray(v) && v.length > 0) {
          providedQty = v.length;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      return {
        status: 'partial',
        notes: `Couldn't auto-verify "${itemName}" in ${vendor.stage_name}'s catalogue. Confirm manually.`,
      };
    }
    if (providedQty !== null && providedQty < requiredQty) {
      return {
        status: 'mismatched',
        notes: `${vendor.stage_name} carries ${providedQty} but rider needs ${requiredQty} of "${itemName}".`,
      };
    }
    return {
      status: 'matched',
      notes: providedQty !== null
        ? `${vendor.stage_name} carries ${providedQty} (rider needs ${requiredQty}).`
        : `${vendor.stage_name} confirmed.`,
    };
  }

  async getRiderGapReport(bookingId: string) {
    const checks = await riderRepository.getVenueChecks(bookingId);

    const total = checks.length;
    const fulfilled = checks.filter((c: Record<string, unknown>) =>
      c.fulfillment_status === 'available' || c.fulfillment_status === 'alternative_offered',
    ).length;

    const missingMustHaves = checks.filter((c: Record<string, unknown>) =>
      c.priority === 'must_have' &&
      (c.fulfillment_status === 'unavailable' || c.fulfillment_status === 'not_checked'),
    );

    return {
      total_items: total,
      fulfilled_items: fulfilled,
      fulfillment_pct: total > 0 ? Math.round((fulfilled / total) * 100) : 100,
      missing_must_haves: missingMustHaves,
      is_rider_satisfied: missingMustHaves.length === 0,
    };
  }
}

export const riderService = new RiderService();
