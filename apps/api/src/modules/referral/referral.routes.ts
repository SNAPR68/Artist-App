import type { FastifyInstance } from 'fastify';
import { db } from '../../infrastructure/database.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import { randomBytes } from 'crypto';

const REFERRAL_CREDIT_PAISE = 50000_00; // ₹500 credit per successful referral

function generateCode(): string {
  return randomBytes(4).toString('hex').toUpperCase(); // e.g. "A3F2B1C4"
}

export async function referralRoutes(app: FastifyInstance) {
  /**
   * GET /v1/referral — Get referral code + stats for the caller's first workspace.
   */
  app.get('/v1/referral', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const ws = await db('workspaces')
      .where({ owner_user_id: request.user!.user_id, is_active: true })
      .orderBy('created_at', 'asc')
      .first();

    if (!ws) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NO_WORKSPACE', message: 'No workspace found' }],
      });
    }

    // Auto-generate code if missing
    let code = ws.referral_code as string | null;
    if (!code) {
      code = generateCode();
      // Retry once on collision (tiny table, highly unlikely)
      try {
        await db('workspaces').where({ id: ws.id }).update({ referral_code: code });
      } catch {
        code = generateCode() + randomBytes(1).toString('hex').toUpperCase();
        await db('workspaces').where({ id: ws.id }).update({ referral_code: code });
      }
    }

    const referrals = await db('referrals')
      .where({ referrer_workspace_id: ws.id })
      .select('id', 'credit_paise', 'credit_applied_at', 'created_at');

    return reply.send({
      success: true,
      data: {
        workspace_id: ws.id,
        referral_code: code,
        credits_paise: ws.referral_credits_paise ?? 0,
        referrals_count: referrals.length,
        referrals,
      },
      errors: [],
    });
  });

  /**
   * POST /v1/referral/apply — Apply a referral code at workspace creation time.
   * Body: { referral_code: string }
   * The calling user's first workspace is the "referred" side.
   */
  app.post('/v1/referral/apply', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const { referral_code } = request.body as { referral_code?: string };
    if (!referral_code) {
      return reply.status(400).send({
        success: false,
        errors: [{ code: 'MISSING_CODE', message: 'referral_code is required' }],
      });
    }

    const referrerWs = await db('workspaces')
      .whereRaw('UPPER(referral_code) = UPPER(?)', [referral_code])
      .first();

    if (!referrerWs) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'INVALID_CODE', message: 'Referral code not found' }],
      });
    }

    const referredWs = await db('workspaces')
      .where({ owner_user_id: request.user!.user_id, is_active: true })
      .orderBy('created_at', 'asc')
      .first();

    if (!referredWs) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NO_WORKSPACE', message: 'Create a workspace first' }],
      });
    }

    if (referredWs.id === referrerWs.id) {
      return reply.status(400).send({
        success: false,
        errors: [{ code: 'SELF_REFERRAL', message: 'Cannot refer yourself' }],
      });
    }

    const existing = await db('referrals').where({ referred_workspace_id: referredWs.id }).first();
    if (existing) {
      return reply.status(409).send({
        success: false,
        errors: [{ code: 'ALREADY_APPLIED', message: 'Referral code already applied to this workspace' }],
      });
    }

    await db.transaction(async (trx) => {
      await trx('referrals').insert({
        referrer_workspace_id: referrerWs.id,
        referred_workspace_id: referredWs.id,
        credit_paise: REFERRAL_CREDIT_PAISE,
        credit_applied_at: new Date(),
      });
      // Credit both sides
      await trx('workspaces').where({ id: referrerWs.id }).increment('referral_credits_paise', REFERRAL_CREDIT_PAISE);
      await trx('workspaces').where({ id: referredWs.id }).increment('referral_credits_paise', REFERRAL_CREDIT_PAISE);
    });

    return reply.status(201).send({
      success: true,
      data: { credit_paise: REFERRAL_CREDIT_PAISE },
      errors: [],
    });
  });
}
