import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Request logger hook: logs method, url, status, and duration for every request.
 * Attach as onResponse hook.
 */
export function requestLogger(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  request.log.info({
    request_id: request.id,
    method: request.method,
    url: request.url,
    status: reply.statusCode,
    duration_ms: reply.elapsedTime,
    user_id: request.user?.user_id ?? null,
    ip: request.ip,
    user_agent: request.headers['user-agent'],
  });
  done();
}
