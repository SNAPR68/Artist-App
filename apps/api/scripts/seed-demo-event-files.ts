/**
 * Demo event files for pilot walkthroughs (2026-04-22).
 *
 * Seeds 3 cinematic event files covering multi-vendor complexity so a pilot
 * demo can show the full OS in action:
 *   1. Malabar Hill Wedding    (Dec 14, Mumbai)  \u2014 11 vendors, 6 categories
 *   2. Infosys Product Launch  (May 08, Bengaluru) \u2014 9 vendors, 5 categories
 *   3. Sunburn Goa Weekend     (Oct 25, Goa)    \u2014 13 vendors, 7 categories
 *
 * Idempotent: deletes prior demo files (names prefixed DEMO:) before re-seed.
 *
 * Run: tsx apps/api/scripts/seed-demo-event-files.ts
 */
import 'dotenv/config';
import { db } from '../src/infrastructure/database.js';

interface Plan {
  name: string;
  date: string;
  city: string;
  venue: string;
  call: string;
  brief: Record<string, unknown>;
  categories: Array<{ cat: string; role: string; count: number; note?: string; call_offset_min?: number }>;
}

const PLANS: Plan[] = [
  {
    name: 'DEMO: Malabar Hill Wedding',
    date: '2026-12-14',
    city: 'Mumbai',
    venue: 'Taj Mahal Palace \u2014 Ballroom',
    call: '15:00',
    brief: {
      scale: 'intimate',
      guest_count: 280,
      theme: 'Royal Indian',
      budget_tier: 'premium',
      dietary: ['vegetarian', 'jain'],
    },
    categories: [
      { cat: 'artist', role: 'Sangeet Band',    count: 1, call_offset_min: 120 },
      { cat: 'artist', role: 'DJ',              count: 1, call_offset_min: 60 },
      { cat: 'av',     role: 'Sound + Lights',  count: 2, call_offset_min: 240, note: 'Full stage rig, ~8kW' },
      { cat: 'photo',  role: 'Lead Photog',     count: 1, call_offset_min: 90 },
      { cat: 'photo',  role: 'Candid Team',     count: 1, call_offset_min: 90 },
      { cat: 'decor',  role: 'Floral + Mandap', count: 2, call_offset_min: 360, note: '6hr build-out' },
      { cat: 'transport', role: 'Guest Shuttle', count: 1, note: '3x Tempo Traveller, airport pickups' },
    ],
  },
  {
    name: 'DEMO: Infosys Product Launch',
    date: '2026-05-08',
    city: 'Bengaluru',
    venue: 'Infosys Mysore Campus \u2014 Aud 1',
    call: '09:30',
    brief: {
      scale: 'corporate',
      guest_count: 600,
      theme: 'AI Futurism',
      budget_tier: 'enterprise',
      livestream: true,
    },
    categories: [
      { cat: 'av',         role: 'Broadcast AV',  count: 2, call_offset_min: 240, note: '4K multi-cam, IMAG' },
      { cat: 'photo',      role: 'Event Coverage', count: 2, call_offset_min: 60 },
      { cat: 'decor',      role: 'Stage Design',  count: 2, call_offset_min: 480, note: 'LED backdrop + truss' },
      { cat: 'artist',     role: 'Entertainment', count: 1, call_offset_min: 30, note: 'Post-keynote slot' },
      { cat: 'license',    role: 'PPL + IPRS',    count: 1, note: 'Music clearance' },
      { cat: 'transport',  role: 'VIP Transfer',  count: 1, note: '2x sedan, board-level' },
    ],
  },
  {
    name: 'DEMO: Sunburn Goa Weekend',
    date: '2026-10-25',
    city: 'Goa',
    venue: 'Vagator Hilltop \u2014 Main Stage',
    call: '14:00',
    brief: {
      scale: 'festival',
      guest_count: 18000,
      theme: 'Sunset to Sunrise',
      days: 2,
      budget_tier: 'festival',
    },
    categories: [
      { cat: 'artist',    role: 'Headliner',       count: 3, call_offset_min: 180 },
      { cat: 'artist',    role: 'Support Act',     count: 4, call_offset_min: 120 },
      { cat: 'av',        role: 'Main Stage Rig',  count: 2, call_offset_min: 720, note: 'Line array, intelligent lighting' },
      { cat: 'photo',     role: 'Festival Crew',   count: 2, call_offset_min: 60 },
      { cat: 'decor',     role: 'Scenic + SFX',    count: 2, call_offset_min: 600, note: 'Pyro + CO2, confetti cannons' },
      { cat: 'license',   role: 'Performance Rights', count: 1 },
      { cat: 'promoters', role: 'Ticketing',       count: 1, note: 'BookMyShow integration' },
      { cat: 'transport', role: 'Artist Transfer', count: 2, note: 'GOI airport \u2192 Vagator' },
    ],
  },
];

function minusMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m - mins;
  const wrapped = ((total % 1440) + 1440) % 1440;
  const hh = String(Math.floor(wrapped / 60)).padStart(2, '0');
  const mm = String(wrapped % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

async function pickClient(): Promise<string> {
  const row = await db('users').where('role', 'client').whereNull('deleted_at').first('id');
  if (!row) throw new Error('No client user found \u2014 run base seeds first.');
  return row.id;
}

async function pickVendors(category: string, n: number): Promise<string[]> {
  const rows = await db('artist_profiles')
    .whereNull('deleted_at')
    .where('category', category)
    .orderByRaw('random()')
    .limit(n)
    .select('id');
  if (rows.length < n) {
    console.warn(`  \u26a0  only ${rows.length}/${n} vendors available in category=${category}`);
  }
  return rows.map((r: any) => r.id);
}

async function main() {
  const clientId = await pickClient();
  console.log(`Using client_id=${clientId}`);

  const priorIds = await db('event_files')
    .where('event_name', 'like', 'DEMO:%')
    .pluck('id');
  if (priorIds.length) {
    await db('event_file_vendors').whereIn('event_file_id', priorIds).del();
    await db('event_files').whereIn('id', priorIds).del();
    console.log(`Cleared ${priorIds.length} prior demo event file(s)`);
  }

  for (const plan of PLANS) {
    const [ef] = await db('event_files')
      .insert({
        client_id: clientId,
        event_name: plan.name,
        event_date: plan.date,
        call_time: plan.call,
        city: plan.city,
        venue: plan.venue,
        brief: JSON.stringify(plan.brief),
        status: 'confirmed',
      })
      .returning(['id', 'event_name']);
    console.log(`\n\u2713 ${ef.event_name} (${ef.id})`);

    let vendorsInserted = 0;
    for (const c of plan.categories) {
      const ids = await pickVendors(c.cat, c.count);
      for (const vid of ids) {
        // unique constraint: (event_file_id, vendor_profile_id, role). Suffix role per slot.
        const roleSlot = c.count === 1 ? c.role : `${c.role} #${ids.indexOf(vid) + 1}`;
        const callOverride = c.call_offset_min ? minusMinutes(plan.call, c.call_offset_min) : null;
        await db('event_file_vendors').insert({
          event_file_id: ef.id,
          vendor_profile_id: vid,
          role: roleSlot,
          call_time_override: callOverride,
          notes: c.note ?? null,
        }).onConflict(['event_file_id', 'vendor_profile_id', 'role']).ignore();
        vendorsInserted++;
      }
    }
    console.log(`  \u2192 ${vendorsInserted} vendor slot(s) across ${plan.categories.length} categories`);
  }

  console.log('\nDone.');
  await db.destroy();
}

main().catch(async (err) => {
  console.error('SEED FAILED:', err);
  await db.destroy().catch(() => {});
  process.exit(1);
});
