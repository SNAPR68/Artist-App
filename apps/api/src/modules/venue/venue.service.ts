import { venueRepository } from './venue.repository.js';

class VenueError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'VenueError';
  }
}

function generateSlug(name: string, city: string): string {
  const base = `${name}-${city}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

export class VenueService {
  async createVenue(userId: string, data: Record<string, unknown>) {
    const slug = generateSlug(data.name as string, data.city as string);
    return venueRepository.create({
      ...data,
      slug,
      created_by: userId,
      photos: JSON.stringify(data.photos || []),
    });
  }

  async getVenue(id: string) {
    const venue = await venueRepository.findById(id);
    if (!venue) throw new VenueError('NOT_FOUND', 'Venue not found', 404);

    const equipment = await venueRepository.getEquipment(id);
    return { ...venue, equipment };
  }

  async updateVenue(id: string, data: Record<string, unknown>) {
    const venue = await venueRepository.findById(id);
    if (!venue) throw new VenueError('NOT_FOUND', 'Venue not found', 404);

    if (data.photos) data.photos = JSON.stringify(data.photos);
    return venueRepository.update(id, data);
  }

  async searchVenues(filters: {
    q?: string;
    city?: string;
    venue_type?: string;
    capacity_min?: number;
    capacity_max?: number;
    has_green_room?: boolean;
    has_parking?: boolean;
    indoor?: boolean;
    page: number;
    per_page: number;
  }) {
    return venueRepository.search(filters);
  }

  async addEquipment(venueId: string, data: Record<string, unknown>) {
    const venue = await venueRepository.findById(venueId);
    if (!venue) throw new VenueError('NOT_FOUND', 'Venue not found', 404);

    return venueRepository.addEquipment({ venue_id: venueId, ...data });
  }

  async removeEquipment(venueId: string, equipmentId: string) {
    const venue = await venueRepository.findById(venueId);
    if (!venue) throw new VenueError('NOT_FOUND', 'Venue not found', 404);

    const deleted = await venueRepository.removeEquipment(equipmentId, venueId);
    if (!deleted) throw new VenueError('NOT_FOUND', 'Equipment not found', 404);
    return { deleted: true };
  }
}

export const venueService = new VenueService();
