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
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import {
  VendorCategory,
  PAGINATION,
  getAttributesSchemaForCategory,
} from '@artist-booking/shared';

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
}
