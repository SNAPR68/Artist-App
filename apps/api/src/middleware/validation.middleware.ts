import type { FastifyRequest, FastifyReply } from 'fastify';
import { ZodError, type ZodSchema } from 'zod';

/**
 * Create a validation middleware for request body using a Zod schema.
 *
 * Usage: `{ preHandler: [validateBody(createBookingSchema)] }`
 */
export function validateBody(schema: ZodSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.body = schema.parse(request.body);
    } catch (error) {
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
      throw error;
    }
  };
}

/**
 * Create a validation middleware for query parameters using a Zod schema.
 */
export function validateQuery(schema: ZodSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.query = schema.parse(request.query);
    } catch (error) {
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
      throw error;
    }
  };
}

/**
 * Create a validation middleware for URL parameters.
 */
export function validateParams(schema: ZodSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.params = schema.parse(request.params);
    } catch (error) {
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
      throw error;
    }
  };
}
