import type { FastifyRequest, FastifyReply } from 'fastify';
import { redis } from '../infrastructure/redis.js';
import { RATE_LIMITS } from '@artist-booking/shared';

type RateLimitTier = keyof typeof RATE_LIMITS;

/**
 * Redis sliding window rate limiter.
 *
 * Uses sorted sets for precise sliding window counting.
 * Key format: ratelimit:{tier}:{identifier}
 */
export function rateLimit(tier: RateLimitTier) {
  const { max, windowMs } = RATE_LIMITS[tier];
  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Use user_id if authenticated, otherwise IP
    const identifier = request.user?.user_id ?? request.ip;
    const key = `ratelimit:${String(tier)}:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Atomic sliding window using Redis pipeline
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart); // Remove expired entries
    pipeline.zadd(key, now.toString(), `${now}:${Math.random()}`); // Add current request
    pipeline.zcard(key); // Count requests in window
    pipeline.expire(key, windowSeconds); // Set TTL

    const results = await pipeline.exec();
    if (!results) {
      // Redis unreachable: return 429 (fail closed for security)
      return reply.status(429).send({
        success: false,
        data: null,
        errors: [{
          code: 'SERVICE_UNAVAILABLE',
          message: 'Rate limiting service temporarily unavailable',
        }],
      });
    }

    const requestCount = results[2]?.[1] as number;

    // Set rate limit headers
    reply.header('X-RateLimit-Limit', max);
    reply.header('X-RateLimit-Remaining', Math.max(0, max - requestCount));
    reply.header('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));

    if (requestCount > max) {
      reply.header('Retry-After', windowSeconds);
      return reply.status(429).send({
        success: false,
        data: null,
        errors: [{
          code: 'RATE_LIMITED',
          message: `Rate limit exceeded. Maximum ${max} requests per ${windowSeconds}s.`,
        }],
      });
    }
  };
}
