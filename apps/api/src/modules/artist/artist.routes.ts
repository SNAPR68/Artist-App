import type { FastifyInstance } from 'fastify';
import { artistService } from './artist.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validateBody } from '../../middleware/validation.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import {
  createArtistProfileSchema,
  updateArtistProfileSchema,
  addBankAccountSchema,
  updateBankAccountSchema,
  PAGINATION,
} from '@artist-booking/shared';
import { bankAccountService } from './bank-account.service.js';
import { db } from '../../infrastructure/database.js';
export async function artistRoutes(app: FastifyInstance) {
  /**
   * POST /v1/artists/profile — Create artist profile
   */
  app.post('/v1/artists/profile', {
    preHandler: [
      authMiddleware,
      requirePermission('artist:create'),
      rateLimit('WRITE'),
      validateBody(createArtistProfileSchema),
    ],
  }, async (request, reply) => {
    const profile = await artistService.createProfile(request.user!.user_id, request.body as never);

    return reply.status(201).send({
      success: true,
      data: profile,
      errors: [],
    });
  });

  /**
   * GET /v1/artists/profile — Get own profile (authenticated artist)
   */
  app.get('/v1/artists/profile', {
    preHandler: [authMiddleware, requirePermission('artist:read_own')],
  }, async (request, reply) => {
    const profile = await artistService.getOwnProfile(request.user!.user_id);

    return reply.send({
      success: true,
      data: profile,
      errors: [],
    });
  });

  /**
   * PUT /v1/artists/profile — Update own profile
   */
  app.put('/v1/artists/profile', {
    preHandler: [
      authMiddleware,
      requirePermission('artist:update_own'),
      rateLimit('WRITE'),
      validateBody(updateArtistProfileSchema),
    ],
  }, async (request, reply) => {
    const profile = await artistService.updateProfile(request.user!.user_id, request.body as never);

    return reply.send({
      success: true,
      data: profile,
      errors: [],
    });
  });

  /**
   * GET /v1/artists/:id — Public artist profile
   */
  app.get('/v1/artists/:id', {
    preHandler: [rateLimit('READ')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const profile = await artistService.getPublicProfile(id);

    return reply
      .header('Cache-Control', 'public, max-age=300, s-maxage=300')
      .send({
        success: true,
        data: profile,
        errors: [],
      });
  });

  /**
   * GET /v1/artists — List artists (paginated)
   */
  app.get('/v1/artists', {
    preHandler: [rateLimit('READ')],
  }, async (request, reply) => {
    const query = request.query as Record<string, string>;
    const page = Math.max(1, parseInt(query.page ?? '1'));
    const per_page = Math.min(PAGINATION.MAX_PER_PAGE, Math.max(1, parseInt(query.per_page ?? '20')));

    const result = await artistService.listArtists({
      page,
      per_page,
      city: query.city,
      genre: query.genre,
    });

    return reply.send({
      success: true,
      data: result.data,
      meta: {
        page,
        per_page,
        total: result.total,
        total_pages: Math.ceil(result.total / per_page),
      },
      errors: [],
    });
  });

  // ─── Bank Account Routes ────────────────────────────────────

  /**
   * POST /v1/artists/bank-account — Add bank account
   */
  app.post('/v1/artists/bank-account', {
    preHandler: [
      authMiddleware,
      requirePermission('artist:update_own'),
      rateLimit('WRITE'),
      validateBody(addBankAccountSchema),
    ],
  }, async (request, reply) => {
    const account = await bankAccountService.addBankAccount(request.user!.user_id, request.body as never);

    return reply.status(201).send({
      success: true,
      data: account,
      errors: [],
    });
  });

  /**
   * GET /v1/artists/bank-account — List bank accounts
   */
  app.get('/v1/artists/bank-account', {
    preHandler: [authMiddleware, requirePermission('artist:read_own')],
  }, async (request, reply) => {
    const accounts = await bankAccountService.getBankAccounts(request.user!.user_id);

    return reply.send({
      success: true,
      data: accounts,
      errors: [],
    });
  });

  /**
   * PUT /v1/artists/bank-account/:id — Update bank account
   */
  app.put('/v1/artists/bank-account/:id', {
    preHandler: [
      authMiddleware,
      requirePermission('artist:update_own'),
      rateLimit('WRITE'),
      validateBody(updateBankAccountSchema),
    ],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const account = await bankAccountService.updateBankAccount(request.user!.user_id, id, request.body as never);

    return reply.send({
      success: true,
      data: account,
      errors: [],
    });
  });

  /**
   * DELETE /v1/artists/bank-account/:id — Delete bank account
   */
  app.delete('/v1/artists/bank-account/:id', {
    preHandler: [authMiddleware, requirePermission('artist:update_own')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await bankAccountService.deleteBankAccount(request.user!.user_id, id);

    return reply.send({
      success: true,
      data: result,
      errors: [],
    });
  });

  /**
   * GET /v1/artists/oath/signers — Public list of artists who signed the Commission-Free Oath.
   */
  app.get('/v1/artists/oath/signers', async (_request, reply) => {
    const rows = await db('artist_oath_signers as aos')
      .join('artist_profiles as ap', 'ap.id', 'aos.artist_id')
      .select('aos.id', 'ap.stage_name', 'aos.signed_at')
      .orderBy('aos.signed_at', 'desc')
      .limit(500);
    return reply.send({ success: true, data: rows, errors: [] });
  });

  /**
   * POST /v1/artists/oath/sign — Artist signs the Commission-Free Oath.
   * Idempotent — signing twice is a no-op.
   */
  app.post('/v1/artists/oath/sign', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const userId = request.user!.user_id;
    const profile = await db('artist_profiles').where({ user_id: userId }).first();
    if (!profile) {
      return reply.status(400).send({ success: false, errors: [{ code: 'NOT_ARTIST', message: 'Only artists can sign the oath' }] });
    }

    const existing = await db('artist_oath_signers').where({ artist_id: profile.id }).first();
    if (existing) return reply.send({ success: true, data: existing, errors: [] });

    const [created] = await db('artist_oath_signers').insert({
      artist_id: profile.id,
      user_id: userId,
      ip_address: (request.headers['x-forwarded-for'] as string)?.split(',')[0] ?? request.ip ?? null,
      user_agent: (request.headers['user-agent'] as string) ?? null,
    }).returning('*');

    return reply.send({ success: true, data: created, errors: [] });
  });
}
