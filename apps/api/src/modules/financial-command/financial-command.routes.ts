import type { FastifyInstance } from 'fastify';
import { financialCommandService, FinancialCommandError } from './financial-command.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import {
  cashFlowForecastQuerySchema,
  incomeCertificateRequestSchema,
  taxSummaryQuerySchema,
} from '@artist-booking/shared';
import { FinancialPeriod } from '@artist-booking/shared';

export async function financialCommandRoutes(app: FastifyInstance) {
  // ─── Dashboard ────────────────────────────────────────────

  /**
   * GET /v1/financial/dashboard — Financial snapshot for the authenticated artist.
   */
  app.get('/v1/financial/dashboard', {
    preHandler: [authMiddleware, requirePermission('financial:read_own')],
  }, async (request, reply) => {
    try {
      const data = await financialCommandService.getFinancialDashboard(request.user!.user_id);
      return reply.send({ success: true, data, errors: [] });
    } catch (err) {
      if (err instanceof FinancialCommandError) {
        return reply.status(err.statusCode).send({
          success: false,
          data: null,
          errors: [{ code: err.code, message: err.message }],
        });
      }
      throw err;
    }
  });

  // ─── Cash Flow Forecast ───────────────────────────────────

  /**
   * GET /v1/financial/forecast — Compute and return all forecast periods.
   */
  app.get('/v1/financial/forecast', {
    preHandler: [authMiddleware, requirePermission('financial:read_own')],
  }, async (request, reply) => {
    try {
      const data = await financialCommandService.computeCashFlowForecast(request.user!.user_id);
      return reply.send({ success: true, data, errors: [] });
    } catch (err) {
      if (err instanceof FinancialCommandError) {
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
   * GET /v1/financial/forecast/:period — Get a specific forecast period.
   */
  app.get('/v1/financial/forecast/:period', {
    preHandler: [authMiddleware, requirePermission('financial:read_own')],
  }, async (request, reply) => {
    const { period } = request.params as { period: string };

    // Validate period param
    const parsed = cashFlowForecastQuerySchema.safeParse({ period });
    if (!parsed.success || !period) {
      const validPeriods = Object.values(FinancialPeriod).join(', ');
      return reply.status(400).send({
        success: false,
        data: null,
        errors: [{ code: 'INVALID_PERIOD', message: `Invalid period. Valid values: ${validPeriods}` }],
      });
    }

    try {
      const forecasts = await financialCommandService.computeCashFlowForecast(request.user!.user_id);
      const match = forecasts.find((f) => f.period_label === period);

      if (!match) {
        return reply.status(404).send({
          success: false,
          data: null,
          errors: [{ code: 'NOT_FOUND', message: `Forecast for period '${period}' not found` }],
        });
      }

      return reply.send({ success: true, data: match, errors: [] });
    } catch (err) {
      if (err instanceof FinancialCommandError) {
        return reply.status(err.statusCode).send({
          success: false,
          data: null,
          errors: [{ code: err.code, message: err.message }],
        });
      }
      throw err;
    }
  });

  // ─── Income Certificate ───────────────────────────────────

  /**
   * POST /v1/financial/income-certificate — Generate an income certificate.
   */
  app.post('/v1/financial/income-certificate', {
    preHandler: [authMiddleware, requirePermission('financial:certificate')],
  }, async (request, reply) => {
    const parsed = incomeCertificateRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        data: null,
        errors: parsed.error.issues.map((i) => ({
          code: 'VALIDATION_ERROR',
          message: i.message,
          field: i.path.join('.'),
        })),
      });
    }

    try {
      const data = await financialCommandService.generateIncomeCertificate(
        request.user!.user_id,
        parsed.data.period_start,
        parsed.data.period_end,
      );
      return reply.status(201).send({ success: true, data, errors: [] });
    } catch (err) {
      if (err instanceof FinancialCommandError) {
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
   * GET /v1/financial/income-certificate/:id — Get a specific income certificate.
   */
  app.get('/v1/financial/income-certificate/:id', {
    preHandler: [authMiddleware, requirePermission('financial:certificate')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const data = await financialCommandService.getIncomeCertificate(id, request.user!.user_id);
      return reply.send({ success: true, data, errors: [] });
    } catch (err) {
      if (err instanceof FinancialCommandError) {
        return reply.status(err.statusCode).send({
          success: false,
          data: null,
          errors: [{ code: err.code, message: err.message }],
        });
      }
      throw err;
    }
  });

  // ─── Tax Summary ──────────────────────────────────────────

  /**
   * GET /v1/financial/tax-summary — Get tax summary with quarterly breakdown.
   */
  app.get('/v1/financial/tax-summary', {
    preHandler: [authMiddleware, requirePermission('financial:read_own')],
  }, async (request, reply) => {
    const parsed = taxSummaryQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        data: null,
        errors: parsed.error.issues.map((i) => ({
          code: 'VALIDATION_ERROR',
          message: i.message,
          field: i.path.join('.'),
        })),
      });
    }

    try {
      const data = await financialCommandService.getTaxSummary(
        request.user!.user_id,
        parsed.data.period_start,
        parsed.data.period_end,
      );
      return reply.send({ success: true, data, errors: [] });
    } catch (err) {
      if (err instanceof FinancialCommandError) {
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
