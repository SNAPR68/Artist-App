import { db } from '../../infrastructure/database.js';
import type { DisputeStatus } from '@artist-booking/shared';

export interface CreateDisputeData {
  booking_id: string;
  dispute_type: string;
  initiated_by: string;
  description: string;
  evidence_deadline: Date;
}

export interface AddEvidenceData {
  dispute_id: string;
  submitted_by: string;
  evidence_type: string;
  file_url: string;
  description?: string;
}

export interface ResolveDisputeData {
  resolution_type: string;
  resolution_notes: string;
  resolved_by: string;
  financial_resolution?: Record<string, unknown>;
  trust_impact?: Record<string, unknown>;
}

export class DisputeRepository {
  async create(data: CreateDisputeData) {
    const [dispute] = await db('disputes')
      .insert({
        booking_id: data.booking_id,
        dispute_type: data.dispute_type,
        status: 'submitted',
        initiated_by: data.initiated_by,
        description: data.description,
        evidence_deadline: data.evidence_deadline,
      })
      .returning('*');
    return dispute;
  }

  async findById(id: string) {
    return db('disputes as d')
      .leftJoin('bookings as b', 'b.id', 'd.booking_id')
      .leftJoin('artist_profiles as ap', 'ap.id', 'b.artist_id')
      .leftJoin('client_profiles as cp', 'cp.user_id', 'b.client_id')
      .where({ 'd.id': id })
      .select(
        'd.*',
        'b.state as booking_state',
        'b.event_type',
        'b.event_date',
        'b.event_city',
        'b.artist_id',
        'b.client_id',
        'ap.stage_name as artist_name',
        'ap.user_id as artist_user_id',
        'cp.company_name as client_name',
        'cp.user_id as client_user_id',
      )
      .first();
  }

  async findActiveByBookingId(bookingId: string) {
    return db('disputes')
      .where({ booking_id: bookingId })
      .whereNotIn('status', ['resolved', 'closed'])
      .first();
  }

  async updateStatus(id: string, status: DisputeStatus, updateData?: Record<string, unknown>) {
    const data: Record<string, unknown> = { status, updated_at: new Date() };
    if (updateData) Object.assign(data, updateData);

    const [updated] = await db('disputes')
      .where({ id })
      .update(data)
      .returning('*');
    return updated;
  }

  async resolve(id: string, data: ResolveDisputeData) {
    const [resolved] = await db('disputes')
      .where({ id })
      .update({
        status: 'resolved',
        resolution_type: data.resolution_type,
        resolution_notes: data.resolution_notes,
        resolved_by: data.resolved_by,
        resolved_at: new Date(),
        financial_resolution: data.financial_resolution ? JSON.stringify(data.financial_resolution) : null,
        trust_impact: data.trust_impact ? JSON.stringify(data.trust_impact) : null,
        updated_at: new Date(),
      })
      .returning('*');
    return resolved;
  }

  async listByStatus(status: string, page: number, perPage: number) {
    const query = db('disputes as d')
      .leftJoin('bookings as b', 'b.id', 'd.booking_id')
      .leftJoin('artist_profiles as ap', 'ap.id', 'b.artist_id')
      .leftJoin('client_profiles as cp', 'cp.user_id', 'b.client_id')
      .where({ 'd.status': status })
      .select(
        'd.*',
        'ap.stage_name as artist_name',
        'cp.company_name as client_name',
        'b.event_type',
        'b.event_date',
      )
      .orderBy('d.created_at', 'desc');

    const total = await db('disputes').where({ status }).count('id as count').first();
    const data = await query.offset((page - 1) * perPage).limit(perPage);

    return { data, total: Number(total?.count ?? 0) };
  }

  async listByUserId(userId: string, page: number, perPage: number) {
    const query = db('disputes as d')
      .join('bookings as b', 'b.id', 'd.booking_id')
      .leftJoin('artist_profiles as ap', 'ap.id', 'b.artist_id')
      .leftJoin('client_profiles as cp', 'cp.user_id', 'b.client_id')
      .where(function () {
        this.where('ap.user_id', userId).orWhere('cp.user_id', userId);
      })
      .select(
        'd.*',
        'ap.stage_name as artist_name',
        'cp.company_name as client_name',
        'b.event_type',
        'b.event_date',
      )
      .orderBy('d.created_at', 'desc');

    const totalQuery = db('disputes as d')
      .join('bookings as b', 'b.id', 'd.booking_id')
      .leftJoin('artist_profiles as ap', 'ap.id', 'b.artist_id')
      .leftJoin('client_profiles as cp', 'cp.user_id', 'b.client_id')
      .where(function () {
        this.where('ap.user_id', userId).orWhere('cp.user_id', userId);
      })
      .count('d.id as count')
      .first();

    const [data, total] = await Promise.all([
      query.offset((page - 1) * perPage).limit(perPage),
      totalQuery,
    ]);

    return { data, total: Number(total?.count ?? 0) };
  }

  async listAll(page: number, perPage: number) {
    const query = db('disputes as d')
      .leftJoin('bookings as b', 'b.id', 'd.booking_id')
      .leftJoin('artist_profiles as ap', 'ap.id', 'b.artist_id')
      .leftJoin('client_profiles as cp', 'cp.user_id', 'b.client_id')
      .select(
        'd.*',
        'ap.stage_name as artist_name',
        'cp.company_name as client_name',
        'b.event_type',
        'b.event_date',
      )
      .orderBy('d.created_at', 'desc');

    const total = await db('disputes').count('id as count').first();
    const data = await query.offset((page - 1) * perPage).limit(perPage);

    return { data, total: Number(total?.count ?? 0) };
  }

  async addEvidence(data: AddEvidenceData) {
    const [evidence] = await db('dispute_evidence')
      .insert({
        dispute_id: data.dispute_id,
        submitted_by: data.submitted_by,
        evidence_type: data.evidence_type,
        file_url: data.file_url,
        description: data.description ?? null,
      })
      .returning('*');
    return evidence;
  }

  async getEvidence(disputeId: string) {
    return db('dispute_evidence')
      .where({ dispute_id: disputeId })
      .orderBy('created_at', 'asc');
  }

  async findExpiredEvidenceWindows() {
    return db('disputes')
      .where({ status: 'evidence_collection' })
      .where('evidence_deadline', '<', new Date())
      .select('*');
  }
}

export const disputeRepository = new DisputeRepository();
