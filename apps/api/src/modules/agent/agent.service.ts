import { agentRepository } from './agent.repository.js';
import { artistRepository } from '../artist/artist.repository.js';

export class AgentService {
  async createProfile(userId: string, data: {
    agency_name: string;
    contact_person: string;
    phone: string;
    email: string;
    city: string;
    commission_pct?: number;
    bio?: string;
  }) {
    const existing = await agentRepository.findByUserId(userId);
    if (existing) {
      throw new AgentError('ALREADY_EXISTS', 'Agent profile already exists', 409);
    }

    return agentRepository.create({ user_id: userId, ...data });
  }

  async getProfile(userId: string) {
    const profile = await agentRepository.findByUserId(userId);
    if (!profile) {
      throw new AgentError('NOT_FOUND', 'Agent profile not found', 404);
    }
    return profile;
  }

  async updateProfile(userId: string, data: Record<string, unknown>) {
    const profile = await agentRepository.findByUserId(userId);
    if (!profile) {
      throw new AgentError('NOT_FOUND', 'Agent profile not found', 404);
    }
    return agentRepository.update(profile.id, data);
  }

  async getRoster(userId: string) {
    const profile = await agentRepository.findByUserId(userId);
    if (!profile) {
      throw new AgentError('NOT_FOUND', 'Agent profile not found', 404);
    }
    return agentRepository.getRoster(profile.id);
  }

  async addArtistToRoster(userId: string, artistId: string) {
    const profile = await agentRepository.findByUserId(userId);
    if (!profile) {
      throw new AgentError('NOT_FOUND', 'Agent profile not found', 404);
    }

    const artist = await artistRepository.findById(artistId);
    if (!artist) {
      throw new AgentError('ARTIST_NOT_FOUND', 'Artist not found', 404);
    }

    const existingLink = await agentRepository.findLink(profile.id, artistId);
    if (existingLink) {
      throw new AgentError('ALREADY_LINKED', 'Artist is already in your roster', 409);
    }

    return agentRepository.addToRoster(profile.id, artistId);
  }

  async removeArtistFromRoster(userId: string, artistId: string) {
    const profile = await agentRepository.findByUserId(userId);
    if (!profile) {
      throw new AgentError('NOT_FOUND', 'Agent profile not found', 404);
    }

    const link = await agentRepository.findLink(profile.id, artistId);
    if (!link) {
      throw new AgentError('NOT_LINKED', 'Artist is not in your roster', 404);
    }

    await agentRepository.removeFromRoster(profile.id, artistId);
    return { removed: true };
  }

  async getCommissionDashboard(userId: string) {
    const profile = await agentRepository.findByUserId(userId);
    if (!profile) {
      throw new AgentError('NOT_FOUND', 'Agent profile not found', 404);
    }

    const commissionPct = Number(profile.commission_pct ?? 10);
    return agentRepository.getCommissionSummary(profile.id, commissionPct);
  }

  async getCommissionHistory(userId: string, limit?: number, offset?: number) {
    const profile = await agentRepository.findByUserId(userId);
    if (!profile) {
      throw new AgentError('NOT_FOUND', 'Agent profile not found', 404);
    }

    const commissionPct = Number(profile.commission_pct ?? 10);
    return agentRepository.getCommissionHistory(profile.id, commissionPct, limit, offset);
  }

  async getRosterPerformance(userId: string) {
    const profile = await agentRepository.findByUserId(userId);
    if (!profile) {
      throw new AgentError('NOT_FOUND', 'Agent profile not found', 404);
    }

    return agentRepository.getRosterPerformance(profile.id);
  }
}

export class AgentError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

export const agentService = new AgentService();
