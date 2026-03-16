import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { config } from './config/index.js';
import { checkDatabaseHealth } from './infrastructure/database.js';
import { checkRedisHealth, redis } from './infrastructure/redis.js';
import { db } from './infrastructure/database.js';
import { errorHandler } from './middleware/error-handler.middleware.js';
import { requestLogger } from './middleware/request-logger.middleware.js';
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
import { adminRoutes } from './modules/admin/admin.routes.js';

const app = Fastify({
  logger: {
    level: config.LOG_LEVEL,
    transport:
      config.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
  genReqId: () => crypto.randomUUID(),
} as any);

// ─── Plugins ─────────────────────────────────────────────────
await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(helmet, {
  contentSecurityPolicy: false, // API-only, no HTML
});

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

// ─── Global Error Handler ────────────────────────────────────
app.setErrorHandler(errorHandler as any);

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
await app.register(adminRoutes);

// ─── Graceful Shutdown ───────────────────────────────────────
async function shutdown(signal: string) {
  app.log.info(`Received ${signal}, shutting down gracefully...`);
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
} catch (err) {
  app.log.fatal(err);
  process.exit(1);
}

export { app };
