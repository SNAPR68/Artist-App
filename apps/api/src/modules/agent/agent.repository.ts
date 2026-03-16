import { db } from '../../infrastructure/database.js';

export class AgentRepository {
  async findByUserId(userId: string) {
    return db('agent_profiles').where({ user_id: userId }).first();
  }

  async findById(id: string) {
    return db('agent_profiles').where({ id }).first();
  }

  async create(data: {
    user_id: string;
    agency_name: string;
    contact_person: string;
    phone: string;
    email: string;
    city: string;
    commission_pct?: number;
    bio?: string;
  }) {
    const [profile] = await db('agent_profiles').insert(data).returning('*');
    return profile;
  }

  async update(id: string, data: Record<string, unknown>) {
    const [updated] = await db('agent_profiles')
      .where({ id })
      .update({ ...data, updated_at: new Date() })
      .returning('*');
    return updated;
  }

  async getRoster(agentId: string) {
    return db('artist_agent_links as aal')
      .join('artist_profiles as ap', 'ap.id', 'aal.artist_id')
      .where('aal.agent_id', agentId)
      .where('aal.status', 'active')
      .select(
        'aal.id as link_id',
        'ap.id as artist_id',
        'ap.stage_name',
        'ap.genres',
        'ap.base_city',
        'ap.is_verified',
      );
  }

  async addToRoster(agentId: string, artistId: string) {
    const [link] = await db('artist_agent_links')
      .insert({ agent_id: agentId, artist_id: artistId, status: 'active' })
      .returning('*');
    return link;
  }

  async removeFromRoster(agentId: string, artistId: string) {
    return db('artist_agent_links')
      .where({ agent_id: agentId, artist_id: artistId })
      .delete();
  }

  async findLink(agentId: string, artistId: string) {
    return db('artist_agent_links')
      .where({ agent_id: agentId, artist_id: artistId })
      .first();
  }
}

export const agentRepository = new AgentRepository();
