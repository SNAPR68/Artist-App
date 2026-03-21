import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * List of sensitive fields to redact from logs
 */
const SENSITIVE_FIELDS = ['phone', 'email', 'otp', 'password', 'token', 'secret', 'key'];

/**
 * Redact sensitive fields from an object
 */
function redactSensitiveData(obj: any, depth = 0): any {
  if (depth > 10 || obj === null) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item, depth + 1));
  }

  const redacted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some(field => lowerKey.includes(field));

    if (isSensitive) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value, depth + 1);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

/**
 * Request logger hook: logs method, url, status, and duration for every request.
 * Redacts sensitive fields (phone, email, otp, password) from request body and query parameters.
 * Attach as onResponse hook.
 */
export function requestLogger(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  const logData: any = {
    request_id: request.id,
    method: request.method,
    url: request.url,
    status: reply.statusCode,
    duration_ms: reply.elapsedTime,
    user_id: request.user?.user_id ?? null,
    ip: request.ip,
    user_agent: request.headers['user-agent'],
  };

  // Redact sensitive data from request body if present
  if (request.body && typeof request.body === 'object') {
    logData.body_preview = redactSensitiveData(request.body);
  }

  // Redact sensitive data from query parameters if present
  if (request.query && Object.keys(request.query).length > 0) {
    logData.query = redactSensitiveData(request.query);
  }

  request.log.info(logData);
  done();
}
