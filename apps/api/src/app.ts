import Fastify from 'fastify';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import * as Sentry from '@sentry/node';
import { config } from './config/index.js';
import { checkDatabaseHealth } from './infrastructure/database.js';
import { checkRedisHealth, redis } from './infrastructure/redis.js';
import { db } from './infrastructure/database.js';
import { errorHandler } from './middleware/error-handler.middleware.js';
import { requestLogger } from './middleware/request-logger.middleware.js';
import { sanitizeInput } from './middleware/sanitize.middleware.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { artistRoutes } from './modules/artist/artist.routes.js';
import { clientRoutes } from './modules/client/client.routes.js';
import { mediaRoutes } from './modules/media/media.routes.js';
import { calendarRoutes } from './modules/calendar/calendar.routes.js';
import { searchRoutes } from './modules/search/search.routes.js';
import { shortlistRoutes } from './modules/shortlist/shortlist.routes.js';
import { bookingRoutes } from './modules/booking/booking.routes.js';
import { paymentRoutes } from './modules/payment/payment.routes.js';
import { reviewRoutes } from './modules/review/review.routes.js';
import { notificationRoutes } from './modules/notification/notification.routes.js';
import { agentRoutes } from './modules/agent/agent.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { disputeRoutes } from './modules/dispute/dispute.routes.js';
import { conciergeRoutes } from './modules/concierge/concierge.routes.js';
import { coordinationRoutes } from './modules/coordination/coordination.routes.js';
import { eventDayRoutes } from './modules/event-day/event-day.routes.js';
import { analyticsRoutes } from './modules/analytics/analytics.routes.js';
import { eventContextRoutes } from './modules/event-context/event-context.routes.js';
import { venueRoutes } from './modules/venue/venue.routes.js';
import { riderRoutes } from './modules/rider/rider.routes.js';
import { pricingBrainRoutes } from './modules/pricing-brain/pricing-brain.routes.js';
import { whatsappRoutes } from './modules/whatsapp/whatsapp.routes.js';
import { workspaceRoutes } from './modules/workspace/workspace.routes.js';
import { recommendationRoutes } from './modules/recommendation/recommendation.routes.js';
import { artistIntelligenceRoutes } from './modules/artist-intelligence/artist-intelligence.routes.js';
import { dynamicPricingRoutes } from './modules/pricing-brain/dynamic-pricing.routes.js';
import { voiceQueryRoutes } from './modules/voice-query/voice-query.routes.js';
import { financialCommandRoutes } from './modules/financial-command/financial-command.routes.js';
import { seasonalDemandRoutes } from './modules/seasonal-demand/seasonal-demand.routes.js';
import { reputationDefenseRoutes } from './modules/reputation-defense/reputation-defense.routes.js';
import { emergencySubstitutionRoutes } from './modules/emergency-substitution/emergency-substitution.routes.js';
import { socialAnalyzerRoutes } from './modules/social-analyzer/social-analyzer.routes.js';
import { gigMarketplaceRoutes } from './modules/gig-marketplace/gig-marketplace.routes.js';
import { gamificationRoutes } from './modules/gamification/gamification.routes.js';
import { instabookInterestRoutes } from './modules/instabook-interest/instabook-interest.routes.js';
import { startCronJobs } from './infrastructure/cron.js';

const app = Fastify({
  logger: {
    level: config.LOG_LEVEL,
    transport:
      config.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
  genReqId: () => crypto.randomUUID(),
  bodyLimit: 1_048_576, // 1MB default limit for all routes
  // Trust proxy headers (X-Forwarded-For) when behind Render/Vercel/load balancer.
  // This ensures request.ip reflects the real client IP, not the proxy's.
  trustProxy: config.NODE_ENV === 'production',
} as any);

// ─── Plugins ─────────────────────────────────────────────────
await app.register(cors, {
  origin: config.NODE_ENV === 'production'
    ? [
        /\.vercel\.app$/,
        /\.onrender\.com$/,
        'https://artist-booking-api.onrender.com',
      ]
    : true,
  credentials: true,
});

await app.register(helmet, {
  contentSecurityPolicy: false, // API-only, no HTML
  strictTransportSecurity: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
});

await app.register(compress, { global: true });

// ─── API Documentation (Swagger) ────────────────────────────
await app.register(swagger, {
  openapi: {
    info: {
      title: 'Artist Booking Platform API',
      description: 'API for booking live entertainment artists for events',
      version: '1.0.0',
    },
    servers: [
      { url: 'https://artist-booking-api.onrender.com', description: 'Production' },
      { url: 'http://localhost:3000', description: 'Local Development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
});

await app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
  },
});

// ─── Sentry Error Tracking ──────────────────────────────────
if (config.SENTRY_DSN) {
  Sentry.init({
    dsn: config.SENTRY_DSN,
    environment: config.NODE_ENV,
    release: config.SENTRY_RELEASE ?? 'unknown',
    tracesSampleRate: config.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      // Scrub PII from error events
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      return event;
    },
  });
  app.log.info(`[SENTRY] Initialized for ${config.NODE_ENV}`);
}

