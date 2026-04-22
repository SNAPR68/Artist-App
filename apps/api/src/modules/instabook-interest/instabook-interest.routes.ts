import type { FastifyInstance } from 'fastify';
import { instabookInterestService, InstabookInterestError } from './instabook-interest.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import { instabookInterestSchema } from '@artist-booking/shared';

export async function instabookInterestRoutes(app: FastifyInstance) {
  /**
   * POST /v1/instabook-interest — Public, no auth. Rate limited per IP.
   */
  app.post('/v1/instabook-interest', {
    preHandler: [rateLimit('INSTABOOK_INTEREST')],
  }, async (request, reply) => {
    try {
      const parsed = instabookInterestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          data: null,
          errors: parsed.error.errors.map((e) => ({
            code: 'VALIDATION_ERROR',
            message: `${e.path.join('.')}: ${e.message}`,
          })),
        });
      }

      const ipAddress = request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || request.ip;
      const userAgent = request.headers['user-agent'] || null;

      const result = await instabookInterestService.submit(parsed.data, ipAddress, userAgent);
      return reply.status(201).send({ success: true, data: result, errors: [] });
    } catch (err) {
      if (err instanceof InstabookInterestError) {
        return reply.status(err.statusCode).send({
          success: false,
          data: null,
          errors: [{ code: err.code, message: err.message }],
        });
      }
      throw err;
    }
  });

  /**
   * GET /v1/instabook-interest — Admin only. Paginated list with filters.
   */
  app.get('/v1/instabook-interest', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      // Simple admin check
      if (request.user?.role !== 'admin') {
        return reply.status(403).send({
          success: false,
          data: null,
          errors: [{ code: 'FORBIDDEN', message: 'Admin access required' }],
        });
      }

      const query = request.query as Record<string, string>;
      const page = Math.max(1, Number(query.page) || 1);
      const per_page = Math.min(100, Math.max(1, Number(query.per_page) || 20));

      const result = await instabookInterestService.list({
        page,
        per_page,
        role: query.role || undefined,
        city: query.city || undefined,
        pilot: query.pilot === 'true' ? true : undefined,
      });

      return reply.send({
        success: true,
        data: {
          items: result.rows,
          pagination: {
            page,
            per_page,
            total: result.total,
            total_pages: Math.ceil(result.total / per_page),
          },
        },
        errors: [],
      });
    } catch (err) {
      if (err instanceof InstabookInterestError) {
        return reply.status(err.statusCode).send({
          success: false,
          data: null,
          errors: [{ code: err.code, message: err.message }],
        });
      }
      throw err;
    }
  });

  /**
   * GET /v1/instabook-interest/stats — Admin only. Aggregated stats.
   */
  app.get('/v1/instabook-interest/stats', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      if (request.user?.role !== 'admin') {
        return reply.status(403).send({
          success: false,
          data: null,
          errors: [{ code: 'FORBIDDEN', message: 'Admin access required' }],
        });
      }

      const stats = await instabookInterestService.stats();
      return reply.send({ success: true, data: stats, errors: [] });
    } catch (err) {
      if (err instanceof InstabookInterestError) {
        return reply.status(err.statusCode).send({
          success: false,
          data: null,
          errors: [{ code: err.code, message: err.message }],
        });
      }
      throw err;
    }
  });
}
