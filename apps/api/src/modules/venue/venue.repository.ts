import { db } from '../../infrastructure/database.js';

export class VenueRepository {
  async create(data: Record<string, unknown>) {
    const [row] = await db('venue_profiles').insert(data).returning('*');
    return row;
  }

  async findById(id: string) {
    return db('venue_profiles').where({ id, deleted_at: null }).first();
  }

  async findBySlug(slug: string) {
    return db('venue_profiles').where({ slug, deleted_at: null }).first();
  }

  async update(id: string, data: Record<string, unknown>) {
    const [row] = await db('venue_profiles')
      .where({ id })
      .update({ ...data, updated_at: new Date() })
      .returning('*');
    return row;
  }

  async search(filters: {
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
    let query = db('venue_profiles').where({ deleted_at: null }).whereNot('status', 'inactive');

    if (filters.q) {
      query = query.where((qb) => {
        qb.where('name', 'ilike', `%${filters.q}%`)
          .orWhere('address', 'ilike', `%${filters.q}%`);
      });
    }
    if (filters.city) query = query.where('city', 'ilike', `%${filters.city}%`);
    if (filters.venue_type) query = query.where('venue_type', filters.venue_type);
    if (filters.capacity_min) query = query.where('capacity_max', '>=', filters.capacity_min);
    if (filters.capacity_max) query = query.where('capacity_min', '<=', filters.capacity_max);
    if (filters.has_green_room !== undefined) query = query.where('has_green_room', filters.has_green_room);
    if (filters.has_parking !== undefined) query = query.where('has_parking', filters.has_parking);
    if (filters.indoor !== undefined) query = query.where('indoor', filters.indoor);

    const offset = (filters.page - 1) * filters.per_page;

    const [countResult] = await query.clone().count('* as total');
    const total = Number(countResult.total);

    const rows = await query
      .orderBy('total_events_hosted', 'desc')
      .limit(filters.per_page)
      .offset(offset);

    return {
      data: rows,
      meta: {
        page: filters.page,
        per_page: filters.per_page,
        total,
        total_pages: Math.ceil(total / filters.per_page),
      },
    };
  }

  // ─── Equipment ──────────────────────────────────────────────
  async addEquipment(data: Record<string, unknown>) {
    const [row] = await db('venue_equipment').insert(data).returning('*');
    return row;
  }

  async getEquipment(venueId: string) {
    return db('venue_equipment').where({ venue_id: venueId }).orderBy('category');
  }

  async removeEquipment(id: string, venueId: string) {
    return db('venue_equipment').where({ id, venue_id: venueId }).del();
  }

  async getEquipmentByCategory(venueId: string, category: string) {
    return db('venue_equipment').where({ venue_id: venueId, category });
  }
}

export const venueRepository = new VenueRepository();
