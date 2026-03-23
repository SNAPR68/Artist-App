import type { FastifyRequest, FastifyReply } from 'fastify';
import xss from 'xss';

const xssOptions = {
  whiteList: {}, // Strip ALL HTML tags
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
};

/**
 * Recursively sanitize all string values in an object.
 * Strips HTML tags and XSS vectors from user input.
 */
function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return xss(value, xssOptions);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }
  return value;
}

/**
 * Fastify preHandler hook that sanitizes request body, query, and params.
 * Strips HTML tags and XSS payloads from all string values.
 */
export async function sanitizeInput(request: FastifyRequest, _reply: FastifyReply) {
  if (request.body && typeof request.body === 'object') {
    request.body = sanitizeValue(request.body);
  }
  if (request.query && typeof request.query === 'object') {
    (request as any).query = sanitizeValue(request.query);
  }
  if (request.params && typeof request.params === 'object') {
    (request as any).params = sanitizeValue(request.params);
  }
}