// ─── Health Check ────────────────────────────────────────────
app.get('/health', async () => {
  const [dbResult, redisOk] = await Promise.all([checkDatabaseHealth(), checkRedisHealth()]);

  const status = dbResult.ok && redisOk ? 'ok' : 'degraded';

  return {
    status,
    timestamp: new Date().toISOString(),
    services: {
      database: dbResult.ok ? 'ok' : 'error',
      redis: redisOk ? 'ok' : 'error',
    },
    ...(dbResult.error && { dbError: dbResult.error }),
  };
});

// ─── API Version Root ────────────────────────────────────────
app.get('/v1', async () => {
  return {
    success: true,
    data: {
      name: 'Artist Booking Platform API',
      version: '1.0.0',
      environment: config.NODE_ENV,
    },
    errors: [],
  };
});

// ─── V1 Health Check ─────────────────────────────────────────
app.get('/v1/health', async () => {
  const startTime = process.uptime();
  const [dbResult, redisOk] = await Promise.all([checkDatabaseHealth(), checkRedisHealth()]);

  const status = dbResult.ok && redisOk ? 'ok' : 'degraded';

  return {
    success: status === 'ok',
    data: {
      status,
      uptime: startTime,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: dbResult.ok ? 'ok' : 'error',
        redis: redisOk ? 'ok' : 'error',
      },
    },
    errors: [
      ...(dbResult.error ? [{ code: 'DATABASE_ERROR', message: dbResult.error }] : []),
      ...(!redisOk ? [{ code: 'REDIS_ERROR', message: 'Redis connection failed' }] : []),
    ],
  };
});

// ─── Global Error Handler ────────────────────────────────────
app.setErrorHandler(async (error, request, reply) => {
  // Capture server errors in Sentry (skip 4xx client errors)
  const statusCode = (error as any).statusCode as number | undefined;
  if (!statusCode || statusCode >= 500) {
    Sentry.captureException(error, {
      extra: {
        url: request.url,
        method: request.method,
        requestId: request.id,
      },
    });
  }
  return (errorHandler as any)(error, request, reply);
});

// ─── Input Sanitization ─────────────────────────────────────
app.addHook('preHandler', sanitizeInput);

// ─── Request Logging ─────────────────────────────────────────
app.addHook('onResponse', requestLogger);

// ─── Routes ──────────────────────────────────────────────────
await app.register(authRoutes);
await app.register(artistRoutes);
await app.register(clientRoutes);
await app.register(mediaRoutes);
await app.register(calendarRoutes);
await app.register(searchRoutes);
await app.register(shortlistRoutes);
await app.register(bookingRoutes);
await app.register(paymentRoutes);
await app.register(reviewRoutes);
await app.register(notificationRoutes);
await app.register(agentRoutes);
await app.register(adminRoutes);
await app.register(disputeRoutes);
await app.register(conciergeRoutes);
await app.register(coordinationRoutes);
await app.register(eventDayRoutes);
await app.register(analyticsRoutes);
await app.register(eventContextRoutes);
await app.register(venueRoutes);
await app.register(riderRoutes);
await app.register(pricingBrainRoutes);
await app.register(whatsappRoutes);
await app.register(workspaceRoutes);
await app.register(recommendationRoutes);
await app.register(artistIntelligenceRoutes);
await app.register(dynamicPricingRoutes);
await app.register(voiceQueryRoutes);
await app.register(financialCommandRoutes);
await app.register(seasonalDemandRoutes);
await app.register(reputationDefenseRoutes);
await app.register(emergencySubstitutionRoutes);
await app.register(socialAnalyzerRoutes);
await app.register(gigMarketplaceRoutes);
await app.register(gamificationRoutes);
await app.register(instabookInterestRoutes);

// ─── Graceful Shutdown ───────────────────────────────────────
async function shutdown(signal: string) {
  app.log.info(`Received ${signal}, shutting down gracefully...`);
  await Sentry.flush(2000).catch(() => {}); // Flush pending Sentry events
  await app.close();
  await db.destroy();
  redis.disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ─── Start Server ────────────────────────────────────────────
try {
  await redis.connect();
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
  app.log.info(`Server running at http://0.0.0.0:${config.PORT}`);
  startCronJobs();
} catch (err) {
  app.log.fatal(err);
  process.exit(1);
}

export { app };
