import type { Knex } from 'knex';

/**
 * Add demo users with known phone numbers for testing/demo.
 * Phone hashes use placeholder 'hash_' prefix — call POST /v1/admin/fix-seed-hashes to fix.
 *
 * Demo credentials (all use OTP 123456):
 * - Artist:        9876543210 (already exists as DJ Arjun)
 * - Client:        9876543211 → Kapoor Wedding Studio
 * - Event Company: 9876543212 → StarLight Events Pvt Ltd
 * - Agent:         9876543213 → Prime Talent Agency
 * - Admin:         9876543214
 */
export async function up(knex: Knex): Promise<void> {
  // ─── Client Demo User ──────────────────────────────────────
  const existingClient = await knex('users').where('phone_hash', 'hash_9876543211').first();
  if (!existingClient) {
    const [clientUser] = await knex('users').insert({
      phone: '9876543211',
      phone_hash: 'hash_9876543211',
      role: 'client',
      is_active: true,
    }).returning(['id']);

    await knex('client_profiles').insert({
      user_id: clientUser.id,
      client_type: 'wedding_planner',
      company_name: 'Kapoor Wedding Studio',
    });
  }

  // ─── Event Company Demo User ───────────────────────────────
  const existingEC = await knex('users').where('phone_hash', 'hash_9876543212').first();
  if (!existingEC) {
    const [ecUser] = await knex('users').insert({
      phone: '9876543212',
      phone_hash: 'hash_9876543212',
      role: 'event_company',
      is_active: true,
    }).returning(['id']);

    await knex('client_profiles').insert({
      user_id: ecUser.id,
      client_type: 'event_company',
      company_name: 'StarLight Events Pvt Ltd',
    });

    // Create a workspace for the event company
    const [workspace] = await knex('workspaces').insert({
      name: 'StarLight Events',
      slug: 'starlight-events',
      owner_user_id: ecUser.id,
      brand_color: '#E67E22',
      description: 'Premium event management for weddings, corporate, and private events across India',
      city: 'Mumbai',
      company_type: 'event_management',
      is_active: true,
    }).returning(['id']);

    // Add workspace member (owner)
    await knex('workspace_members').insert({
      workspace_id: workspace.id,
      user_id: ecUser.id,
      role: 'owner',
      is_active: true,
    });

    // Create workspace events
    const events = [
      {
        name: 'Sharma-Patel Wedding',
        event_type: 'wedding',
        event_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        event_city: 'Mumbai',
        guest_count: 300,
        budget_min_paise: 300000000,
        budget_max_paise: 500000000,
        status: 'planning',
        client_name: 'Mrs. Sharma',
        client_phone: '9800000001',
        notes: 'Grand Sangeet + Reception. Need Bollywood band + DJ. Outdoor venue.',
      },
      {
        name: 'TechCorp Annual Gala',
        event_type: 'corporate',
        event_date: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
        event_city: 'Delhi',
        guest_count: 200,
        budget_min_paise: 200000000,
        budget_max_paise: 300000000,
        status: 'confirmed',
        client_name: 'Rajesh Mehta (TechCorp)',
        client_phone: '9800000002',
        notes: 'Jazz quartet + stand-up comedian. Indoor ballroom.',
      },
      {
        name: 'Mehra Birthday Celebration',
        event_type: 'private_party',
        event_date: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
        event_city: 'Jaipur',
        guest_count: 100,
        budget_min_paise: 100000000,
        budget_max_paise: 150000000,
        status: 'planning',
        client_name: 'Arun Mehra',
        client_phone: '9800000003',
        notes: 'Acoustic + Sufi singer. Intimate garden party.',
      },
    ];

    for (const event of events) {
      await knex('workspace_events').insert({
        workspace_id: workspace.id,
        ...event,
        created_by: ecUser.id,
      });
    }
  }

  // ─── Agent Demo User ───────────────────────────────────────
  const existingAgent = await knex('users').where('phone_hash', 'hash_9876543213').first();
  if (!existingAgent) {
    const [agentUser] = await knex('users').insert({
      phone: '9876543213',
      phone_hash: 'hash_9876543213',
      role: 'agent',
      is_active: true,
    }).returning(['id']);

    await knex('agent_profiles').insert({
      user_id: agentUser.id,
      company_name: 'Prime Talent Agency',
      commission_rate: 10,
      total_artists: 15,
    });
  }

  // ─── Admin Demo User (if not already existing) ─────────────
  const existingAdmin = await knex('users').where('phone_hash', 'hash_9876543214').first();
  if (!existingAdmin) {
    await knex('users').insert({
      phone: '9876543214',
      phone_hash: 'hash_9876543214',
      role: 'admin',
      is_active: true,
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const demoHashes = [
    'hash_9876543211',
    'hash_9876543212',
    'hash_9876543213',
    'hash_9876543214',
  ];

  for (const hash of demoHashes) {
    const user = await knex('users').where('phone_hash', hash).first();
    if (user) {
      await knex('workspace_events').whereIn('workspace_id',
        knex('workspaces').where('owner_user_id', user.id).select('id')
      ).del().catch(() => {});
      await knex('workspace_members').where('user_id', user.id).del().catch(() => {});
      await knex('workspaces').where('owner_user_id', user.id).del().catch(() => {});
      await knex('agent_profiles').where('user_id', user.id).del().catch(() => {});
      await knex('client_profiles').where('user_id', user.id).del().catch(() => {});
      await knex('users').where('id', user.id).del().catch(() => {});
    }
  }
}
