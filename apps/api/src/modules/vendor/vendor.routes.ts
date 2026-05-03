/**
 * Event Company OS pivot (2026-04-22) — Vendor routes.
 *
 * GET  /v1/vendors                      — List vendors (filter: category, city, page)
 * GET  /v1/vendors/:id                  — Get single vendor
 * PUT  /v1/vendors/:id/attributes       — Update category_attributes (owner only)
 *
 * Uses the shared Zod discriminated union in vendor-attributes.ts for per-category
 * validation. artist_profiles is the backing table (see vendor.repository.ts).
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { vendorRepository } from './vendor.repository.js';
import { workspaceRepository } from '../workspace/workspace.repository.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import {
  VendorCategory,
  PAGINATION,
  getAttributesSchemaForCategory,
} from '@artist-booking/shared';

const ratingScore = z.number().min(0).max(5);
const SubmitRatingBody = z.object({
  event_file_id: z.string().uuid(),
  workspace_id: z.string().uuid().optional(),
  overall: ratingScore,
  quality: ratingScore.nullable().optional(),
  punctuality: ratingScore.nullable().optional(),
  communication: ratingScore.nullable().optional(),
  professionalism: ratingScore.nullable().optional(),
  was_ontime: z.boolean().optional(),
  would_rebook: z.boolean().optional(),
  comment: z.string().max(2000).nullable().optional(),
});

const SetFlagBody = z.object({
  workspace_id: z.string().uuid().optional(),
  is_preferred: z.boolean().optional(),
  is_blacklisted: z.boolean().optional(),
  blacklist_reason: z.string().max(500).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

async function resolveWorkspaceId(
  userId: string,
  bodyWorkspaceId?: string,
): Promise<string | null> {
  if (bodyWorkspaceId) return bodyWorkspaceId;
  const list = await workspaceRepository.findByOwnerId(userId);
  return list?.[0]?.id ?? null;
}

const vendorCategoryValues = Object.values(VendorCategory) as [string, ...string[]];

export async function vendorRoutes(app: FastifyInstance) {
  /** GET /v1/vendors — list with optional category/city filter */
  app.get('/v1/vendors', {
    preHandler: [rateLimit('READ')],
  }, async (request, reply) => {
    const query = request.query as Record<string, string>;
    const page = Math.max(1, parseInt(query.page ?? '1'));
    const per_page = Math.min(
      PAGINATION.MAX_PER_PAGE,
      Math.max(1, parseInt(query.per_page ?? '20')),
    );

    let category: VendorCategory | undefined;
    if (query.category) {
      const parsed = z.enum(vendorCategoryValues).safeParse(query.category);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          errors: [{ code: 'INVALID_CATEGORY', message: `category must be one of: ${vendorCategoryValues.join(', ')}` }],
        });
      }
      category = parsed.data as VendorCategory;
    }

    const result = await vendorRepository.list({
      category,
      city: query.city,
      page,
      per_page,
    });

    return reply
      .header('Cache-Control', 'public, max-age=60, s-maxage=60')
      .send({
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

  /** GET /v1/vendors/:id */
  app.get('/v1/vendors/:id', {
    preHandler: [rateLimit('READ')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const vendor = await vendorRepository.findById(id);
    if (!vendor) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Vendor not found' }],
      });
    }
    return reply
      .header('Cache-Control', 'public, max-age=300, s-maxage=300')
      .send({ success: true, data: vendor, errors: [] });
  });

  /**
   * PUT /v1/vendors/:id/attributes — owner updates per-category attributes.
   * Body validated against the Zod schema for the vendor's category.
   */
  app.put('/v1/vendors/:id/attributes', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.user_id;

    const vendor = await vendorRepository.findById(id);
    if (!vendor) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Vendor not found' }],
      });
    }
    if (vendor.user_id !== userId) {
      return reply.status(403).send({
        success: false,
        errors: [{ code: 'FORBIDDEN', message: 'Only the vendor owner can update attributes' }],
      });
    }

    const schema = getAttributesSchemaForCategory(vendor.category as VendorCategory);
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        errors: parsed.error.issues.map((i) => ({
          code: 'INVALID_ATTRIBUTES',
          message: `${i.path.join('.') || '(root)'}: ${i.message}`,
        })),
      });
    }

    const updated = await vendorRepository.updateCategoryAttributes(
      id,
      userId,
      parsed.data,
    );

    return reply.send({ success: true, data: updated, errors: [] });
  });

  // ── Ratings ──────────────────────────────────────────────────────────────
  /** POST /v1/vendors/:id/ratings — submit a rating after an event. */
  app.post('/v1/vendors/:id/ratings', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.user_id;

    const parsed = SubmitRatingBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        errors: parsed.error.issues.map((i) => ({
          code: 'INVALID_BODY',
          message: `${i.path.join('.') || '(root)'}: ${i.message}`,
        })),
      });
    }

    const vendor = await vendorRepository.findById(id);
    if (!vendor) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Vendor not found' }],
      });
    }

    const workspaceId = await resolveWorkspaceId(userId, parsed.data.workspace_id);
    if (!workspaceId) {
      return reply.status(400).send({
        success: false,
        errors: [{ code: 'NO_WORKSPACE', message: 'No workspace found for user; pass workspace_id explicitly.' }],
      });
    }

    const row = await vendorRepository.submitRating({
      workspaceId,
      vendorProfileId: id,
      eventFileId: parsed.data.event_file_id,
      raterUserId: userId,
      overall: parsed.data.overall,
      quality: parsed.data.quality ?? null,
      punctuality: parsed.data.punctuality ?? null,
      communication: parsed.data.communication ?? null,
      professionalism: parsed.data.professionalism ?? null,
      wasOntime: parsed.data.was_ontime,
      wouldRebook: parsed.data.would_rebook,
      comment: parsed.data.comment ?? null,
    });

    return reply.status(201).send({ success: true, data: row, errors: [] });
  });

  /** GET /v1/vendors/:id/ratings — list ratings for a vendor. */
  app.get('/v1/vendors/:id/ratings', {
    preHandler: [rateLimit('READ')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as Record<string, string>;
    const limit = query.limit ? Math.min(100, Math.max(1, parseInt(query.limit))) : 20;
    const rows = await vendorRepository.listRatings(id, {
      workspaceId: query.workspace_id,
      limit,
    });
    return reply.send({ success: true, data: rows, errors: [] });
  });

  // ── Per-workspace flags (preferred / blacklist) ──────────────────────────
  /** PUT /v1/vendors/:id/flags — set workspace-scoped preferred/blacklist. */
  app.put('/v1/vendors/:id/flags', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.user_id;

    const parsed = SetFlagBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        errors: parsed.error.issues.map((i) => ({
          code: 'INVALID_BODY',
          message: `${i.path.join('.') || '(root)'}: ${i.message}`,
        })),
      });
    }

    const vendor = await vendorRepository.findById(id);
    if (!vendor) {
      return reply.status(404).send({
        success: false,
        errors: [{ code: 'NOT_FOUND', message: 'Vendor not found' }],
      });
    }

    const workspaceId = await resolveWorkspaceId(userId, parsed.data.workspace_id);
    if (!workspaceId) {
      return reply.status(400).send({
        success: false,
        errors: [{ code: 'NO_WORKSPACE', message: 'No workspace found for user; pass workspace_id explicitly.' }],
      });
    }

    const row = await vendorRepository.setWorkspaceFlag({
      workspaceId,
      vendorProfileId: id,
      flaggedBy: userId,
      isPreferred: parsed.data.is_preferred,
      isBlacklisted: parsed.data.is_blacklisted,
      blacklistReason: parsed.data.blacklist_reason ?? null,
      notes: parsed.data.notes ?? null,
    });

    return reply.send({ success: true, data: row, errors: [] });
  });

  /** GET /v1/vendors/:id/flags — get workspace-scoped flag for current user's workspace. */
  app.get('/v1/vendors/:id/flags', {
    preHandler: [authMiddleware, rateLimit('READ')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.user_id;
    const query = request.query as Record<string, string>;

    const workspaceId = await resolveWorkspaceId(userId, query.workspace_id);
    if (!workspaceId) {
      return reply.send({ success: true, data: null, errors: [] });
    }

    const row = await vendorRepository.getWorkspaceFlag(workspaceId, id);
    return reply.send({ success: true, data: row ?? null, errors: [] });
  });
}
