import type { FastifyInstance } from 'fastify';
import { seasonalDemandService, SeasonalDemandError } from './seasonal-demand.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import {
  seasonalDemandQuerySchema,
  seasonalAlertQuerySchema,
  availabilityUrgencyQuerySchema,
} from '@artist-booking/shared';

// ─── Query Parsers ───────────────────────────────────────────

function parseDemandQuery(query: unknown) {
  const raw = query as Record<string, unknown>;
  return seasonalDemandQuerySchema.parse({
    city: typeof raw.city === 'string' ? raw.city : undefined,
    genre: typeof raw.genre === 'string' ? raw.genre : undefined,
    event_type: typeof raw.event_type === 'string' ? raw.event_type : undefined,
  });
}

function parseAlertQuery(query: unknown) {
  const raw = query as Record<string, unknown>;
  return seasonalAlertQuerySchema.parse({
    is_read: raw.is_read === 'true' ? true : raw.is_read === 'false' ? false : undefined,
    limit: raw.limit ? Number(raw.limit) : undefined,
  });
}

function parseUrgencyQuery(query: unknown) {
  const raw = query as Record<string, unknown>;
  return availabilityUrgencyQuerySchema.parse({
    event_type: raw.event_type as string,
    city: raw.city as string,
    event_date: raw.event_date as string,
  });
}

// ─── Routes ──────────────────────────────────────────────────

export async function seasonalDemandRoutes(app: FastifyInstance) {
  /**
   * GET /v1/seasonal/curves — Get seasonal demand curves
   */
  app.get('/v1/seasonal/curves', {
    preHandler: [authMiddleware, requirePermission('seasonal:read_artist')],
  }, async (request, reply) => {
    try {
      const filters = parseDemandQuery(request.query);
      const data = await seasonalDemandService.getDemandCurves(filters);
      return reply.send({ success: true, data, errors: [] });
    } catch (err) {
      if (err instanceof SeasonalDemandError) {
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
   * GET /v1/seasonal/curves/:city — Get all monthly curves for a city
   */
  app.get('/v1/seasonal/curves/:city', {
    preHandler: [authMiddleware, requirePermission('seasonal:read_artist')],
  }, async (request, reply) => {
    try {
      const { city } = request.params as { city: string };
      const data = await seasonalDemandService.getCityCurves(city);
      return reply.send({ success: true, data, errors: [] });
    } catch (err) {
      if (err instanceof SeasonalDemandError) {
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
   * GET /v1/seasonal/alerts — Get seasonal alerts for the authenticated user
   */
  app.get('/v1/seasonal/alerts', {
    preHandler: [authMiddleware, requirePermission('seasonal:alerts')],
  }, async (request, reply) => {
    try {
      const filters = parseAlertQuery(request.query);
      const data = await seasonalDemandService.getAlerts(request.user!.user_id, filters);
      return reply.send({ success: true, data, errors: [] });
    } catch (err) {
      if (err instanceof SeasonalDemandError) {
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
   * POST /v1/seasonal/alerts/:id/read — Mark an alert as read
   */
  app.post('/v1/seasonal/alerts/:id/read', {
    preHandler: [authMiddleware, requirePermission('seasonal:alerts')],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = await seasonalDemandService.markAlertRead(id, request.user!.user_id);
      return reply.send({ success: true, data, errors: [] });
    } catch (err) {
      if (err instanceof SeasonalDemandError) {
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
   * GET /v1/seasonal/availability-urgency — Get availability urgency signal
   */
  app.get('/v1/seasonal/availability-urgency', {
    preHandler: [authMiddleware, requirePermission('seasonal:read_client')],
  }, async (request, reply) => {
    try {
      const params = parseUrgencyQuery(request.query);
      const data = await seasonalDemandService.getAvailabilityUrgency(
        params.event_type,
        params.city,
        params.event_date,
      );
      return reply.send({ success: true, data, errors: [] });
    } catch (err) {
      if (err instanceof SeasonalDemandError) {
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
