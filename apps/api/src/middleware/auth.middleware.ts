import type { FastifyRequest, FastifyReply } from 'fastify';
import { jwtService } from '../modules/auth/jwt.service.js';
import type { TokenPayload } from '../modules/auth/jwt.service.js';

// Extend Fastify request type to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: TokenPayload;
  }
}

/**
 * Authentication middleware: verifies JWT and attaches user to request
 */
export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({
      success: false,
      data: null,
      errors: [{ code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' }],
    });
  }

  const token = authHeader.slice(7);

  try {
    const payload = await jwtService.verifyAccessToken(token);
    request.user = payload;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid token';
    return reply.status(401).send({
      success: false,
      data: null,
      errors: [{ code: 'INVALID_TOKEN', message }],
    });
  }
}

/**
 * Optional auth: sets user if token present, but doesn't require it
 */
export async function optionalAuthMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return;

  try {
    const token = authHeader.slice(7);
    request.user = await jwtService.verifyAccessToken(token);
  } catch {
    // Silently ignore invalid tokens in optional auth
  }
}
