import { db } from '../../infrastructure/database.js';
import { encryptPII, decryptPII } from '../../infrastructure/encryption.js';

export interface CreateBankAccountData {
  artist_id: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;
  upi_id?: string;
  is_primary?: boolean;
}

function maskAccountNumber(decrypted: string): string {
  if (decrypted.length <= 4) return '****';
  return '*'.repeat(decrypted.length - 4) + decrypted.slice(-4);
}

export class BankAccountRepository {
  async create(data: CreateBankAccountData) {
    // If setting as primary, unset others first
    if (data.is_primary !== false) {
      await db('artist_bank_accounts')
        .where({ artist_id: data.artist_id, is_primary: true })
        .update({ is_primary: false });
    }

    const [account] = await db('artist_bank_accounts')
      .insert({
        artist_id: data.artist_id,
        account_holder_name: data.account_holder_name,
        account_number_encrypted: encryptPII(data.account_number),
        ifsc_code: data.ifsc_code,
        bank_name: data.bank_name,
        upi_id_encrypted: data.upi_id ? encryptPII(data.upi_id) : null,
        is_primary: data.is_primary !== false,
      })
      .returning('*');
    return account;
  }

  async findByArtistId(artistId: string) {
    const accounts = await db('artist_bank_accounts')
      .where({ artist_id: artistId })
      .orderBy('is_primary', 'desc')
      .orderBy('created_at', 'desc');

    return accounts.map((a: Record<string, unknown>) => ({
      ...a,
      account_number_masked: maskAccountNumber(decryptPII(a.account_number_encrypted as string)),
      upi_id_masked: a.upi_id_encrypted ? decryptPII(a.upi_id_encrypted as string) : null,
      account_number_encrypted: undefined,
      upi_id_encrypted: undefined,
    }));
  }

  async findPrimaryByArtistId(artistId: string) {
    const account = await db('artist_bank_accounts')
      .where({ artist_id: artistId, is_primary: true })
      .first();

    if (!account) return null;

    return {
      ...account,
      account_number: decryptPII(account.account_number_encrypted),
      upi_id: account.upi_id_encrypted ? decryptPII(account.upi_id_encrypted) : null,
    };
  }

  async findById(id: string) {
    return db('artist_bank_accounts').where({ id }).first();
  }

  async update(id: string, data: Partial<CreateBankAccountData>) {
    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (data.account_holder_name) updateData.account_holder_name = data.account_holder_name;
    if (data.account_number) updateData.account_number_encrypted = encryptPII(data.account_number);
    if (data.ifsc_code) updateData.ifsc_code = data.ifsc_code;
    if (data.bank_name) updateData.bank_name = data.bank_name;
    if (data.upi_id !== undefined) updateData.upi_id_encrypted = data.upi_id ? encryptPII(data.upi_id) : null;

    const [updated] = await db('artist_bank_accounts')
      .where({ id })
      .update(updateData)
      .returning('*');
    return updated;
  }

  async delete(id: string) {
    return db('artist_bank_accounts').where({ id }).del();
  }

  async setPrimary(id: string, artistId: string) {
    await db('artist_bank_accounts')
      .where({ artist_id: artistId, is_primary: true })
      .update({ is_primary: false });

    const [updated] = await db('artist_bank_accounts')
      .where({ id })
      .update({ is_primary: true, updated_at: new Date() })
      .returning('*');
    return updated;
  }

  async countByArtistId(artistId: string) {
    const result = await db('artist_bank_accounts')
      .where({ artist_id: artistId })
      .count('id as count')
      .first();
    return Number(result?.count ?? 0);
  }
}

export const bankAccountRepository = new BankAccountRepository();
