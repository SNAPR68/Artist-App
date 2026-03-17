import { bankAccountRepository } from './bank-account.repository.js';
import { artistRepository } from './artist.repository.js';

class BankAccountError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'BankAccountError';
  }
}

export class BankAccountService {
  async addBankAccount(userId: string, data: {
    account_holder_name: string;
    account_number: string;
    ifsc_code: string;
    bank_name: string;
    upi_id?: string;
    is_primary?: boolean;
  }) {
    const artist = await artistRepository.findByUserId(userId);
    if (!artist) {
      throw new BankAccountError('ARTIST_NOT_FOUND', 'Artist profile not found', 404);
    }

    return bankAccountRepository.create({
      artist_id: artist.id,
      ...data,
    });
  }

  async getBankAccounts(userId: string) {
    const artist = await artistRepository.findByUserId(userId);
    if (!artist) {
      throw new BankAccountError('ARTIST_NOT_FOUND', 'Artist profile not found', 404);
    }

    return bankAccountRepository.findByArtistId(artist.id);
  }

  async updateBankAccount(userId: string, accountId: string, data: {
    account_holder_name?: string;
    account_number?: string;
    ifsc_code?: string;
    bank_name?: string;
    upi_id?: string;
  }) {
    const artist = await artistRepository.findByUserId(userId);
    if (!artist) {
      throw new BankAccountError('ARTIST_NOT_FOUND', 'Artist profile not found', 404);
    }

    const account = await bankAccountRepository.findById(accountId);
    if (!account || account.artist_id !== artist.id) {
      throw new BankAccountError('NOT_FOUND', 'Bank account not found', 404);
    }

    return bankAccountRepository.update(accountId, data);
  }

  async deleteBankAccount(userId: string, accountId: string) {
    const artist = await artistRepository.findByUserId(userId);
    if (!artist) {
      throw new BankAccountError('ARTIST_NOT_FOUND', 'Artist profile not found', 404);
    }

    const account = await bankAccountRepository.findById(accountId);
    if (!account || account.artist_id !== artist.id) {
      throw new BankAccountError('NOT_FOUND', 'Bank account not found', 404);
    }

    const count = await bankAccountRepository.countByArtistId(artist.id);
    if (count <= 1) {
      throw new BankAccountError('LAST_ACCOUNT', 'Cannot delete the only bank account', 400);
    }

    await bankAccountRepository.delete(accountId);

    // If deleted account was primary, set another as primary
    if (account.is_primary) {
      const remaining = await bankAccountRepository.findByArtistId(artist.id);
      if (remaining.length > 0) {
        const first = remaining[0] as Record<string, unknown>;
        await bankAccountRepository.setPrimary(first.id as string, artist.id);
      }
    }

    return { deleted: true };
  }

  async setPrimaryAccount(userId: string, accountId: string) {
    const artist = await artistRepository.findByUserId(userId);
    if (!artist) {
      throw new BankAccountError('ARTIST_NOT_FOUND', 'Artist profile not found', 404);
    }

    const account = await bankAccountRepository.findById(accountId);
    if (!account || account.artist_id !== artist.id) {
      throw new BankAccountError('NOT_FOUND', 'Bank account not found', 404);
    }

    return bankAccountRepository.setPrimary(accountId, artist.id);
  }
}

export const bankAccountService = new BankAccountService();
