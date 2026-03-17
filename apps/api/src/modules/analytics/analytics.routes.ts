import type { FastifyInstance } from 'fastify';
import { failureService } from './failure.service.js';
import { priceIntelligenceService } from './price-intelligence.service.js';
import { calendarIntelligenceService } from './calendar-intelligence.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { rateLimit } from '../../middleware/rate-limiter.middleware.js';
import { recordFailureSchema, demandForecastQuerySchema, calendarIntelligenceQuerySchema } from '@artist-booking/shared';
import { db } from '../../infrastructure/database.js';

export async function analyticsRoutes(app: FastifyInstance) {
  /**
   * GET /v1/analytics/fair-price — Get fair price range
   */
  app.get('/v1/analytics/fair-price', {
    preHandler: [authMiddleware, requirePermission('analytics:fair_price'), rateLimit('SEARCH')],
  }, async (request, reply) => {
    const query = request.query as { genre?: string; city?: string; event_type?: string };
    const data = await priceIntelligenceService.getFairPriceRange(query);

    return reply.send({ success: true, data, errors: [] });
  });

  /**
   * GET /v1/analytics/city-comparison — Compare prices across cities
   */
  app.get('/v1/analytics/city-comparison', {
    preHandler: [authMiddleware, requirePermission('analytics:fair_price'), rateLimit('SEARCH')],
  }, async (request, reply) => {
    const { genre, event_type } = request.query as { genre: string; event_type: string };
    if (!genre || !event_type) {
      return reply.status(400).send({
        success: false,
        data: null,
        errors: [{ code: 'MISSING_PARAMS', message: 'genre and event_type are required' }],
      });
    }

    const data = await priceIntelligenceService.getCityComparison(genre, event_type);
    return reply.send({ success: true, data, errors: [] });
  });

  /**
   * GET /v1/analytics/supply-gaps — Admin: supply gap report
   */
  app.get('/v1/analytics/supply-gaps', {
    preHandler: [authMiddleware, requirePermission('analytics:read')],
  }, async (request, reply) => {
    const { start_date, end_date } = request.query as { start_date?: string; end_date?: string };
    const now = new Date();
    const start = start_date ?? new Date(now.getTime() - 30 * 86400000).toISOString();
    const end = end_date ?? now.toISOString();

    const data = await failureService.getSupplyGapReport(start, end);
    return reply.send({ success: true, data, errors: [] });
  });

  /**
   * GET /v1/analytics/conversion — Admin: conversion funnel
   */
  app.get('/v1/analytics/conversion', {
    preHandler: [authMiddleware, requirePermission('analytics:read')],
  }, async (request, reply) => {
    const { start_date, end_date } = request.query as { start_date?: string; end_date?: string };
    const now = new Date();
    const start = start_date ?? new Date(now.getTime() - 30 * 86400000).toISOString();
    const end = end_date ?? now.toISOString();

    const data = await failureService.getConversionFunnel(start, end);
    return reply.send({ success: true, data, errors: [] });
  });

  /**
   * POST /v1/analytics/failure — Client-side failure reporting
   */
  app.post('/v1/analytics/failure', {
    preHandler: [authMiddleware, rateLimit('WRITE')],
  }, async (request, reply) => {
    const data = recordFailureSchema.parse(request.body);
    await failureService.recordAbandonedFlow(
      request.user!.user_id,
      null,
      data.stage,
      data.metadata as Record<string, unknown> | undefined,
    );

    return reply.status(201).send({ success: true, data: { recorded: true }, errors: [] });
  });

  // ─── Calendar Intelligence ──────────────────────────────────

  /**
   * GET /v1/analytics/demand-forecast — Demand forecast by city/genre/date
   */
  app.get('/v1/analytics/demand-forecast', {
    preHandler: [authMiddleware, requirePermission('analytics:fair_price'), rateLimit('SEARCH')],
  }, async (request, reply) => {
    const filters = demandForecastQuerySchema.parse(request.query);
    const data = await calendarIntelligenceService.getDemandForecast(filters);

    return reply.send({ success: true, data, errors: [] });
  });

  /**
   * GET /v1/analytics/demand-heatmap — Admin: city x date demand heatmap
   */
  app.get('/v1/analytics/demand-heatmap', {
    preHandler: [authMiddleware, requirePermission('analytics:read')],
  }, async (_request, reply) => {
    const data = await calendarIntelligenceService.getDemandHeatmap();

    return reply.send({ success: true, data, errors: [] });
  });

  /**
   * GET /v1/artists/me/calendar-intelligence — Artist's personalized alerts
   */
  app.get('/v1/artists/me/calendar-intelligence', {
    preHandler: [authMiddleware, requirePermission('calendar_intelligence:read')],
  }, async (request, reply) => {
    const profile = await db('artist_profiles').where({ user_id: request.user!.user_id }).first();
    if (!profile) {
      return reply.status(404).send({ success: false, data: null, errors: [{ code: 'NOT_FOUND', message: 'Artist profile not found' }] });
    }

    const filters = calendarIntelligenceQuerySchema.parse(request.query);
    const result = await calendarIntelligenceService.getArtistAlerts(profile.id, filters);

    return reply.send({ success: true, data: result.data, meta: result.meta, errors: [] });
  });

  /**
   * PUT /v1/artists/me/calendar-intelligence/:alertId/read — Mark alert read
   */
  app.put('/v1/artists/me/calendar-intelligence/:alertId/read', {
    preHandler: [authMiddleware, requirePermission('calendar_intelligence:read')],
  }, async (request, reply) => {
    const { alertId } = request.params as { alertId: string };
    const profile = await db('artist_profiles').where({ user_id: request.user!.user_id }).first();
    if (!profile) {
      return reply.status(404).send({ success: false, data: null, errors: [{ code: 'NOT_FOUND', message: 'Artist profile not found' }] });
    }

    const updated = await calendarIntelligenceService.markAlertRead(alertId, profile.id);

    return reply.send({ success: true, data: updated, errors: [] });
  });
}
