import { shortlistRepository } from './shortlist.repository.js';

export class ShortlistService {
  async createShortlist(userId: string, name: string) {
    return shortlistRepository.create(userId, name);
  }

  async getUserShortlists(userId: string) {
    return shortlistRepository.findByUser(userId);
  }

  async getShortlistWithArtists(userId: string, shortlistId: string) {
    const shortlist = await shortlistRepository.findById(shortlistId);
    if (!shortlist) {
      throw new ShortlistError('NOT_FOUND', 'Shortlist not found', 404);
    }
    if (shortlist.user_id !== userId) {
      throw new ShortlistError('FORBIDDEN', 'Not your shortlist', 403);
    }

    const artists = await shortlistRepository.getArtists(shortlistId);
    return { ...shortlist, artists };
  }

  async addArtist(userId: string, shortlistId: string, artistId: string, notes?: string) {
    const shortlist = await shortlistRepository.findById(shortlistId);
    if (!shortlist) {
      throw new ShortlistError('NOT_FOUND', 'Shortlist not found', 404);
    }
    if (shortlist.user_id !== userId) {
      throw new ShortlistError('FORBIDDEN', 'Not your shortlist', 403);
    }

    return shortlistRepository.addArtist(shortlistId, artistId, notes);
  }

  async removeArtist(userId: string, shortlistId: string, artistId: string) {
    const shortlist = await shortlistRepository.findById(shortlistId);
    if (!shortlist) {
      throw new ShortlistError('NOT_FOUND', 'Shortlist not found', 404);
    }
    if (shortlist.user_id !== userId) {
      throw new ShortlistError('FORBIDDEN', 'Not your shortlist', 403);
    }

    await shortlistRepository.removeArtist(shortlistId, artistId);
  }

  async deleteShortlist(userId: string, shortlistId: string) {
    const shortlist = await shortlistRepository.findById(shortlistId);
    if (!shortlist) {
      throw new ShortlistError('NOT_FOUND', 'Shortlist not found', 404);
    }
    if (shortlist.user_id !== userId) {
      throw new ShortlistError('FORBIDDEN', 'Not your shortlist', 403);
    }

    return shortlistRepository.deleteShortlist(shortlistId);
  }
}

export class ShortlistError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'ShortlistError';
  }
}

export const shortlistService = new ShortlistService();
