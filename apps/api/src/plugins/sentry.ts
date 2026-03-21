import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

// Sentry is an optional dependency — loaded dynamically at runtime
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _sentry: any = null;

function getSentry(): any {
  if (_sentry) return _sentry;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    _sentry = require('@sentry/node');
  } catch {
    // @sentry/node not installed — all capture calls become no-ops
  }
  return _sentry;
}

/**
 * Fastify plugin to initialize Sentry error tracking and performance monitoring.
 * Captures unhandled exceptions, logs transactions, and tracks error context.
 * Note: @sentry/node is optional — plugin gracefully degrades if not installed.
 */
export const sentryPlugin = fp(
  async (fastify: FastifyInstance, options: Record<string, unknown>) => {
    const dsn = options.dsn as string | undefined;
    const environment = (options.environment as string | undefined) || 'development';
    const tracesSampleRate = (options.tracesSampleRate as number | undefined) || 1.0;
    const release = options.release as string | undefined;

    if (!dsn) {
      fastify.log.warn('Sentry DSN not provided, error tracking disabled');
      return;
    }

    const Sentry = getSentry();
    if (!Sentry) {
      fastify.log.warn('@sentry/node not installed, error tracking disabled');
      return;
    }

    try {
      Sentry.init({
        dsn,
        environment,
        tracesSampleRate,
        release,
      });

      // Capture request context for all requests
      fastify.addHook('onRequest', async (request: FastifyRequest) => {
        Sentry.setTag('request_id', request.id);
        Sentry.setContext('request', {
          method: request.method,
          url: request.url,
          ip: request.ip,
        });

        const reqWithUser = request as FastifyRequest & { user?: { user_id: string; phone: string } };
        if (reqWithUser.user) {
          Sentry.setUser({
            id: reqWithUser.user.user_id,
            username: reqWithUser.user.phone,
          });
        }
      });

      // Capture 5xx responses
      fastify.addHook(
        'onResponse',
        async (request: FastifyRequest, reply: FastifyReply) => {
          if (reply.statusCode >= 500) {
            Sentry.captureMessage(
              `Server error: ${request.method} ${request.url}`,
              'error',
            );
          }
        },
      );

      fastify.log.info('Sentry error tracking initialized');
    } catch (err) {
      fastify.log.warn(`Sentry initialization failed: ${String(err)}`);
    }
  },
  {
    name: 'sentry',
  },
);

export function captureException(error: Error, context?: Record<string, unknown>) {
  const Sentry = getSentry();
  if (!Sentry) return;
  if (context) {
    Sentry.setContext('additional', context);
  }
  Sentry.captureException(error);
}

export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' = 'error',
) {
  const Sentry = getSentry();
  if (!Sentry) return;
  Sentry.captureMessage(message, level);
}
