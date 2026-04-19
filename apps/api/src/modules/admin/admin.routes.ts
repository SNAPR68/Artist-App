import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission, requireRole } from '../../middleware/rbac.middleware.js';
import { db } from '../../infrastructure/database.js';
import { hashForSearch, encryptPII } from '../../infrastructure/encryption.js';
import { UserRole } from '@artist-booking/shared';
import { workspaceRepository } from '../workspace/workspace.repository.js';

export async function adminRoutes(app: FastifyInstance) {

  /**
   * POST /v1/admin/setup-demo-users — Create demo users with proper HMAC hashes
   * Creates client, event_company, agent, admin users with known phone numbers.
   * Idempotent: skips users that already exist with the correct role.
   */
  app.post('/v1/admin/setup-demo-users', {
    preHandler: [authMiddleware, requireRole(UserRole.ADMIN)],
  }, async (_request, reply) => {
    const demoUsers = [
      { phone: '9876543211', role: 'client', profileType: 'client', companyName: 'Kapoor Wedding Studio', clientType: 'wedding_planner' },
      { phone: '9876543212', role: 'event_company', profileType: 'client', companyName: 'StarLight Events Pvt Ltd', clientType: 'event_company' },
      { phone: '9876543213', role: 'agent', profileType: 'agent', companyName: 'Prime Talent Agency' },
      { phone: '9876543214', role: 'admin', profileType: null },
    ];

    const results: Record<string, string> = {};

    for (const demo of demoUsers) {
      const phoneHash = hashForSearch(demo.phone);
      const encrypted = encryptPII(demo.phone);

      // Check if user already exists with correct role
      const existing = await db('users').where({ phone_hash: phoneHash }).first();
      if (existing && existing.role === demo.role) {
        results[demo.phone] = `already exists as ${demo.role} (${existing.id})`;
        continue;
      }

      // If user exists but with wrong role (seed collision), update role
      if (existing && existing.role !== demo.role) {
        await db('users').where({ id: existing.id }).update({ role: demo.role });

        // Clean up old profile and create correct one
        await db('artist_profiles').where({ user_id: existing.id }).del().catch(() => {});
        await db('client_profiles').where({ user_id: existing.id }).del().catch(() => {});
        await db('agent_profiles').where({ user_id: existing.id }).del().catch(() => {});

        if (demo.profileType === 'client') {
          await db('client_profiles').insert({
            user_id: existing.id,
            client_type: demo.clientType,
            company_name: demo.companyName,
          });
        } else if (demo.profileType === 'agent') {
          await db('agent_profiles').insert({
            user_id: existing.id,
            company_name: demo.companyName,
            commission_rate: 10,
            total_artists: 15,
          });
        }

        results[demo.phone] = `updated role to ${demo.role} (${existing.id})`;
        continue;
      }

      // Also check for users with hash_ prefix (from migration)
      const hashPrefixed = await db('users').where({ phone_hash: `hash_${demo.phone}` }).first();
      if (hashPrefixed) {
        await db('users').where({ id: hashPrefixed.id }).update({
          phone: encrypted,
          phone_hash: phoneHash,
          role: demo.role,
        });
        results[demo.phone] = `fixed hash and role for ${demo.role} (${hashPrefixed.id})`;
        continue;
      }

      // Create new user
      const [user] = await db('users').insert({
        phone: encrypted,
        phone_hash: phoneHash,
        role: demo.role,
        is_active: true,
      }).returning(['id']);

      if (demo.profileType === 'client') {
        await db('client_profiles').insert({
          user_id: user.id,
          client_type: demo.clientType,
          company_name: demo.companyName,
        });
      } else if (demo.profileType === 'agent') {
        await db('agent_profiles').insert({
          user_id: user.id,
          company_name: demo.companyName,
          commission_rate: 10,
          total_artists: 15,
        });
      }

      results[demo.phone] = `created as ${demo.role} (${user.id})`;
    }

    // Set up workspace for event_company user if missing
    const ecHash = hashForSearch('9876543212');
    const ecUser = await db('users').where({ phone_hash: ecHash }).first();
    if (ecUser) {
      const existingWs = await db('workspaces').where({ owner_user_id: ecUser.id }).first();
      if (!existingWs) {
        const [ws] = await db('workspaces').insert({
          name: 'StarLight Events',
          slug: `starlight-events-${Date.now()}`,
          owner_user_id: ecUser.id,
          brand_color: '#E67E22',
          description: 'Premium event management for weddings, corporate, and private events',
          city: 'Mumbai',
          company_type: 'event_management',
          is_active: true,
        }).returning(['id']);

        await db('workspace_members').insert({
          workspace_id: ws.id,
          user_id: ecUser.id,
          role: 'owner',
          is_active: true,
        });

        const events = [
          { name: 'Sharma-Patel Wedding', event_type: 'wedding', event_city: 'Mumbai', guest_count: 300, status: 'planning', client_name: 'Mrs. Sharma' },
          { name: 'TechCorp Annual Gala', event_type: 'corporate', event_city: 'Delhi', guest_count: 200, status: 'confirmed', client_name: 'Rajesh Mehta' },
          { name: 'Mehra Birthday Bash', event_type: 'private_party', event_city: 'Jaipur', guest_count: 100, status: 'planning', client_name: 'Arun Mehra' },
        ];

        for (let i = 0; i < events.length; i++) {
          const eventDate = new Date(Date.now() + (30 + i * 15) * 86400000);
          await db('workspace_events').insert({
            workspace_id: ws.id,
            ...events[i],
            event_date: eventDate.toISOString().split('T')[0],
            budget_min_paise: [300000000, 200000000, 100000000][i],
            budget_max_paise: [500000000, 300000000, 150000000][i],
            created_by: ecUser.id,
          });
        }

        results['workspace'] = `created StarLight Events workspace with 3 events`;
      } else {
        results['workspace'] = `already exists (${existingWs.id})`;
      }
    }

    return reply.send({ success: true, data: results, errors: [] });
  });

  /**
   * POST /v1/admin/fix-seed-hashes — One-time fix for seed data phone hashes
   * Regenerates phone_hash for all users whose phone_hash starts with 'hash_'
   */
  app.post('/v1/admin/fix-seed-hashes', {
    preHandler: [authMiddleware, requireRole(UserRole.ADMIN)],
  }, async (_request, reply) => {
    // Step 1: Delete orphan users (no profile linked)
    const orphanIds: any[] = await db('users')
      .where('id', 'not in', db.raw(
        'SELECT user_id FROM artist_profiles UNION SELECT user_id FROM client_profiles UNION SELECT user_id FROM agent_profiles'
      ))
      .select('id');

    let deleted = 0;
    for (const row of orphanIds) {
      try {
        await db('refresh_tokens').where({ user_id: row.id }).del().catch(() => {});
        await db('users').where({ id: row.id }).del();
        deleted++;
      } catch { /* skip FK errors */ }
    }

    // Step 2: Fix remaining users with plain-text phones
    const allUsers: any[] = await db('users').select('id', 'phone', 'phone_hash');
    let fixed = 0;
    for (const user of allUsers) {
      if (user.phone && /^\d{10}$/.test(user.phone)) {
        const correctHash = hashForSearch(user.phone);
        const encrypted = encryptPII(user.phone);
        await db('users').where({ id: user.id }).update({ phone_hash: correctHash, phone: encrypted });
        fixed++;
      }
    }

    return reply.send({ success: true, data: { orphans_deleted: deleted, hashes_fixed: fixed }, errors: [] });
  });
  /**
   * GET /v1/admin/users — List all users with profiles
   */
  app.get('/v1/admin/users', {
    preHandler: [authMiddleware, requirePermission('admin:users')],
  }, async (request, reply) => {
    const query = request.query as { role?: string; page?: string; per_page?: string; search?: string };
    const page = parseInt(query.page ?? '1', 10);
    const perPage = Math.min(parseInt(query.per_page ?? '50', 10), 100);
    const offset = (page - 1) * perPage;

    let q = db('users as u')
      .leftJoin('artist_profiles as ap', 'ap.user_id', 'u.id')
      .leftJoin('client_profiles as cp', 'cp.user_id', 'u.id')
      .where('u.deleted_at', null)
      .select(
        'u.id',
        'u.role',
        'u.is_active',
        'u.created_at',
        'ap.stage_name',
        'ap.base_city',
        'ap.is_verified',
        'ap.trust_score',
        'ap.total_bookings',
        'cp.company_name',
      )
      .orderBy('u.created_at', 'desc');

    if (query.role) {
      q = q.where('u.role', query.role);
    }

    if (query.search) {
      q = q.where(function () {
        this.whereILike('ap.stage_name', `%${query.search}%`)
          .orWhereILike('cp.company_name', `%${query.search}%`);
      });
    }

    const [countResult]: any[] = await q.clone().clearSelect().clearOrder().count('u.id as total');
    const users = await q.limit(perPage).offset(offset);

    return reply.send({
      success: true,
      data: users,
      pagination: {
        page,
        per_page: perPage,
        total: parseInt(String(countResult.total), 10),
      },
      errors: [],
    });
  });

  /**
   * POST /v1/admin/artists/:id/verify — Toggle artist verification
   */
  app.post('/v1/admin/artists/:id/verify', {
    preHandler: [authMiddleware, requirePermission('admin:moderate')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { is_verified } = request.body as { is_verified: boolean };

    const [updated] = await db('artist_profiles')
      .where({ id })
      .update({ is_verified, updated_at: new Date() })
      .returning(['id', 'stage_name', 'is_verified']);

    if (!updated) {
      return reply.status(404).send({
        success: false,
        data: null,
        errors: [{ code: 'NOT_FOUND', message: 'Artist profile not found' }],
      });
    }

    return reply.send({
      success: true,
      data: updated,
      errors: [],
    });
  });

  /**
   * POST /v1/admin/users/:id/suspend — Toggle user active status
   */
  app.post('/v1/admin/users/:id/suspend', {
    preHandler: [authMiddleware, requirePermission('admin:moderate')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { is_active } = request.body as { is_active: boolean };

    const [updated] = await db('users')
      .where({ id })
      .update({ is_active, updated_at: new Date() })
      .returning(['id', 'role', 'is_active']);

    if (!updated) {
      return reply.status(404).send({
        success: false,
        data: null,
        errors: [{ code: 'NOT_FOUND', message: 'User not found' }],
      });
    }

    return reply.send({
      success: true,
      data: updated,
      errors: [],
    });
  });

  /**
   * GET /v1/admin/payments — Payment overview for admin
   */
  app.get('/v1/admin/payments', {
    preHandler: [authMiddleware, requirePermission('admin:payments')],
  }, async (request, reply) => {
    const query = request.query as { status?: string; page?: string; per_page?: string };
    const page = parseInt(query.page ?? '1', 10);
    const perPage = Math.min(parseInt(query.per_page ?? '50', 10), 100);
    const offset = (page - 1) * perPage;

    let q = db('payments as p')
      .join('bookings as b', 'b.id', 'p.booking_id')
      .leftJoin('artist_profiles as ap', 'ap.id', 'b.artist_id')
      .leftJoin('client_profiles as cp', 'cp.user_id', 'b.client_id')
      .select(
        'p.id',
        'p.booking_id',
        'p.razorpay_order_id',
        'p.razorpay_payment_id',
        'p.amount',
        'p.platform_fee',
        'p.status',
        'p.created_at',
        'ap.stage_name as artist_name',
        'cp.company_name as client_name',
      )
      .orderBy('p.created_at', 'desc');

    if (query.status) {
      q = q.where('p.status', query.status);
    }

    const [countResult]: any[] = await q.clone().clearSelect().clearOrder().count('p.id as total');
    const payments = await q.limit(perPage).offset(offset);

    // Summary stats
    const [stats]: any[] = await db('payments')
      .select(
        db.raw('COUNT(*) as total_count'),
        db.raw('COALESCE(SUM(amount), 0) as total_amount_paise'),
        db.raw('COALESCE(SUM(platform_fee), 0) as total_platform_fee_paise'),
        db.raw("COALESCE(SUM(CASE WHEN status = 'captured' THEN amount ELSE 0 END), 0) as captured_amount_paise"),
        db.raw("COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END), 0) as refunded_amount_paise"),
      );

    return reply.send({
      success: true,
      data: {
        payments,
        stats: {
          total_count: parseInt(String(stats.total_count), 10),
          total_amount_paise: parseInt(String(stats.total_amount_paise), 10),
          total_platform_fee_paise: parseInt(String(stats.total_platform_fee_paise), 10),
          captured_amount_paise: parseInt(String(stats.captured_amount_paise), 10),
          refunded_amount_paise: parseInt(String(stats.refunded_amount_paise), 10),
        },
      },
      pagination: {
        page,
        per_page: perPage,
        total: parseInt(String(countResult.total), 10),
      },
      errors: [],
    });
  });

  /**
   * GET /v1/admin/stats — Platform-wide dashboard stats
   */
  app.get('/v1/admin/stats', {
    preHandler: [authMiddleware, requirePermission('admin:users')],
  }, async (_request, reply) => {
    const [userStats]: any[] = await db('users')
      .where('deleted_at', null)
      .select(
        db.raw('COUNT(*) as total_users'),
        db.raw("COUNT(*) FILTER (WHERE role = 'artist') as total_artists"),
        db.raw("COUNT(*) FILTER (WHERE role = 'client') as total_clients"),
        db.raw("COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_this_week"),
      );

    const [bookingStats]: any[] = await db('bookings')
      .where('deleted_at', null)
      .select(
        db.raw('COUNT(*) as total_bookings'),
        db.raw("COUNT(*) FILTER (WHERE state = 'confirmed') as confirmed"),
        db.raw("COUNT(*) FILTER (WHERE state = 'completed') as completed"),
        db.raw("COUNT(*) FILTER (WHERE state = 'cancelled') as cancelled"),
      );

    const [verifiedCount]: any[] = await db('artist_profiles')
      .where({ is_verified: true })
      .count('id as count');

    return reply.send({
      success: true,
      data: {
        users: {
          total: parseInt(String(userStats.total_users), 10),
          artists: parseInt(String(userStats.total_artists), 10),
          clients: parseInt(String(userStats.total_clients), 10),
          new_this_week: parseInt(String(userStats.new_this_week), 10),
        },
        bookings: {
          total: parseInt(String(bookingStats.total_bookings), 10),
          confirmed: parseInt(String(bookingStats.confirmed), 10),
          completed: parseInt(String(bookingStats.completed), 10),
          cancelled: parseInt(String(bookingStats.cancelled), 10),
        },
        verified_artists: parseInt(String(verifiedCount.count), 10),
      },
      errors: [],
    });
  });

  /**
   * POST /v1/admin/workspaces/:id/white-label — Toggle white-label tier for an agency.
   * When enabled, the workspace's proposals, portal, and WhatsApp templates hide
   * GRID branding. Optional custom_domain for future DNS mapping.
   */
  app.post<{ Params: { id: string }; Body: { enabled: boolean; custom_domain?: string | null } }>(
    '/v1/admin/workspaces/:id/white-label',
    { preHandler: [authMiddleware, requireRole(UserRole.ADMIN)] },
    async (request, reply) => {
      const { id } = request.params;
      const { enabled, custom_domain } = request.body ?? { enabled: false };
      const updated = await workspaceRepository.setWhiteLabel(id, !!enabled, custom_domain ?? null);
      return reply.send({ success: true, data: updated, errors: [] });
    },
  );
}
