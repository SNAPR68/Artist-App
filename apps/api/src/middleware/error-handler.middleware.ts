import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';

/**
 * Global error handler for the Fastify app.
 * Maps known error types to appropriate HTTP responses.
 */
export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // Log the error
  request.log.error({
    err: error,
    request_id: request.id,
    method: request.method,
    url: request.url,
    user_id: request.user?.user_id,
  });

  // Zod validation errors
  if (error instanceof ZodError) {
    return reply.status(400).send({
      success: false,
      data: null,
      errors: error.errors.map((e) => ({
        code: 'VALIDATION_ERROR',
        message: e.message,
        field: e.path.join('.'),
      })),
    });
  }

  // Application-specific errors (OTPError, JWTError, AuthError, ArtistError, ClientError, MediaError, CalendarError, etc.)
  if ('code' in error && 'statusCode' in error && typeof (error as any).statusCode === 'number' && typeof (error as any).code === 'string') {
    const appError = error as Error & { code: string; statusCode: number };
    return reply.status(appError.statusCode).send({
      success: false,
      data: null,
      errors: [{ code: appError.code, message: appError.message }],
    });
  }

  // Fastify native errors (e.g., JSON parse errors, content-type issues)
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    const statusCode = error.statusCode;
    return reply.status(statusCode).send({
      success: false,
      data: null,
      errors: [{
        code: error.code ?? 'REQUEST_ERROR',
        message: statusCode < 500 ? error.message : 'An internal error occurred',
      }],
    });
  }

  // Unknown errors: 500
  return reply.status(500).send({
    success: false,
    data: null,
    errors: [{
      code: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    }],
  });
}
