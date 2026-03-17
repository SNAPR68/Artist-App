import { db } from '../../infrastructure/database.js';
import type { PayoutStatus } from '@artist-booking/shared';

export interface CreatePayoutData {
  settlement_id: string;
  artist_id: string;
  amount_paise: number;
  transfer_method?: string;
}

export class PayoutRepository {
  async create(data: CreatePayoutData) {
    const [payout] = await db('payout_transfers')
      .insert({
        settlement_id: data.settlement_id,
        artist_id: data.artist_id,
        amount_paise: data.amount_paise,
        transfer_method: data.transfer_method ?? 'manual',
        status: 'pending',
      })
      .returning('*');
    return payout;
  }

  async findById(id: string) {
    return db('payout_transfers').where({ id }).first();
  }

  async findBySettlementId(settlementId: string) {
    return db('payout_transfers').where({ settlement_id: settlementId }).first();
  }

  async findByArtistId(artistId: string, page: number, perPage: number) {
    const query = db('payout_transfers')
      .where({ artist_id: artistId })
      .orderBy('created_at', 'desc');

    const total = await db('payout_transfers')
      .where({ artist_id: artistId })
      .count('id as count')
      .first();

    const data = await query.offset((page - 1) * perPage).limit(perPage);

    return { data, total: Number(total?.count ?? 0) };
  }

  async updateStatus(
    id: string,
    status: PayoutStatus,
    extra?: { transfer_reference?: string; failed_reason?: string },
  ) {
    const updateData: Record<string, unknown> = { status };

    if (status === 'initiated') updateData.initiated_at = new Date();
    if (status === 'completed') updateData.completed_at = new Date();
    if (extra?.transfer_reference) updateData.transfer_reference = extra.transfer_reference;
    if (extra?.failed_reason) updateData.failed_reason = extra.failed_reason;

    const [updated] = await db('payout_transfers')
      .where({ id })
      .update(updateData)
      .returning('*');
    return updated;
  }

  async findPending() {
    return db('payout_transfers as pt')
      .leftJoin('artist_profiles as ap', 'ap.id', 'pt.artist_id')
      .leftJoin('artist_bank_accounts as ba', function () {
        this.on('ba.artist_id', '=', 'pt.artist_id').andOn('ba.is_primary', '=', db.raw('true'));
      })
      .where('pt.status', 'pending')
      .select(
        'pt.*',
        'ap.stage_name as artist_name',
        'ap.user_id as artist_user_id',
        'ba.account_holder_name',
        'ba.ifsc_code',
        'ba.bank_name',
        'ba.is_verified as bank_verified',
      )
      .orderBy('pt.created_at', 'asc');
  }

  async findFailed(maxRetries: number) {
    return db('payout_transfers')
      .where('status', 'failed')
      .where('retry_count', '<', maxRetries)
      .orderBy('created_at', 'asc');
  }

  async incrementRetry(id: string) {
    await db('payout_transfers')
      .where({ id })
      .increment('retry_count', 1);
  }
}

export const payoutRepository = new PayoutRepository();
