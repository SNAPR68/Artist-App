import { clientRepository } from './client.repository.js';
import type { CreateClientProfileData, UpdateClientProfileData } from './client.repository.js';

export class ClientService {
  async createProfile(userId: string, data: Omit<CreateClientProfileData, 'user_id'>) {
    const existing = await clientRepository.findByUserId(userId);
    if (existing) {
      throw new ClientError('PROFILE_EXISTS', 'Client profile already exists', 409);
    }

    return clientRepository.create({ ...data, user_id: userId });
  }

  async getOwnProfile(userId: string) {
    const profile = await clientRepository.findByUserId(userId);
    if (!profile) {
      throw new ClientError('PROFILE_NOT_FOUND', 'Client profile not found', 404);
    }
    return profile;
  }

  async updateProfile(userId: string, data: UpdateClientProfileData) {
    const existing = await clientRepository.findByUserId(userId);
    if (!existing) {
      throw new ClientError('PROFILE_NOT_FOUND', 'Client profile not found', 404);
    }

    if (data.average_budget_min !== undefined && data.average_budget_max !== undefined) {
      if (data.average_budget_max < data.average_budget_min) {
        throw new ClientError('INVALID_BUDGET', 'max budget must be >= min budget', 400);
      }
    }

    return clientRepository.update(userId, data);
  }
}

export class ClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'ClientError';
  }
}

export const clientService = new ClientService();
