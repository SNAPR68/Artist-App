/**
 * Event Company OS pivot (2026-04-22) — Event File repository.
 *
 * Single container joining all vendor bookings for one client event. See
 * migrations 098 (event_files) and 099 (event_file_vendors). Bookings remain
 * source of truth for state/amount/contract; event_file_vendors is just the
 * roster + call-time overrides.
 */
import { db } from '../../infrastructure/database.js';
import type {
  CreateEventFileInput,
  UpdateEventFileInput,
  AddEventFileVendorInput,
} from '@artist-booking/shared';

export interface ListEventFilesParams {
  client_id: string;
  status?: string;
  page: number;
  per_page: number;
}

const EVENT_FILE_COLUMNS = [
  'id',
  'client_id',
  'event_name',
  'event_date',
  'call_time',
  'city',
  'venue',
  'brief',
  'status',
  'budget_paise',
  'created_at',
  'updated_at',
];

export class EventFileRepository {
  async list(params: ListEventFilesParams) {
    let query = db('event_files')
      .where({ client_id: params.client_id, deleted_at: null })
      .orderBy('event_date', 'desc');

    if (params.status) query = query.where('status', params.status);

    const totalRow = await query.clone().clearOrder().count('id as count').first();
    const rows = await query
      .select(EVENT_FILE_COLUMNS)
      .offset((params.page - 1) * params.per_page)
      .limit(params.per_page);

    return { data: rows, total: Number(totalRow?.count ?? 0) };
  }

  async findById(id: string, clientId: string) {
    const file = await db('event_files')
      .where({ id, client_id: clientId, deleted_at: null })
      .select(EVENT_FILE_COLUMNS)
      .first();
    if (!file) return null;

    const vendors = await db('event_file_vendors as efv')
      .leftJoin('artist_profiles as ap', 'efv.vendor_profile_id', 'ap.id')
      .leftJoin('bookings as b', 'efv.booking_id', 'b.id')
      .where('efv.event_file_id', id)
      .select(
        'efv.id',
        'efv.vendor_profile_id',
        'efv.booking_id',
        'efv.role',
        'efv.call_time_override',
        'efv.notes',
        'ap.stage_name',
        'ap.category',
        'ap.base_city',
        'b.state as booking_status',
        'b.agreed_amount as booking_amount',
      );

    return { ...file, vendors };
  }

  async create(clientId: string, input: CreateEventFileInput) {
    const [row] = await db('event_files')
      .insert({
        client_id: clientId,
        event_name: input.event_name,
        event_date: input.event_date,
        call_time: input.call_time ?? null,
        city: input.city,
        venue: input.venue ?? null,
        brief: JSON.stringify(input.brief ?? {}),
        budget_paise: input.budget_paise ?? null,
      })
      .returning(EVENT_FILE_COLUMNS);
    return row;
  }

  async update(id: string, clientId: string, input: UpdateEventFileInput) {
    const patch: Record<string, unknown> = { updated_at: db.fn.now() };
    if (input.event_name !== undefined) patch.event_name = input.event_name;
    if (input.event_date !== undefined) patch.event_date = input.event_date;
    if (input.call_time !== undefined) patch.call_time = input.call_time;
    if (input.city !== undefined) patch.city = input.city;
    if (input.venue !== undefined) patch.venue = input.venue;
    if (input.brief !== undefined) patch.brief = JSON.stringify(input.brief);
    if (input.budget_paise !== undefined) patch.budget_paise = input.budget_paise;
    if (input.status !== undefined) patch.status = input.status;

    const [row] = await db('event_files')
      .where({ id, client_id: clientId, deleted_at: null })
      .update(patch)
      .returning(EVENT_FILE_COLUMNS);
    return row;
  }

  async softDelete(id: string, clientId: string) {
    const [row] = await db('event_files')
      .where({ id, client_id: clientId, deleted_at: null })
      .update({ deleted_at: db.fn.now() })
      .returning(['id']);
    return row;
  }

  async addVendor(eventFileId: string, input: AddEventFileVendorInput) {
    const [row] = await db('event_file_vendors')
      .insert({
        event_file_id: eventFileId,
        vendor_profile_id: input.vendor_profile_id,
        role: input.role,
        call_time_override: input.call_time_override ?? null,
        booking_id: input.booking_id ?? null,
        notes: input.notes ?? null,
      })
      .returning([
        'id',
        'event_file_id',
        'vendor_profile_id',
        'role',
        'call_time_override',
        'booking_id',
        'notes',
      ]);
    return row;
  }

  async removeVendor(eventFileId: string, vendorRowId: string) {
    const [row] = await db('event_file_vendors')
      .where({ id: vendorRowId, event_file_id: eventFileId })
      .del()
      .returning(['id']);
    return row;
  }

  async isOwner(id: string, clientId: string): Promise<boolean> {
    const row = await db('event_files')
      .where({ id, client_id: clientId, deleted_at: null })
      .select('id')
      .first();
    return !!row;
  }
}

export const eventFileRepository = new EventFileRepository();
