import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../agent.repository.js', () => ({
  agentRepository: {
    findByUserId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    getRoster: vi.fn(),
    addToRoster: vi.fn(),
    removeFromRoster: vi.fn(),
    findLink: vi.fn(),
  },
}));

vi.mock('../../artist/artist.repository.js', () => ({
  artistRepository: {
    findById: vi.fn(),
  },
}));

import { agentRepository } from '../agent.repository.js';
import { artistRepository } from '../../artist/artist.repository.js';
import { AgentService, AgentError } from '../agent.service.js';

const mockAgentRepo = agentRepository as unknown as Record<string, ReturnType<typeof vi.fn>>;
const mockArtistRepo = artistRepository as unknown as Record<string, ReturnType<typeof vi.fn>>;

describe('AgentService', () => {
  let service: AgentService;

  beforeEach(() => {
    service = new AgentService();
    vi.clearAllMocks();
  });

  describe('createProfile', () => {
    const profileData = {
      agency_name: 'Test Agency',
      contact_person: 'John',
      phone: '9999999999',
      email: 'john@test.com',
      city: 'Mumbai',
    };

    it('should create a new agent profile', async () => {
      mockAgentRepo.findByUserId.mockResolvedValue(null);
      mockAgentRepo.create.mockResolvedValue({ id: 'agent-1', ...profileData });

      const result = await service.createProfile('user-1', profileData);
      expect(result.id).toBe('agent-1');
      expect(mockAgentRepo.create).toHaveBeenCalledWith({ user_id: 'user-1', ...profileData });
    });

    it('should reject if profile already exists', async () => {
      mockAgentRepo.findByUserId.mockResolvedValue({ id: 'agent-1' });

      await expect(service.createProfile('user-1', profileData)).rejects.toThrow(AgentError);
      await expect(service.createProfile('user-1', profileData)).rejects.toThrow('already exists');
    });
  });

  describe('getProfile', () => {
    it('should return profile when found', async () => {
      mockAgentRepo.findByUserId.mockResolvedValue({ id: 'agent-1', agency_name: 'Test' });

      const result = await service.getProfile('user-1');
      expect(result.agency_name).toBe('Test');
    });

    it('should throw NOT_FOUND when profile missing', async () => {
      mockAgentRepo.findByUserId.mockResolvedValue(null);

      await expect(service.getProfile('user-1')).rejects.toThrow('not found');
    });
  });

  describe('addArtistToRoster', () => {
    it('should add artist to roster', async () => {
      mockAgentRepo.findByUserId.mockResolvedValue({ id: 'agent-1' });
      mockArtistRepo.findById.mockResolvedValue({ id: 'artist-1' });
      mockAgentRepo.findLink.mockResolvedValue(null);
      mockAgentRepo.addToRoster.mockResolvedValue({ agent_id: 'agent-1', artist_id: 'artist-1' });

      const result = await service.addArtistToRoster('user-1', 'artist-1');
      expect(result.artist_id).toBe('artist-1');
    });

    it('should reject if artist not found', async () => {
      mockAgentRepo.findByUserId.mockResolvedValue({ id: 'agent-1' });
      mockArtistRepo.findById.mockResolvedValue(null);

      await expect(service.addArtistToRoster('user-1', 'artist-x')).rejects.toThrow('Artist not found');
    });

    it('should reject if artist already linked', async () => {
      mockAgentRepo.findByUserId.mockResolvedValue({ id: 'agent-1' });
      mockArtistRepo.findById.mockResolvedValue({ id: 'artist-1' });
      mockAgentRepo.findLink.mockResolvedValue({ id: 'link-1' });

      await expect(service.addArtistToRoster('user-1', 'artist-1')).rejects.toThrow('already in your roster');
    });
  });

  describe('removeArtistFromRoster', () => {
    it('should remove artist from roster', async () => {
      mockAgentRepo.findByUserId.mockResolvedValue({ id: 'agent-1' });
      mockAgentRepo.findLink.mockResolvedValue({ id: 'link-1' });
      mockAgentRepo.removeFromRoster.mockResolvedValue(1);

      const result = await service.removeArtistFromRoster('user-1', 'artist-1');
      expect(result.removed).toBe(true);
    });

    it('should reject if artist not in roster', async () => {
      mockAgentRepo.findByUserId.mockResolvedValue({ id: 'agent-1' });
      mockAgentRepo.findLink.mockResolvedValue(null);

      await expect(service.removeArtistFromRoster('user-1', 'artist-1')).rejects.toThrow('not in your roster');
    });
  });
});
