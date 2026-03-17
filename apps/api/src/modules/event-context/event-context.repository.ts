import { db } from '../../infrastructure/database.js';

export class EventContextRepository {
  async create(data: {
    booking_id: string;
    submitted_by: string;
    crowd_size_estimate: number;
    crowd_energy: string;
    primary_age_group: string;
    secondary_age_group?: string;
    gender_ratio_male_pct: number;
    vibe_tags: string[];
    genre_reception: Record<string, number>;
    set_highlights?: string;
    would_rebook_artist: boolean;
    venue_acoustics_rating?: number;
    venue_crowd_flow_rating?: number;
    audience_requests: string[];
    weather_conditions?: string;
  }) {
    const [row] = await db('event_context_data')
      .insert({
        booking_id: data.booking_id,
        submitted_by: data.submitted_by,
        crowd_size_estimate: data.crowd_size_estimate,
        crowd_energy: data.crowd_energy,
        primary_age_group: data.primary_age_group,
        secondary_age_group: data.secondary_age_group || null,
        gender_ratio_male_pct: data.gender_ratio_male_pct,
        vibe_tags: data.vibe_tags,
        genre_reception: JSON.stringify(data.genre_reception),
        set_highlights: data.set_highlights || null,
        would_rebook_artist: data.would_rebook_artist,
        venue_acoustics_rating: data.venue_acoustics_rating || null,
        venue_crowd_flow_rating: data.venue_crowd_flow_rating || null,
        audience_requests: data.audience_requests,
        weather_conditions: data.weather_conditions || null,
      })
      .returning('*');
    return row;
  }

  async findByBookingId(bookingId: string) {
    return db('event_context_data').where({ booking_id: bookingId }).first();
  }

  async getAggregatedStats(filters: { city?: string; genre?: string; event_type?: string }) {
    let query = db('event_context_data as ec')
      .join('bookings as b', 'ec.booking_id', 'b.id')
      .select(
        db.raw('COUNT(*)::int as total_submissions'),
        db.raw('AVG(ec.crowd_size_estimate)::int as avg_crowd_size'),
        db.raw(`
          json_build_object(
            'low', COUNT(*) FILTER (WHERE ec.crowd_energy = 'low'),
            'moderate', COUNT(*) FILTER (WHERE ec.crowd_energy = 'moderate'),
            'high', COUNT(*) FILTER (WHERE ec.crowd_energy = 'high'),
            'electric', COUNT(*) FILTER (WHERE ec.crowd_energy = 'electric')
          ) as energy_distribution
        `),
        db.raw('AVG(ec.venue_acoustics_rating) as avg_acoustics_rating'),
        db.raw('AVG(ec.venue_crowd_flow_rating) as avg_crowd_flow_rating'),
        db.raw(`COUNT(*) FILTER (WHERE ec.would_rebook_artist = true)::int as would_rebook_count`),
      );

    if (filters.city) query = query.where('b.event_city', 'ilike', `%${filters.city}%`);
    if (filters.event_type) query = query.where('b.event_type', filters.event_type);

    const [result] = await query;
    return result;
  }
}

export const eventContextRepository = new EventContextRepository();
