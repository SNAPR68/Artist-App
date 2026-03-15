import type { Knex } from 'knex';
// Seeds use faker for generating realistic test data
// Run: pnpm db:seed

const GENRES = ['Bollywood', 'Classical', 'Rock', 'Jazz', 'Electronic', 'Folk', 'Pop', 'Hip-Hop', 'Fusion', 'Sufi'];
const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Goa'];
const EVENT_TYPES = ['wedding', 'corporate', 'private_party', 'concert', 'club_gig', 'festival', 'college_event', 'restaurant'];
const LANGUAGES = ['Hindi', 'English', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi'];

function randomFrom<T>(arr: T[], count = 1): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function seed(knex: Knex): Promise<void> {
  // Clean up in reverse dependency order
  await knex('booking_events').del();
  await knex('booking_quotes').del();
  await knex('payments').del();
  await knex('reviews').del();
  await knex('shortlist_artists').del();
  await knex('shortlists').del();
  await knex('bookings').del();
  await knex('availability_calendar').del();
  await knex('media_items').del();
  await knex('artist_agent_links').del();
  await knex('agent_profiles').del();
  await knex('client_profiles').del();
  await knex('artist_profiles').del();
  await knex('users').del();

  // ─── Create 100 Artist Users + Profiles ────────────────────
  const artistUsers: { id: string; phone_hash: string }[] = [];
  for (let i = 0; i < 100; i++) {
    const phone = `9${randomInt(100000000, 999999999)}`;
    const [user] = await knex('users').insert({
      phone: phone,
      phone_hash: `hash_${phone}`,
      role: 'artist',
      is_active: true,
    }).returning(['id', 'phone_hash']);
    artistUsers.push(user);

    const city = randomFrom(CITIES)[0];
    const genres = randomFrom(GENRES, randomInt(1, 3));
    const eventTypes = randomFrom(EVENT_TYPES, randomInt(2, 5));

    const pricing = eventTypes.map((et) => ({
      event_type: et,
      city_tier: 'tier_1',
      min_price: randomInt(2000, 10000) * 100, // paise
      max_price: randomInt(10000, 50000) * 100,
      travel_surcharge: randomInt(0, 5000) * 100,
    }));

    await knex('artist_profiles').insert({
      user_id: user.id,
      stage_name: `Artist ${i + 1}`,
      bio: `Professional performer based in ${city} specializing in ${genres.join(', ')}`,
      genres: genres,
      languages: randomFrom(LANGUAGES, randomInt(1, 3)),
      base_city: city,
      travel_radius_km: randomInt(50, 500),
      event_types: eventTypes,
      performance_duration_min: 60,
      performance_duration_max: randomInt(120, 240),
      pricing: JSON.stringify(pricing),
      trust_score: (randomInt(30, 50) / 10).toFixed(1),
      total_bookings: randomInt(0, 50),
      acceptance_rate: (randomInt(60, 100) / 100).toFixed(2),
      avg_response_time_hours: (randomInt(1, 48) / 10).toFixed(1),
      is_verified: Math.random() > 0.3,
      profile_completion_pct: randomInt(60, 100),
    });
  }

  // ─── Create 20 Client Users + Profiles ─────────────────────
  const clientUsers: { id: string }[] = [];
  const clientTypes = ['corporate', 'wedding_planner', 'club_venue', 'individual', 'event_company'];
  for (let i = 0; i < 20; i++) {
    const phone = `8${randomInt(100000000, 999999999)}`;
    const [user] = await knex('users').insert({
      phone: phone,
      phone_hash: `hash_${phone}`,
      role: 'client',
      is_active: true,
    }).returning(['id']);
    clientUsers.push(user);

    await knex('client_profiles').insert({
      user_id: user.id,
      client_type: randomFrom(clientTypes)[0],
      company_name: i < 10 ? `Company ${i + 1}` : null,
    });
  }

  // ─── Create 5 Agent Users + Profiles ───────────────────────
  for (let i = 0; i < 5; i++) {
    const phone = `7${randomInt(100000000, 999999999)}`;
    const [user] = await knex('users').insert({
      phone: phone,
      phone_hash: `hash_${phone}`,
      role: 'agent',
      is_active: true,
    }).returning(['id']);

    await knex('agent_profiles').insert({
      user_id: user.id,
      company_name: `Agency ${i + 1}`,
      commission_rate: randomInt(5, 15),
      total_artists: randomInt(5, 20),
    });
  }

  // ─── Create 1 Admin User ──────────────────────────────────
  await knex('users').insert({
    phone: '9999999999',
    phone_hash: 'hash_9999999999',
    role: 'admin',
    is_active: true,
  });

  console.log('Seed data inserted: 100 artists, 20 clients, 5 agents, 1 admin');
}
