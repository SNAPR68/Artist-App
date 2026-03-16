import { db } from '../../infrastructure/database.js';

export interface CreateClientProfileData {
  user_id: string;
  client_type: string;
  company_name?: string;
  company_type?: string;
  city?: string;
  event_types_interested?: string[];
  average_budget_min?: number;
  average_budget_max?: number;
}

export interface UpdateClientProfileData extends Partial<Omit<CreateClientProfileData, 'user_id'>> {}

export class ClientRepository {
  async create(data: CreateClientProfileData) {
    const [profile] = await db('client_profiles')
      .insert({
        user_id: data.user_id,
        client_type: data.client_type,
        company_name: data.company_name ?? null,
        company_type: data.company_type ?? null,
        city: data.city ?? null,
        event_types_interested: data.event_types_interested ?? [],
        average_budget_min: data.average_budget_min ?? null,
        average_budget_max: data.average_budget_max ?? null,
      })
      .returning('*');
    return profile;
  }

  async findByUserId(userId: string) {
    return db('client_profiles')
      .where({ user_id: userId, deleted_at: null })
      .first();
  }

  async findById(id: string) {
    return db('client_profiles')
      .where({ id, deleted_at: null })
      .first();
  }

  async update(userId: string, data: UpdateClientProfileData) {
    const updateData: Record<string, unknown> = {};

    if (data.client_type !== undefined) updateData.client_type = data.client_type;
    if (data.company_name !== undefined) updateData.company_name = data.company_name;
    if (data.company_type !== undefined) updateData.company_type = data.company_type;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.event_types_interested !== undefined) updateData.event_types_interested = data.event_types_interested;
    if (data.average_budget_min !== undefined) updateData.average_budget_min = data.average_budget_min;
    if (data.average_budget_max !== undefined) updateData.average_budget_max = data.average_budget_max;

    const [updated] = await db('client_profiles')
      .where({ user_id: userId, deleted_at: null })
      .update(updateData)
      .returning('*');

    return updated;
  }
}

export const clientRepository = new ClientRepository();
